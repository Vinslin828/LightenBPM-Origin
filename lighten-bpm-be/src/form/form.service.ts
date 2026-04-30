import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { generatePublicId } from '../common/utils/id-generator';
import { Prisma } from '@prisma/client';
import {
  Form,
  FormOptions,
  RevisionState,
  PermissionAction,
  GranteeType,
} from '../common/types/common.types';
import { CreateFormDto } from './dto/create-form.dto';
import {
  CreateFormResponseDto,
  toCreateFormResponseDto,
} from './dto/create-form-response.dto';
import { ListFormRespDto } from './dto/list-form-resp.dto';
import { FormDto, toFormDto } from './dto/form.dto';
import { UpdateFormRevisionDto } from './dto/update-form-version.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { TagDto } from '../tag/dto/tag.dto';
import {
  FormOptionsDto,
  FormRevisionDto,
  toFormRevisionDto,
} from './dto/form-revision.dto';
import { CreateFormRevisionDto } from './dto/create-form-revision.dto';
import {
  FormRevisionWithTagsDto,
  toFormRevisionWithTagsDto,
} from './dto/form-revision-with-tags.dto';
import { ListFormsQueryDto } from './dto/list-forms-query.dto';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGINATION_LIMIT,
} from '../common/dto/pagination.dto';
import {
  FormRepository,
  FormPermissionWithRelations,
} from './repositories/form.repository';
import { TransactionService } from '../prisma/transaction.service';
import {
  FormSchema,
  FormValidation,
  ValidationError,
} from '../flow-engine/types';
import { FormSchemaResolverService } from '../flow-engine/expression-engine';
import { FormExpressionValidatorService } from '../flow-engine/validation/form-expression/form-expression-validator.service';
import { ResolvedFormDto } from './dto/resolved-form.dto';
import { PermissionBuilderService } from '../common/permission/permission-builder.service';
import { AuthUser, isAdminUser } from '../auth/types/auth-user';
import {
  AggregatedFormPermissionDto,
  AggregatedPermissionActionDto,
} from './dto/form-permission.dto';
import { aggregatePermissions } from '../common/utils/permission-utils';
import { FormWorkflowBindingRepository } from '../form-workflow-binding/repositories/form-workflow-binding.repository';
import {
  ApplicantSource,
  FlowDefinition,
  NodeType,
  StartNode,
} from '../flow-engine/types';
import {
  resolveComponentRules,
  applyComponentRules,
  VIEWER_ROLE,
} from '../instance/utils/component-rule-filter';

@Injectable()
export class FormService {
  private readonly logger = new Logger(FormService.name);

  constructor(
    private formRepository: FormRepository,
    private transactionService: TransactionService,
    private readonly formSchemaResolverService: FormSchemaResolverService,
    private readonly permissionBuilder: PermissionBuilderService,
    private readonly formExpressionValidatorService: FormExpressionValidatorService,
    private readonly bindingRepository: FormWorkflowBindingRepository,
  ) {}

  async listForms(
    user: AuthUser,
    query?: ListFormsQueryDto,
  ): Promise<{ items: ListFormRespDto[]; total: number }> {
    this.logger.debug(`listForms: userId = ${user.id}`);

    const page = query?.page || DEFAULT_PAGE;
    const limit = query?.limit || DEFAULT_PAGINATION_LIMIT;
    const skip = (page - 1) * limit;

    const visibilityWhere = this.permissionBuilder.getFormVisibilityWhere(user);

    const { items: activeForms, total } = await this.formRepository.findAll({
      skip,
      take: limit,
      name: query?.name,
      tagIds: query?.tagIds,
      sortOrder: query?.sortOrder,
      visibilityWhere,
    });

    const items = activeForms.map((form) => {
      const rev = form.form_revisions[0];
      const resp = new ListFormRespDto();
      resp.form_id = form.public_id;
      resp.form_revision_id = rev ? rev.public_id : 'undefined';
      resp.name = rev ? rev.name : '';
      resp.form_description = (rev ? rev.description : undefined) ?? undefined;
      resp.tags = form.form_tag.map((ft) => TagDto.fromPrisma(ft.tag));
      resp.is_active = form.is_active;
      resp.created_at = form.created_at;
      return resp;
    });

    return { items, total };
  }

  async listFormRevisions(form_id: string): Promise<FormRevisionDto[]> {
    const form = await this.formRepository.findByPublicId(form_id);

    if (!form) {
      throw new NotFoundException(`Form with public_id ${form_id} not found`);
    }

    const formRevisions = await this.formRepository.findRevisionsByFormId(
      form.id,
    );

    if (!formRevisions || formRevisions.length === 0) {
      throw new NotFoundException(
        `No active revision found for form with public_id ${form_id}`,
      );
    }

    return formRevisions.map((rev) => {
      return toFormRevisionDto(
        form.public_id,
        rev,
        rev.options as FormOptionsDto,
      );
    });
  }

  async getFormRevision(id: string): Promise<FormRevisionWithTagsDto> {
    const formRevision = await this.formRepository.findRevisionByPublicId(id);

    if (!formRevision) {
      throw new NotFoundException(`Form revision with id ${id} not found`);
    }
    const tagList: TagDto[] = formRevision.form.form_tag.map((formTag) =>
      TagDto.fromPrisma(formTag.tag),
    );

    return toFormRevisionWithTagsDto(
      formRevision.form.public_id,
      formRevision,
      formRevision.options as FormOptions,
      tagList,
    );
  }

  async deleteFormRevision(id: string) {
    await this.formRepository.deleteRevision(id);
  }

  async createForm(
    createFormDto: CreateFormDto,
    user: AuthUser,
  ): Promise<CreateFormResponseDto> {
    const {
      form_schema,
      validation,
      tags,
      is_template,
      name,
      description,
      permissions,
    } = createFormDto;

    const formPermissions =
      permissions && permissions.length > 0
        ? permissions
        : [
            {
              grantee_type: GranteeType.EVERYONE,
              grantee_value: '',
              action: PermissionAction.VIEW,
            },
            {
              grantee_type: GranteeType.EVERYONE,
              grantee_value: '',
              action: PermissionAction.USE,
            },
          ];

    const form = await this.formRepository.create({
      public_id: generatePublicId(),
      name,
      description,
      is_template: is_template,
      is_active: true,
      created_by: user.id,
      updated_by: user.id,
      permissions: formPermissions,
      form_revisions: {
        create: {
          public_id: generatePublicId(),
          name,
          description,
          form_schema: form_schema,
          fe_validation: validation,
          version: 1,
          created_by: user.id,
          updated_by: user.id,
          options: {
            create: {
              can_withdraw: true,
              can_copy: true,
              can_draft: true,
              can_delegate: false,
            },
          },
        },
      },
      form_tag: {
        create: tags?.map((tagId) => ({
          tag: { connect: { id: tagId } },
        })),
      },
    });

    if (!form || !form.form_revisions || form.form_revisions.length === 0) {
      throw new Error('Form creation failed or no form_revisions returned');
    }

    return toCreateFormResponseDto(form);
  }

  async getForm(form_id: string): Promise<FormDto> {
    const form = await this.formRepository.findByPublicId(form_id);

    if (!form) {
      throw new NotFoundException(`Form with id: ${form_id} not found`);
    }

    if (form.form_revisions?.length > 0) {
      return toFormDto(
        form,
        form.form_revisions[0],
        form.form_revisions[0].options as FormOptions,
        form.form_tag.map((ft) => TagDto.fromPrisma(ft.tag)),
      );
      // return this.toFormRevisionDto(form.form_revisions[0], form);
    }

    throw new NotFoundException(
      `No active version found for form with id: ${form_id}`,
    );
  }

  /**
   * Get form with resolved reference values for new application
   *
   * Resolves isReference attributes (defaultValue, placeholder, label) in form_schema
   * by executing the reference expressions for the current user
   *
   * @param formId - Form public_id
   * @param applicantId - Current user's ID (for getApplicantProfile)
   * @returns Form with resolved form_schema
   */
  async getResolvedForm(
    formId: string,
    applicantId: number,
  ): Promise<ResolvedFormDto> {
    const form = await this.formRepository.findByPublicId(formId);

    if (!form) {
      throw new NotFoundException(`Form with id: ${formId} not found`);
    }

    const revision = form.form_revisions?.[0];
    if (!revision) {
      throw new NotFoundException(
        `No active version found for form with id: ${formId}`,
      );
    }

    // Build execution context for new application
    // formData is empty since this is a new application
    // workflowInstanceId is undefined since no instance exists yet
    const resolvedSchema =
      await this.formSchemaResolverService.resolveFormSchema(
        revision.form_schema as unknown as FormSchema,
        {
          formData: {},
          applicantId,
          workflowInstanceId: undefined,
        },
      );

    // Apply start node component rules (hide + editable + disable)
    const { filteredSchema, applicantSource } = await this.applyStartNodeRules(
      formId,
      resolvedSchema,
    );

    return ResolvedFormDto.fromPrisma(
      form,
      revision,
      filteredSchema,
      applicantSource,
    );
  }

  /**
   * Look up bound workflow from form, extract start node component_rules,
   * and apply hide/editable/disable to the form schema.
   */
  private async applyStartNodeRules(
    formPublicId: string,
    formSchema: FormSchema,
  ): Promise<{
    filteredSchema: FormSchema;
    applicantSource?: ApplicantSource;
  }> {
    const result =
      await this.bindingRepository.findWorkflowWithRevisionByFormPublicId(
        formPublicId,
      );
    if (!result) return { filteredSchema: formSchema };

    const flowDefinition = result.revision
      .flow_definition as unknown as FlowDefinition;
    if (!flowDefinition) return { filteredSchema: formSchema };

    const rules = resolveComponentRules(
      flowDefinition,
      VIEWER_ROLE.APPLICANT_DRAFT,
    );

    const { filteredSchema } = applyComponentRules(
      formSchema,
      {},
      rules.hiddenNames,
      rules.editableNames,
      rules.disableNames,
      rules.requiredNames,
    );

    const startNode = flowDefinition.nodes.find(
      (n): n is StartNode => n.type === NodeType.START,
    );

    return {
      filteredSchema,
      applicantSource: startNode?.applicant_source,
    };
  }

  async updateForm(
    form_id: string,
    data: UpdateFormDto,
    user: AuthUser,
  ): Promise<Form> {
    const { tags, is_active } = data;

    return this.transactionService.runTransaction(async (tx) => {
      const form = await this.formRepository.findByPublicId(form_id, tx);
      if (!form) {
        throw new NotFoundException(`Form with id ${form_id} not found`);
      }

      if (
        !this.permissionBuilder.canPerformAction(
          user,
          PermissionAction.MANAGE,
          form.permissions,
          form.created_by,
        )
      ) {
        throw new ForbiddenException(
          'You do not have permission to update this form',
        );
      }

      if (tags) {
        await this.formRepository.updateTags(form.id, tags, tx);
      }

      return this.formRepository.update(
        form_id,
        {
          is_active: is_active,
        },
        tx,
      );
    });
  }

  async createFormRevision(
    form_id: string,
    data: CreateFormRevisionDto,
    user: AuthUser,
  ): Promise<FormRevisionDto> {
    const { name, description, form_schema, validation, status, tags } = data;

    const form = await this.formRepository.findByPublicId(form_id);
    if (!form) {
      throw new NotFoundException(`Form with id: ${form_id} not found`);
    }

    if (
      !this.permissionBuilder.canPerformAction(
        user,
        PermissionAction.MANAGE,
        form.permissions,
        form.created_by,
      )
    ) {
      throw new ForbiddenException(
        'You do not have permission to create revisions for this form',
      );
    }

    await this.validateFormRevision(data);

    return this.transactionService.runTransaction(async (tx) => {
      const latest = await this.formRepository.findLatestRevision(form.id, tx);

      if (!latest) {
        throw new NotFoundException(`Form version not found`);
      }

      const rev = await this.formRepository.createRevision(
        {
          public_id: generatePublicId(),
          form_id: form.id,
          name: name ?? latest.name,
          description: description ?? latest.description,
          form_schema:
            (form_schema as Prisma.InputJsonValue) ?? latest.form_schema,
          fe_validation:
            (validation as Prisma.InputJsonValue) ?? latest.fe_validation,
          version: latest.version + 1,
          state: status ?? RevisionState.DRAFT,
          options: {
            create: {
              can_withdraw: latest.options?.can_withdraw,
              can_copy: latest.options?.can_copy,
              can_draft: latest.options?.can_draft,
              can_delegate: latest.options?.can_delegate,
            },
          },
          created_by: user.id,
          updated_by: user.id,
        },
        tx,
      );

      if (tags) {
        await this.formRepository.updateTags(form.id, tags, tx);
      }

      await this.archiveActiveRevisions(form.id, rev.id, tx);

      return toFormRevisionDto(
        form.public_id,
        rev,
        rev.options as FormOptionsDto,
      );
    });
  }

  async updateFormRevision(
    version_id: string,
    data: UpdateFormRevisionDto,
    user: AuthUser,
  ): Promise<FormRevisionDto> {
    const formRevision =
      await this.formRepository.findRevisionByPublicId(version_id);

    if (!formRevision) {
      throw new NotFoundException(
        `Form version with public_id ${version_id} not found`,
      );
    }

    if (
      !this.permissionBuilder.canPerformAction(
        user,
        PermissionAction.MANAGE,
        formRevision.form.permissions,
        formRevision.form.created_by,
      )
    ) {
      throw new ForbiddenException(
        'You do not have permission to update revisions for this form',
      );
    }

    if (formRevision.state !== RevisionState.DRAFT) {
      throw new BadRequestException(
        `Only form revision with status DRAFT can be updated. Current status: ${formRevision.state}`,
      );
    }

    await this.validateFormRevision(data);

    const updatedFormRevision = await this.transactionService.runTransaction(
      async (tx) => {
        if (data.status === RevisionState.ACTIVE) {
          await this.archiveActiveRevisions(
            formRevision.form_id,
            formRevision.id,
            tx,
          );
        }

        return this.formRepository.updateRevision(
          version_id,
          {
            name: data.name ?? formRevision.name,
            description: data.description ?? formRevision.description,
            state: data.status ?? formRevision.state,
            effective_date: data.effective_date ?? formRevision.effective_date,
            retired_date: data.retired_date ?? formRevision.retired_date,
            options: data.options
              ? {
                  update: {
                    can_withdraw:
                      data.options.can_withdraw ??
                      (formRevision.options as FormOptions).can_withdraw,
                    can_copy:
                      data.options.can_copy ??
                      (formRevision.options as FormOptions).can_copy,
                    can_draft:
                      data.options.can_draft ??
                      (formRevision.options as FormOptions).can_draft,
                    can_delegate:
                      data.options.can_delegate ??
                      (formRevision.options as FormOptions).can_delegate,
                  },
                }
              : undefined,
            form_schema: data.form_schema as Prisma.InputJsonValue | undefined,
            fe_validation:
              data.validation !== undefined
                ? (data.validation as Prisma.InputJsonValue)
                : ((formRevision.fe_validation as Prisma.InputJsonValue) ??
                  null),
          },
          tx,
        );
      },
    );

    return toFormRevisionDto(
      formRevision.form.public_id,
      updatedFormRevision,
      updatedFormRevision.options as FormOptions,
    );
  }

  async archiveActiveRevisions(
    form_id: number,
    exclude_rev_id: number,
    tx: Prisma.TransactionClient,
  ) {
    await this.formRepository.archiveActiveRevisions(
      form_id,
      exclude_rev_id,
      tx,
    );
  }

  async softDeleteForm(public_id: string, user: AuthUser): Promise<Form> {
    this.logger.log(`softDeleteForm: ${public_id}`);
    const form = await this.formRepository.findByPublicId(public_id);
    if (!form) {
      throw new NotFoundException(`Form with id ${public_id} not found`);
    }

    if (
      !this.permissionBuilder.canPerformAction(
        user,
        PermissionAction.MANAGE,
        form.permissions,
        form.created_by,
      )
    ) {
      throw new ForbiddenException(
        'You do not have permission to delete this form',
      );
    }

    return await this.formRepository.softDelete(public_id);
  }

  async deleteForm(public_id: string, user: AuthUser): Promise<Form | null> {
    this.logger.log(`deleteForm: ${public_id}`);
    const form = await this.formRepository.findByPublicId(public_id);
    if (!form) {
      throw new NotFoundException(`Form with id ${public_id} not found`);
    }

    if (
      !this.permissionBuilder.canPerformAction(
        user,
        PermissionAction.MANAGE,
        form.permissions,
        form.created_by,
      )
    ) {
      throw new ForbiddenException(
        'You do not have permission to delete this form',
      );
    }

    return await this.formRepository.delete(public_id);
  }

  async findActiveFormSchema(formId: number): Promise<FormSchema | null> {
    return this.formRepository.findActiveFormSchema(formId);
  }

  async listFormPermissions(
    formPublicId: string,
    user?: AuthUser,
  ): Promise<AggregatedFormPermissionDto[]> {
    const form = await this.formRepository.findByPublicId(formPublicId);
    if (!form) {
      throw new NotFoundException(`Form with id ${formPublicId} not found`);
    }

    if (
      user &&
      !this.permissionBuilder.canPerformAction(
        user,
        PermissionAction.MANAGE,
        form.permissions,
        form.created_by,
      )
    ) {
      throw new ForbiddenException(
        'You do not have permission to view permissions for this form',
      );
    }

    const permissions = await this.formRepository.findPermissionsByFormId(
      form.id,
    );
    return aggregatePermissions<
      Prisma.FormPermissionGetPayload<object>,
      AggregatedPermissionActionDto,
      AggregatedFormPermissionDto
    >(permissions, 'form_id', form.id, (p) => ({
      id: p.id,
      action: p.action,
    }));
  }

  async addFormPermissions(
    formPublicId: string,
    data: Prisma.FormPermissionCreateWithoutFormInput[],
    user?: AuthUser,
  ): Promise<Prisma.FormPermissionGetPayload<any>[]> {
    const form = await this.formRepository.findByPublicId(formPublicId);
    if (!form) {
      throw new NotFoundException(`Form with id ${formPublicId} not found`);
    }

    if (
      user &&
      !this.permissionBuilder.canPerformAction(
        user,
        PermissionAction.MANAGE,
        form.permissions,
        form.created_by,
      )
    ) {
      throw new ForbiddenException(
        'You do not have permission to manage permissions for this form',
      );
    }

    return this.formRepository.createPermissions(form.id, data);
  }

  async setFormPermissions(
    formPublicId: string,
    data: Prisma.FormPermissionCreateWithoutFormInput[],
    user?: AuthUser,
  ): Promise<Prisma.FormPermissionGetPayload<any>[]> {
    const form = await this.formRepository.findByPublicId(formPublicId);
    if (!form) {
      throw new NotFoundException(`Form with id ${formPublicId} not found`);
    }

    if (
      user &&
      !this.permissionBuilder.canPerformAction(
        user,
        PermissionAction.MANAGE,
        form.permissions,
        form.created_by,
      )
    ) {
      throw new ForbiddenException(
        'You do not have permission to manage permissions for this form',
      );
    }

    return this.formRepository.setPermissions(form.id, data);
  }

  async deleteFormPermission(
    permissionId: number,
    user?: AuthUser,
  ): Promise<void> {
    if (user && !isAdminUser(user)) {
      const permission: FormPermissionWithRelations | null =
        await this.formRepository.findPermissionById(permissionId);

      if (permission) {
        if (
          !this.permissionBuilder.canPerformAction(
            user,
            PermissionAction.MANAGE,
            permission.form.permissions,
            permission.form.created_by,
          )
        ) {
          throw new ForbiddenException(
            'You do not have permission to delete permissions for this form',
          );
        }
      }
    }

    await this.formRepository.deletePermission(permissionId);
  }

  async deleteFormPermissionsByQuery(
    formPublicId: string,
    query: {
      grantee_type?: string;
      grantee_value?: string;
      action?: string;
    },
    user?: AuthUser,
  ): Promise<Prisma.BatchPayload> {
    const form = await this.formRepository.findByPublicId(formPublicId);
    if (!form) {
      throw new NotFoundException(`Form with id ${formPublicId} not found`);
    }

    if (
      user &&
      !this.permissionBuilder.canPerformAction(
        user,
        PermissionAction.MANAGE,
        form.permissions,
        form.created_by,
      )
    ) {
      throw new ForbiddenException(
        'You do not have permission to manage permissions for this form',
      );
    }

    return this.formRepository.deletePermissionsByQuery(form.id, query);
  }

  private async validateFormRevision(
    data: CreateFormRevisionDto | UpdateFormRevisionDto,
  ): Promise<void> {
    const { form_schema, validation } = data;

    const result =
      await this.formExpressionValidatorService.validateFormExpressions(
        form_schema as FormSchema | null | undefined,
        validation as FormValidation | null | undefined,
      );

    if (!result.isValid) {
      this.logger.warn(
        `Invalid validation expression: ${JSON.stringify(result)}`,
      );
      throw new ValidationError('Invalid validation expression', result.errors);
    }
  }
}
