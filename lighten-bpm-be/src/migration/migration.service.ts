import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  FormRepository,
  FormWithRelations,
} from '../form/repositories/form.repository';
import { AssignType } from '../common/types/common.types';
import { INDEFINITE_MEMBERSHIP_END_DATE } from '../common/constants';
import { TagRepository } from '../tag/repositories/tag.repository';
import { ValidationRegistryRepository } from '../validation-registry/repositories/validation-registry.repository';
import { ValidationComponentMappingRepository } from '../validation-registry/repositories/validation-component-mapping.repository';
import { WorkflowRepository } from '../workflow/repositories/workflow.repository';
import { UserRepository } from '../user/repository/user.repository';
import { OrgUnitRepository } from '../org-unit/repository/org-unit.repository';
import { FormWorkflowBindingRepository } from '../form-workflow-binding/repositories/form-workflow-binding.repository';
import { WorkflowOptionsRepository } from '../workflow/repositories/workflow-options.repository';
import { Node } from '../flow-engine/types/node.types';
import {
  ExportContainer,
  ExportType,
  FormExportPayload,
  WorkflowExportPayload,
  ImportCheckResponse,
  ImportStatus,
  ImportSeverity,
  ImportAction,
  ImportExecuteResponse,
} from './types/migration.types';
import {
  FormSchema,
  FlowDefinition,
  ApproverType,
  NodeType,
  ApproverConfig,
} from '../flow-engine/types';
import { FlowDefinitionTransformer } from './flow-definition-transformer';
import {
  GranteeType,
  PermissionAction,
  Prisma,
  ValidationType,
} from '@prisma/client';
import { RevisionState } from '../common/types/common.types';
import { generatePublicId } from '../common/utils/id-generator';
import { FormTagDetail, WorkflowTagDetail } from 'src/form/types';
import { OrgUnitWithRelations } from 'src/org-unit/types';
import { BulkImportDto } from './dto/bulk-import.dto';
import { PrismaTransactionClient } from '../prisma/transaction-client.type';

@Injectable()
export class MigrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly formRepository: FormRepository,
    private readonly tagRepository: TagRepository,
    private readonly validationRegistryRepository: ValidationRegistryRepository,
    private readonly validationComponentMappingRepository: ValidationComponentMappingRepository,
    private readonly workflowRepository: WorkflowRepository,
    private readonly workflowOptionsRepository: WorkflowOptionsRepository,
    private readonly userRepository: UserRepository,
    private readonly orgUnitRepository: OrgUnitRepository,
    private readonly bindingRepository: FormWorkflowBindingRepository,
  ) {}

  async bulkImport(dto: BulkImportDto, creatorId: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // 1. Import OrgUnits
      const orgUnitMap = new Map<string, number>();
      for (let i = 0; i < dto.orgUnits.length; i++) {
        const item = dto.orgUnits[i];
        try {
          // Check if already exists (including deleted ones for potential restoration/update)
          let orgUnit = await tx.orgUnit.findUnique({
            where: { code: item.code },
          });

          if (item.isDeleted) {
            if (orgUnit && !orgUnit.deleted_at) {
              await this.orgUnitRepository.deleteOrgUnit(orgUnit.id, tx);
            }
            continue;
          }

          if (!orgUnit) {
            orgUnit = await this.orgUnitRepository.createOrgUnit(
              {
                code: item.code,
                name: item.name,
                type: item.type,
                parentCode: item.parentCode,
              },
              creatorId,
              tx,
            );
          } else {
            // Update existing (and restore if it was deleted)
            orgUnit = await this.orgUnitRepository.updateOrgUnit(
              orgUnit.id,
              {
                code: item.code,
                name: item.name,
                type: item.type,
                parentCode: item.parentCode,
              },
              tx,
            );
            // Explicitly restore if it was soft-deleted
            if (orgUnit.deleted_at) {
              await tx.orgUnit.update({
                where: { id: orgUnit.id },
                data: { deleted_at: null },
              });
            }
          }
          orgUnitMap.set(item.code, orgUnit.id);
        } catch (e) {
          throw new BadRequestException(
            `Failed at OrgUnit index ${i} (${item.code}): ${
              e instanceof Error ? e.message : String(e)
            }`,
          );
        }
      }

      // 2. Import Users
      const userMap = new Map<string, number>();
      for (let i = 0; i < dto.users.length; i++) {
        const item = dto.users[i];
        try {
          let user = await tx.user.findUnique({ where: { code: item.code } });

          if (item.isDeleted) {
            if (user && !user.deleted_at) {
              await this.userRepository.delete(user.id, tx);
            }
            continue;
          }

          if (!user) {
            user = await this.userRepository.createUser(
              {
                code: item.code,
                name: item.name,
                sub: item.sub || null,
                email: item.email || null,
                job_grade: item.jobGrade,
              },
              tx,
            );
          } else {
            // Update existing user
            user = await this.userRepository.updateUser(
              user.id,
              {
                name: item.name,
                email: item.email || null,
                job_grade: item.jobGrade,
              },
              tx,
            );
            // Restore if soft-deleted
            if (user.deleted_at) {
              await tx.user.update({
                where: { id: user.id },
                data: { deleted_at: null },
              });
            }
          }

          userMap.set(item.code, user.id);
        } catch (e) {
          throw new BadRequestException(
            `Failed at User index ${i} (${item.code}): ${
              e instanceof Error ? e.message : String(e)
            }`,
          );
        }
      }

      // 3. Import OrgMemberships (delta: remote is source of truth, cookie-cutter conflict resolution)
      for (let i = 0; i < dto.memberships.length; i++) {
        const item = dto.memberships[i];
        try {
          // Resolve User ID
          let userId = userMap.get(item.userCode);
          if (!userId) {
            const dbUser = await tx.user.findUnique({
              where: { code: item.userCode },
            });
            if (!dbUser) {
              throw new Error(`User ${item.userCode} not found`);
            }
            userId = dbUser.id;
          }

          // Resolve OrgUnit ID
          let orgUnitId = orgUnitMap.get(item.orgUnitCode);
          if (!orgUnitId) {
            const dbOrgUnit = await tx.orgUnit.findUnique({
              where: { code: item.orgUnitCode },
            });
            if (!dbOrgUnit) {
              throw new Error(`OrgUnit ${item.orgUnitCode} not found`);
            }
            orgUnitId = dbOrgUnit.id;
          }

          const startDate = new Date(item.startDate);

          // isDeleted is deprecated and will be removed in a future import version.
          // Only close an active membership; ignore the flag on historical records.
          if (item.isDeleted) {
            const existing =
              await this.orgUnitRepository.findOrgMembershipByStart(
                orgUnitId,
                userId,
                startDate,
                tx,
              );
            if (existing && existing.end_date > new Date()) {
              await this.orgUnitRepository.updateOrgMembership(
                existing.id,
                { endDate: new Date() },
                tx,
              );
            }
            continue;
          }

          const endDate = new Date(item.endDate);

          // Cookie-cutter conflict resolution: remote is source of truth.
          // For each local record overlapping the incoming range, truncate,
          // adjust, or delete it before inserting the remote record.
          const overlaps =
            await this.orgUnitRepository.findAllOverlappingMemberships(
              userId,
              orgUnitId,
              startDate,
              endDate,
              tx,
            );

          for (const L of overlaps) {
            if (startDate <= L.start_date) {
              if (endDate >= L.end_date) {
                // R swallows L entirely: delete
                await this.orgUnitRepository.hardDeleteOrgMembership(L.id, tx);
              } else {
                // R clips L's head: push L's startDate forward to R's endDate
                await this.orgUnitRepository.updateOrgMembership(
                  L.id,
                  { startDate: endDate },
                  tx,
                );
              }
            } else {
              // L.startDate < R.startDate: R clips L's tail OR L contains R
              // Either way: truncate L's endDate to R's startDate (drop any tail)
              await this.orgUnitRepository.updateOrgMembership(
                L.id,
                { endDate: startDate },
                tx,
              );
            }
          }

          await this.orgUnitRepository.createOrgMembership(
            {
              orgUnitCode: item.orgUnitCode,
              userId,
              assignType: item.assignType,
              isIndefinite: false,
              startDate,
              endDate,
              note: item.note,
            },
            creatorId,
            tx,
          );
        } catch (e) {
          throw new BadRequestException(
            `Failed at OrgMembership index ${i} (User: ${item.userCode}, Org: ${item.orgUnitCode}): ${
              e instanceof Error ? e.message : String(e)
            }`,
          );
        }
      }

      // 4. Sync Default Org Preferences (MUST be after memberships are created)
      for (let i = 0; i < dto.users.length; i++) {
        const item = dto.users[i];
        if (item.defaultOrgCode) {
          const userId = userMap.get(item.code);
          if (userId) {
            const orgUnit = await tx.orgUnit.findUnique({
              where: { code: item.defaultOrgCode },
            });
            if (!orgUnit || orgUnit.deleted_at) {
              throw new BadRequestException(
                `Default org '${item.defaultOrgCode}' for user '${item.code}' not found or is deleted`,
              );
            }
            await this.syncUserDefaultOrgPreference(
              userId,
              orgUnit.id,
              creatorId,
              tx,
            );
          }
        }
      }
    });
  }

  async exportForm(
    publicId: string,
    userId: number,
  ): Promise<ExportContainer<FormExportPayload>> {
    const user = await this.userRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const form = await this.formRepository.findByPublicId(publicId);
    if (!form) {
      throw new NotFoundException(`Form ${publicId} not found`);
    }

    return {
      protocol_version: '1.0',
      exported_at: new Date().toISOString(),
      exported_by: user.code,
      type: ExportType.FORM,
      payload: await this.buildFormPayload(form),
    };
  }

  private async buildFormPayload(
    form: FormWithRelations,
  ): Promise<FormExportPayload> {
    const latestRevision = form.form_revisions[0];
    if (!latestRevision) {
      throw new NotFoundException(`Form ${form.public_id} has no revisions`);
    }

    const tags = form.form_tag.map((ft: FormTagDetail) => ({
      name: ft.tag.name,
      description: ft.tag.description,
      color: ft.tag.color,
    }));

    const formSchema = latestRevision.form_schema as unknown as FormSchema;

    // Collect only validations actually referenced by form fields
    const referencedValidatorIds = new Set<string>();
    if (formSchema && formSchema.entities) {
      Object.values(formSchema.entities).forEach((entity) => {
        // Handle flat validatorId format: { validator: { validatorId: "..." } }
        // FieldValidator type does not declare validatorId (schema extension), so cast is required.
        const flatValidatorId = (
          entity.attributes?.validator as Record<string, unknown> | undefined
        )?.validatorId as string | undefined;
        if (flatValidatorId) {
          referencedValidatorIds.add(flatValidatorId);
        }
        // Handle array format: { validator: { registryValidators: [{ validatorId: "..." }] } }
        const registryValidators =
          entity.attributes?.validator?.registryValidators;
        if (registryValidators) {
          registryValidators.forEach((rv) => {
            if (rv.validatorId) {
              referencedValidatorIds.add(rv.validatorId);
            }
          });
        }
      });
    }

    const validations: FormExportPayload['dependencies']['validations'] = [];
    for (const validatorId of referencedValidatorIds) {
      const validation =
        await this.validationRegistryRepository.findByPublicId(validatorId);
      if (validation) {
        const mappings =
          await this.validationComponentMappingRepository.findByValidationId(
            validation.id,
          );
        validations.push({
          source_id: validation.id,
          public_id: validation.public_id,
          name: validation.name,
          validation_type: validation.validation_type,
          validation_code: validation.validation_code,
          error_message: validation.error_message,
          components: mappings.map((m) => m.component),
        });
      }
    }

    // Extract master data references from form schema expressions
    const masterDataNames = this.extractMasterDataReferences(formSchema);

    // Resolve portable grantee codes for each permission entry
    const permissions = await this.resolvePermissionGranteeCodes(
      form.permissions,
    );

    return {
      public_id: form.public_id,
      is_template: form.is_template,
      latest_revision: {
        public_id: latestRevision.public_id,
        name: latestRevision.name,
        description: latestRevision.description,
        form_schema:
          latestRevision.form_schema as unknown as Prisma.InputJsonValue,
        fe_validation:
          (latestRevision.fe_validation as Prisma.InputJsonValue) ?? null,
        options: latestRevision.options
          ? {
              can_withdraw: latestRevision.options.can_withdraw,
              can_copy: latestRevision.options.can_copy,
              can_draft: latestRevision.options.can_draft,
              can_delegate: latestRevision.options.can_delegate,
            }
          : null,
      },
      dependencies: {
        tags,
        permissions,
        validations,
        master_data: masterDataNames.map((name) => ({ dataset_name: name })),
      },
    };
  }

  async exportWorkflow(
    publicId: string,
    userId: number,
  ): Promise<ExportContainer<WorkflowExportPayload>> {
    const user = await this.userRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const workflow =
      await this.workflowRepository.findWorkflowWithLatestRevision(publicId);
    if (!workflow) {
      throw new NotFoundException(`Workflow ${publicId} not found`);
    }

    const latestRevision = workflow.workflow_revisions[0];
    if (!latestRevision) {
      throw new NotFoundException(`Workflow ${publicId} has no revisions`);
    }

    const tags = workflow.workflow_tags.map((wt: WorkflowTagDetail) => ({
      name: wt.tag.name,
      description: wt.tag.description,
      color: wt.tag.color,
    }));

    const options = await this.workflowOptionsRepository.findByRevisionId(
      latestRevision.id,
    );

    const { userIds, orgUnitIds } = this.extractWorkflowDependencies(
      latestRevision.flow_definition as unknown as FlowDefinition,
    );

    const users = await this.userRepository.findUsers(Array.from(userIds));
    const orgUnits = await Promise.all(
      Array.from(orgUnitIds).map((id) =>
        this.orgUnitRepository.findOrgUnitById(id),
      ),
    );

    const binding = await this.bindingRepository.findFormIdByWorkflowId(
      workflow.id,
    );
    let bindingInfo: WorkflowExportPayload['binding'] | undefined;

    if (binding) {
      const boundForm = await this.prisma.form.findUnique({
        where: { id: binding },
        include: {
          form_revisions: {
            include: { options: true },
            orderBy: { version: 'desc' },
            take: 1,
          },
          form_tag: { include: { tag: true } },
          permissions: true,
        },
      });

      if (boundForm) {
        bindingInfo = {
          target_form_public_id: boundForm.public_id,
          bundled_form: await this.buildFormPayload(boundForm),
        };
      }
    }

    const payload: WorkflowExportPayload = {
      public_id: workflow.public_id,
      latest_revision: {
        public_id: latestRevision.public_id,
        name: latestRevision.name,
        description: latestRevision.description,
        flow_definition:
          latestRevision.flow_definition as unknown as Prisma.InputJsonValue,
        options: options
          ? {
              reuse_prior_approvals: options.reuse_prior_approvals,
            }
          : null,
      },
      binding: bindingInfo,
      dependencies: {
        tags,
        permissions: await this.resolvePermissionGranteeCodes(
          workflow.permissions,
        ),
        users: users.map((u) => ({
          source_id: u.id,
          code: u.code,
          name: u.name,
          email: u.email,
        })),
        org_units: orgUnits
          .filter((ou) => ou !== null)
          .map((ou: OrgUnitWithRelations) => ({
            source_id: ou.id,
            code: ou.code,
            name: ou.name,
            type: ou.type,
          })),
      },
    };

    return {
      protocol_version: '1.0',
      exported_at: new Date().toISOString(),
      exported_by: user.code,
      type: ExportType.WORKFLOW,
      payload,
    };
  }

  private extractWorkflowDependencies(flowDefinition: FlowDefinition): {
    userIds: Set<number>;
    orgUnitIds: Set<number>;
  } {
    const userIds = new Set<number>();
    const orgUnitIds = new Set<number>();

    if (!flowDefinition || !flowDefinition.nodes) {
      return { userIds, orgUnitIds };
    }

    flowDefinition.nodes.forEach((node: Node) => {
      if (node.type === NodeType.APPROVAL) {
        const approversList = Array.isArray(node.approvers)
          ? node.approvers
          : [node.approvers];
        approversList.forEach((config: ApproverConfig) => {
          if (!config) return;

          switch (config.type) {
            case ApproverType.SPECIFIC_USERS:
              if ('user_ids' in config.config && config.config.user_ids) {
                config.config.user_ids.forEach((id: number) => userIds.add(id));
              }
              break;
            case ApproverType.SPECIFIC_USER_REPORTING_LINE:
              if (config.config?.user_id) {
                userIds.add(config.config.user_id);
              }
              break;
            case ApproverType.DEPARTMENT_HEAD:
              if (config.config?.org_unit_id) {
                orgUnitIds.add(config.config.org_unit_id);
              }
              break;
            case ApproverType.ROLE:
              if (config.config?.role_id) {
                orgUnitIds.add(config.config.role_id);
              }
              break;
          }
        });
      }
    });

    return { userIds, orgUnitIds };
  }

  private async checkPermissionGrantees(
    permissions: {
      grantee_type: string;
      grantee_code?: string | null;
      action: string;
    }[],
    dependencies_check: ImportCheckResponse['dependencies_check'],
  ): Promise<void> {
    for (const p of permissions) {
      if (p.grantee_type === GranteeType.EVERYONE) {
        dependencies_check.permissions.push({
          grantee_type: p.grantee_type,
          grantee_code: null,
          action: p.action,
          status: ImportStatus.EXISTS,
          severity: ImportSeverity.INFO,
        });
        continue;
      }

      if (!p.grantee_code) {
        // Old payload without grantee_code — will be skipped on execute
        dependencies_check.permissions.push({
          grantee_type: p.grantee_type,
          grantee_code: null,
          action: p.action,
          status: ImportStatus.MISSING,
          severity: ImportSeverity.WARNING,
        });
        continue;
      }

      let exists = false;
      if (p.grantee_type === GranteeType.USER) {
        exists = !!(await this.userRepository.findUserByCode(p.grantee_code));
      } else if (p.grantee_type === GranteeType.ORG_UNIT) {
        exists = !!(await this.orgUnitRepository.findOrgUnitByCode(
          p.grantee_code,
        ));
      }

      dependencies_check.permissions.push({
        grantee_type: p.grantee_type,
        grantee_code: p.grantee_code,
        action: p.action,
        status: exists ? ImportStatus.EXISTS : ImportStatus.MISSING,
        severity: exists ? ImportSeverity.INFO : ImportSeverity.WARNING,
      });
    }
  }

  private async resolvePermissionGranteeCodes(
    permissions: {
      grantee_type: GranteeType;
      grantee_value: string;
      action: PermissionAction;
    }[],
  ): Promise<
    {
      grantee_type: string;
      grantee_value: string;
      grantee_code: string | null;
      action: string;
    }[]
  > {
    const result: {
      grantee_type: string;
      grantee_value: string;
      grantee_code: string | null;
      action: string;
    }[] = [];
    for (const p of permissions) {
      let grantee_code: string | null = null;
      if (p.grantee_type === GranteeType.USER) {
        const u = await this.userRepository.findUserById(
          Number(p.grantee_value),
        );
        grantee_code = u?.code ?? null;
      } else if (p.grantee_type === GranteeType.ORG_UNIT) {
        const ou = await this.orgUnitRepository.findOrgUnitById(
          Number(p.grantee_value),
        );
        grantee_code = ou?.code ?? null;
      }
      result.push({
        grantee_type: p.grantee_type,
        grantee_value: p.grantee_value,
        grantee_code,
        action: p.action,
      });
    }
    return result;
  }

  private async resolvePermissionsForExecute(
    permissions: {
      grantee_type: string;
      grantee_value: string;
      grantee_code?: string | null;
      action: string;
    }[],
  ): Promise<
    { grantee_type: string; grantee_value: string; action: string }[]
  > {
    const result: {
      grantee_type: string;
      grantee_value: string;
      action: string;
    }[] = [];
    for (const p of permissions) {
      if (p.grantee_type === GranteeType.EVERYONE) {
        result.push({
          grantee_type: p.grantee_type,
          grantee_value: '',
          action: p.action,
        });
        continue;
      }
      // No grantee_code — old payload or unknown grantee type; skip to avoid phantom permissions
      if (!p.grantee_code) continue;

      if (p.grantee_type === GranteeType.USER) {
        const target = await this.userRepository.findUserByCode(p.grantee_code);
        if (!target) continue;
        result.push({
          grantee_type: p.grantee_type,
          grantee_value: String(target.id),
          action: p.action,
        });
      } else if (p.grantee_type === GranteeType.ORG_UNIT) {
        const target = await this.orgUnitRepository.findOrgUnitByCode(
          p.grantee_code,
        );
        if (!target) continue;
        result.push({
          grantee_type: p.grantee_type,
          grantee_value: String(target.id),
          action: p.action,
        });
      }
    }
    return result;
  }

  private extractMasterDataReferences(formSchema: FormSchema): string[] {
    const datasetNames = new Set<string>();
    const regex = /getMasterData\s*\(\s*["']([^"']+)["']/g;

    const scanValue = (value: unknown): void => {
      if (value === null || typeof value !== 'object') return;
      if (
        typeof value === 'object' &&
        'isReference' in (value as Record<string, unknown>) &&
        'reference' in (value as Record<string, unknown>)
      ) {
        const ref = (value as { reference: string }).reference;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(ref)) !== null) {
          datasetNames.add(match[1]);
        }
        regex.lastIndex = 0;
        return;
      }
      if (Array.isArray(value)) {
        value.forEach(scanValue);
        return;
      }
      Object.values(value as Record<string, unknown>).forEach(scanValue);
    };

    if (formSchema?.entities) {
      Object.values(formSchema.entities).forEach((entity) => {
        scanValue(entity.attributes);

        // Also capture dynamic dropdown datasource references (not expressions).
        // Schema uses both key names: datasourceType (top-level fields) and datasource (grid columns).
        const attrsRecord = entity.attributes as unknown as Record<
          string,
          unknown
        >;
        const datasource =
          attrsRecord?.datasourceType ?? attrsRecord?.datasource;
        if (
          datasource !== null &&
          typeof datasource === 'object' &&
          (datasource as Record<string, unknown>).type === 'dynamic'
        ) {
          const table = (datasource as Record<string, unknown>).table;
          if (
            table !== null &&
            typeof table === 'object' &&
            typeof (table as Record<string, unknown>).tableKey === 'string'
          ) {
            datasetNames.add(
              (table as Record<string, unknown>).tableKey as string,
            );
          }
        }
      });
    }

    return Array.from(datasetNames);
  }

  async checkImport(
    container: ExportContainer<any>,
  ): Promise<ImportCheckResponse> {
    if (container.protocol_version !== '1.0') {
      throw new Error('Unsupported protocol version');
    }

    if (container.type === ExportType.FORM) {
      return this.checkFormImport(
        container as ExportContainer<FormExportPayload>,
      );
    } else if (container.type === ExportType.WORKFLOW) {
      return this.checkWorkflowImport(
        container as ExportContainer<WorkflowExportPayload>,
      );
    } else {
      throw new Error('Unsupported export type');
    }
  }

  private async checkFormImport(
    container: ExportContainer<FormExportPayload>,
  ): Promise<ImportCheckResponse> {
    const payload = container.payload;
    const existingForm = await this.formRepository.findByPublicId(
      payload.public_id,
    );

    const dependencies_check: ImportCheckResponse['dependencies_check'] = {
      tags: [],
      validations: [],
      master_data: [],
      org_units: [],
      users: [],
      permissions: [],
    };

    const can_proceed = true;

    // Check Tags
    for (const tag of payload.dependencies.tags) {
      const existingTag = await this.prisma.tag.findUnique({
        where: { name: tag.name },
      });
      dependencies_check.tags.push({
        name: tag.name,
        status: existingTag ? ImportStatus.EXISTS : ImportStatus.MISSING,
        severity: existingTag ? ImportSeverity.INFO : ImportSeverity.WARNING,
      });
    }

    // Check Validations
    for (const val of payload.dependencies.validations) {
      const existingVal = await this.validationRegistryRepository.findByName(
        val.name,
      );
      dependencies_check.validations.push({
        name: val.name,
        status: existingVal ? ImportStatus.EXISTS : ImportStatus.MISSING,
        severity: ImportSeverity.INFO, // Validations can be created
        source: {
          public_id: val.public_id,
          validation_type: val.validation_type,
          validation_code: val.validation_code,
          error_message: val.error_message,
        },
        target: existingVal
          ? {
              public_id: existingVal.public_id,
              validation_type: existingVal.validation_type ?? null,
              validation_code: existingVal.validation_code ?? null,
              error_message: existingVal.error_message ?? null,
            }
          : null,
      });
    }

    // Check Master Data
    if (payload.dependencies.master_data) {
      for (const md of payload.dependencies.master_data) {
        const existingDataset = await this.prisma.datasetDefinition.findFirst({
          where: { name: md.dataset_name },
        });
        dependencies_check.master_data.push({
          dataset_name: md.dataset_name,
          status: existingDataset ? ImportStatus.EXISTS : ImportStatus.MISSING,
          severity: existingDataset
            ? ImportSeverity.INFO
            : ImportSeverity.WARNING,
        });
      }
    }

    let action = ImportAction.CREATE;
    let revision_diff = true;

    if (existingForm) {
      if (!existingForm.is_active) {
        return {
          can_proceed: false,
          summary: {
            entity_exists: true,
            action: ImportAction.NO_CHANGE,
            revision_diff: false,
            error: `Target form '${payload.public_id}' exists but is deleted. Please restore it or change the ID.`,
          },
          dependencies_check,
          original_payload: container,
        };
      }

      action = ImportAction.UPDATE_REVISION;
      const latestRevision = existingForm.form_revisions[0];
      if (
        latestRevision &&
        latestRevision.public_id === payload.latest_revision.public_id
      ) {
        revision_diff = false;
        action = ImportAction.NO_CHANGE;
      }
    }

    // Check Permission Grantees — WARNING only, never affects can_proceed
    await this.checkPermissionGrantees(
      payload.dependencies.permissions,
      dependencies_check,
    );

    return {
      can_proceed,
      summary: {
        entity_exists: !!existingForm,
        action,
        revision_diff,
      },
      dependencies_check,
      original_payload: container,
    };
  }

  private async checkWorkflowImport(
    container: ExportContainer<WorkflowExportPayload>,
  ): Promise<ImportCheckResponse> {
    const payload = container.payload;
    const existingWorkflow =
      await this.workflowRepository.findWorkflowByPublicId(payload.public_id);

    const dependencies_check: ImportCheckResponse['dependencies_check'] = {
      tags: [],
      validations: [],
      master_data: [],
      org_units: [],
      users: [],
      permissions: [],
    };

    let can_proceed = true;

    // Check Tags
    for (const tag of payload.dependencies.tags) {
      const existingTag = await this.prisma.tag.findUnique({
        where: { name: tag.name },
      });
      dependencies_check.tags.push({
        name: tag.name,
        status: existingTag ? ImportStatus.EXISTS : ImportStatus.MISSING,
        severity: existingTag ? ImportSeverity.INFO : ImportSeverity.WARNING,
      });
    }

    // Check Users (Blocking)
    for (const user of payload.dependencies.users) {
      const existingUser = await this.userRepository.findUserByCode(user.code);
      if (!existingUser) {
        can_proceed = false;
      }
      dependencies_check.users.push({
        code: user.code,
        status: existingUser ? ImportStatus.EXISTS : ImportStatus.MISSING,
        severity: existingUser ? ImportSeverity.INFO : ImportSeverity.BLOCKING,
      });
    }

    // Check OrgUnits (Blocking)
    for (const ou of payload.dependencies.org_units) {
      const existingOU = await this.orgUnitRepository.findOrgUnitByCode(
        ou.code,
      );
      if (!existingOU) {
        can_proceed = false;
      }
      dependencies_check.org_units.push({
        code: ou.code,
        status: existingOU ? ImportStatus.EXISTS : ImportStatus.MISSING,
        severity: existingOU ? ImportSeverity.INFO : ImportSeverity.BLOCKING,
      });
    }

    // Check Binding Form
    if (payload.binding) {
      const existingForm = await this.formRepository.findByPublicId(
        payload.binding.target_form_public_id,
      );
      const inBundle = !!payload.binding.bundled_form;

      dependencies_check.related_form = {
        public_id: payload.binding.target_form_public_id,
        status: existingForm
          ? ImportStatus.EXISTS
          : inBundle
            ? ImportStatus.IN_BUNDLE
            : ImportStatus.MISSING,
        severity:
          existingForm || inBundle
            ? ImportSeverity.INFO
            : ImportSeverity.BLOCKING,
      };

      if (!existingForm && !inBundle) {
        can_proceed = false;
      }

      // If bundled, check bundled form's dependencies too
      if (inBundle) {
        const formCheck = await this.checkFormImport({
          ...container,
          type: ExportType.FORM,
          payload: payload.binding.bundled_form!,
        } as ExportContainer<FormExportPayload>);

        // Merge form dependencies
        dependencies_check.tags.push(...formCheck.dependencies_check.tags);
        dependencies_check.validations.push(
          ...formCheck.dependencies_check.validations,
        );
        dependencies_check.master_data.push(
          ...formCheck.dependencies_check.master_data,
        );
        if (!formCheck.can_proceed) {
          can_proceed = false;
        }
      }
    }

    let action = ImportAction.CREATE;
    let revision_diff = true;

    if (existingWorkflow) {
      if (!existingWorkflow.is_active) {
        return {
          can_proceed: false,
          summary: {
            entity_exists: true,
            action: ImportAction.NO_CHANGE,
            revision_diff: false,
            error: `Target workflow '${payload.public_id}' exists but is deleted. Please restore it or change the ID.`,
          },
          dependencies_check,
          original_payload: container,
        };
      }

      action = ImportAction.UPDATE_REVISION;
      const latest = (
        await this.workflowRepository.findWorkflowWithLatestRevision(
          payload.public_id,
        )
      )?.workflow_revisions[0];
      if (latest && latest.public_id === payload.latest_revision.public_id) {
        revision_diff = false;
        action = ImportAction.NO_CHANGE;
      }
    }

    // Check Permission Grantees — WARNING only, never affects can_proceed
    await this.checkPermissionGrantees(
      payload.dependencies.permissions,
      dependencies_check,
    );

    return {
      can_proceed,
      summary: {
        entity_exists: !!existingWorkflow,
        action,
        revision_diff,
      },
      dependencies_check,
      original_payload: container,
    };
  }

  async executeImport(
    checkResult: ImportCheckResponse,
    userId: number,
  ): Promise<ImportExecuteResponse> {
    const container = checkResult.original_payload;

    if (container.protocol_version !== '1.0') {
      throw new Error('Unsupported protocol version');
    }

    return this.prisma.$transaction(async (tx) => {
      if (container.type === ExportType.FORM) {
        return await this.executeFormImport(
          container as ExportContainer<FormExportPayload>,
          userId,
          tx,
        );
      } else if (container.type === ExportType.WORKFLOW) {
        return await this.executeWorkflowImport(
          container as ExportContainer<WorkflowExportPayload>,
          userId,
          tx,
        );
      } else {
        throw new Error('Unsupported export type');
      }
    });
  }

  private async executeFormImport(
    container: ExportContainer<FormExportPayload>,
    userId: number,
    tx: Prisma.TransactionClient,
  ): Promise<ImportExecuteResponse> {
    const payload = container.payload;

    // 1. Sync Tags
    const tagIds: number[] = [];
    for (const tag of payload.dependencies.tags) {
      let existingTag = await tx.tag.findUnique({ where: { name: tag.name } });
      if (!existingTag) {
        existingTag = await this.tagRepository.create(
          {
            name: tag.name,
            description: tag.description,
            color: tag.color,
            created_by: userId,
            updated_by: userId,
          },
          tx,
        );
      }
      tagIds.push(existingTag.id);
    }

    // 2. Sync Validations
    // Build a map of source public_id → target public_id so we can rewrite
    // validator references in the form schema before saving.
    const validatorPublicIdMap = new Map<string, string>();
    for (const val of payload.dependencies.validations) {
      let existingVal = await this.validationRegistryRepository.findByName(
        val.name,
        tx,
      );
      if (!existingVal) {
        existingVal = await this.validationRegistryRepository.create(
          {
            public_id: val.public_id,
            name: val.name,
            description: `Imported from ${container.exported_by}`,
            validation_type: val.validation_type as ValidationType,
            validation_code: val.validation_code,
            error_message: val.error_message,
            created_by: userId,
            updated_by: userId,
          },
          tx,
        );
      }
      validatorPublicIdMap.set(val.public_id, existingVal.public_id);

      // Sync Component Mappings
      if (val.components) {
        await this.validationComponentMappingRepository.deleteAllByValidationId(
          existingVal.id,
          tx,
        );

        for (const comp of val.components) {
          await this.validationComponentMappingRepository.create(
            {
              public_id: generatePublicId(),
              validation_id: existingVal.id,
              component: comp,
              created_by: userId,
            },
            tx,
          );
        }
      }
    }

    // 3. Upsert Form
    let form = await this.formRepository.findByPublicId(payload.public_id, tx);
    if (!form) {
      form = await this.formRepository.create(
        {
          public_id: payload.public_id,
          name: payload.latest_revision.name,
          description: payload.latest_revision.description ?? undefined,
          is_template: payload.is_template,
          is_active: true,
          created_by: userId,
          updated_by: userId,
        },
        tx,
      );
    }

    // 4. Create Revision
    // Rewrite validator public_ids in the schema to match the target environment.
    // A validator looked up by name may have a different public_id in this env.
    const remappedSchema = this.remapValidatorIds(
      payload.latest_revision.form_schema as unknown as FormSchema,
      validatorPublicIdMap,
    );

    const existingRevision = await tx.formRevision.findUnique({
      where: { public_id: payload.latest_revision.public_id },
    });

    if (existingRevision) {
      await this.formRepository.updateRevision(
        payload.latest_revision.public_id,
        {
          name: payload.latest_revision.name,
          description: payload.latest_revision.description,
          form_schema: remappedSchema,
          fe_validation: payload.latest_revision.fe_validation ?? Prisma.DbNull,
          state: RevisionState.ACTIVE,
          updated_by: userId,
        },
        tx,
      );
      await this.formRepository.archiveActiveRevisions(
        form.id,
        existingRevision.id,
        tx,
      );
    } else {
      const latest = await this.formRepository.findLatestRevision(form.id, tx);
      const version = latest ? latest.version + 1 : 1;

      const newRev = await this.formRepository.createRevision(
        {
          public_id: payload.latest_revision.public_id,
          form_id: form.id,
          name: payload.latest_revision.name,
          description: payload.latest_revision.description ?? undefined,
          form_schema: remappedSchema,
          fe_validation: payload.latest_revision.fe_validation ?? Prisma.DbNull,
          version,
          state: RevisionState.ACTIVE,
          options: {
            create: payload.latest_revision.options
              ? {
                  can_withdraw: payload.latest_revision.options.can_withdraw,
                  can_copy: payload.latest_revision.options.can_copy,
                  can_draft: payload.latest_revision.options.can_draft,
                  can_delegate: payload.latest_revision.options.can_delegate,
                }
              : undefined,
          },
          created_by: userId,
          updated_by: userId,
        },
        tx,
      );
      await this.formRepository.archiveActiveRevisions(form.id, newRev.id, tx);
    }

    // Update Tags
    await this.formRepository.updateTags(form.id, tagIds, tx);

    // Sync Permissions — remap grantee_value to target-env ID; skip missing grantees
    await tx.formPermission.deleteMany({ where: { form_id: form.id } });
    const formPermissionsToWrite = await this.resolvePermissionsForExecute(
      payload.dependencies.permissions,
    );
    if (formPermissionsToWrite.length > 0) {
      await tx.formPermission.createMany({
        data: formPermissionsToWrite.map((p) => ({
          form_id: form.id,
          grantee_type: p.grantee_type as GranteeType,
          grantee_value: p.grantee_value,
          action: p.action as PermissionAction,
        })),
      });
    }

    return {
      type: ExportType.FORM,
      public_id: payload.public_id,
      latest_revision_public_id: payload.latest_revision.public_id,
    };
  }

  private async executeWorkflowImport(
    container: ExportContainer<WorkflowExportPayload>,
    userId: number,
    tx: Prisma.TransactionClient,
  ): Promise<ImportExecuteResponse> {
    const payload = container.payload;

    // 1. Handle Bundled Form
    if (payload.binding && payload.binding.bundled_form) {
      await this.executeFormImport(
        {
          ...container,
          type: ExportType.FORM,
          payload: payload.binding.bundled_form,
        } as ExportContainer<FormExportPayload>,
        userId,
        tx,
      );
    }

    // 2. Sync Tags
    const tagIds: number[] = [];
    for (const tag of payload.dependencies.tags) {
      let existingTag = await tx.tag.findUnique({ where: { name: tag.name } });
      if (!existingTag) {
        existingTag = await this.tagRepository.create(
          {
            name: tag.name,
            description: tag.description,
            color: tag.color,
            created_by: userId,
            updated_by: userId,
          },
          tx,
        );
      }
      tagIds.push(existingTag.id);
    }

    // 3. Resolve Dependencies
    const userMapping = new Map<number, number>();
    const orgUnitMapping = new Map<number, number>();

    for (const user of payload.dependencies.users) {
      const targetUser = await this.userRepository.findUserByCode(user.code);
      if (targetUser) {
        userMapping.set(user.source_id, targetUser.id);
      } else {
        throw new Error(
          `User with code ${user.code} not found during execution`,
        );
      }
    }

    for (const ou of payload.dependencies.org_units) {
      const targetOU = await this.orgUnitRepository.findOrgUnitByCode(ou.code);
      if (targetOU) {
        orgUnitMapping.set(ou.source_id, targetOU.id);
      } else {
        throw new Error(
          `OrgUnit with code ${ou.code} not found during execution`,
        );
      }
    }

    // 4. Transform Flow Definition
    const transformer = new FlowDefinitionTransformer(
      userMapping,
      orgUnitMapping,
    );
    const transformedFlow = transformer.transform(
      payload.latest_revision.flow_definition as unknown as FlowDefinition,
    );

    // 5. Upsert Workflow
    let workflowId: number;
    const existingWorkflow = await tx.workflow.findUnique({
      where: { public_id: payload.public_id },
    });

    if (!existingWorkflow) {
      const newWorkflow = await tx.workflow.create({
        data: {
          public_id: payload.public_id,
          is_active: true,
          created_by: userId,
          updated_by: userId,
        },
      });
      workflowId = newWorkflow.id;
    } else {
      workflowId = existingWorkflow.id;
      await tx.workflow.update({
        where: { id: workflowId },
        data: { updated_by: userId },
      });
    }

    // 6. Create Revision
    const existingRevision = await tx.workflowRevisions.findUnique({
      where: { public_id: payload.latest_revision.public_id },
    });

    if (existingRevision) {
      await this.workflowRepository.updateWorkflowRevision(
        payload.latest_revision.public_id,
        {
          status: RevisionState.ACTIVE,
          flow_definition: transformedFlow,
        },
        tx,
      );
      await this.workflowRepository.archiveActiveWorkflowRevisions(
        workflowId,
        existingRevision.id,
        tx,
      );
    } else {
      const latest = await tx.workflowRevisions.findFirst({
        where: { workflow_id: workflowId },
        orderBy: { version: 'desc' },
      });
      const version = latest ? latest.version + 1 : 1;

      const newRev = await tx.workflowRevisions.create({
        data: {
          public_id: payload.latest_revision.public_id,
          workflow_id: workflowId,
          name: payload.latest_revision.name,
          description: payload.latest_revision.description ?? undefined,
          flow_definition: transformedFlow as unknown as Prisma.InputJsonValue,
          version,
          state: RevisionState.ACTIVE,
          created_by: userId,
          updated_by: userId,
        },
      });
      await this.workflowRepository.archiveActiveWorkflowRevisions(
        workflowId,
        newRev.id,
        tx,
      );
    }

    // 7. Update Tags
    await tx.workflowTag.deleteMany({ where: { workflow_id: workflowId } });
    if (tagIds.length > 0) {
      await tx.workflowTag.createMany({
        data: tagIds.map((tid) => ({
          workflow_id: workflowId,
          tag_id: tid,
        })),
      });
    }

    // 8. Sync Permissions — remap grantee_value to target-env ID; skip missing grantees
    await tx.workflowPermission.deleteMany({
      where: { workflow_id: workflowId },
    });
    const workflowPermissionsToWrite = await this.resolvePermissionsForExecute(
      payload.dependencies.permissions,
    );
    if (workflowPermissionsToWrite.length > 0) {
      await tx.workflowPermission.createMany({
        data: workflowPermissionsToWrite.map((p) => ({
          workflow_id: workflowId,
          grantee_type: p.grantee_type as GranteeType,
          grantee_value: p.grantee_value,
          action: p.action as PermissionAction,
        })),
      });
    }

    // 9. Handle Binding
    if (payload.binding) {
      const targetForm = await tx.form.findUnique({
        where: { public_id: payload.binding.target_form_public_id },
      });
      if (targetForm) {
        const existingBinding = await tx.formWorkflowBinding.findFirst({
          where: { workflow_id: workflowId },
        });
        if (existingBinding) {
          await tx.formWorkflowBinding.update({
            where: { id: existingBinding.id },
            data: { form_id: targetForm.id, updated_by: userId },
          });
        } else {
          await tx.formWorkflowBinding.create({
            data: {
              workflow_id: workflowId,
              form_id: targetForm.id,
              created_by: userId,
              updated_by: userId,
            },
          });
        }
      }
    }

    return {
      type: ExportType.WORKFLOW,
      public_id: payload.public_id,
      latest_revision_public_id: payload.latest_revision.public_id,
    };
  }

  private remapValidatorIds(
    schema: FormSchema,
    idMap: Map<string, string>,
  ): Prisma.InputJsonValue {
    if (idMap.size === 0) return schema as unknown as Prisma.InputJsonValue;
    const cloned = structuredClone(schema);
    for (const entity of Object.values(cloned.entities ?? {})) {
      // Remap flat validatorId format: { validator: { validatorId: "..." } }
      // FieldValidator type does not declare validatorId (schema extension), so cast is required.
      const validatorAsRecord = entity?.attributes?.validator as
        | (Record<string, string> & {
            registryValidators?: { validatorId?: string }[];
          })
        | undefined;
      if (
        validatorAsRecord?.validatorId &&
        idMap.has(validatorAsRecord.validatorId)
      ) {
        validatorAsRecord.validatorId = idMap.get(
          validatorAsRecord.validatorId,
        )!;
      }
      // Remap array format: { validator: { registryValidators: [{ validatorId: "..." }] } }
      const registryValidators = validatorAsRecord?.registryValidators;
      if (Array.isArray(registryValidators)) {
        for (const rv of registryValidators) {
          if (rv.validatorId && idMap.has(rv.validatorId)) {
            rv.validatorId = idMap.get(rv.validatorId)!;
          }
        }
      }
    }
    return cloned as unknown as Prisma.InputJsonValue;
  }

  private async syncUserDefaultOrgPreference(
    userId: number,
    orgUnitId: number,
    actorId: number,
    tx: PrismaTransactionClient,
  ) {
    const now = new Date();

    // 1. Ensure an active membership to this org exists.
    //    Only create a fallback INDEFINITE membership when none is present.
    //    Never overwrite an existing membership's end_date — it may carry an
    //    explicitly imported value from the membership import step (step 3).
    const existing = await tx.orgMembership.findFirst({
      where: {
        user_id: userId,
        org_unit_id: orgUnitId,
        end_date: { gt: now },
      },
    });

    if (!existing) {
      await tx.orgMembership.create({
        data: {
          user_id: userId,
          org_unit_id: orgUnitId,
          assign_type: AssignType.USER,
          start_date: now,
          end_date: INDEFINITE_MEMBERSHIP_END_DATE,
          created_by: actorId,
          updated_by: actorId,
        },
      });
    }

    // 2. Check active counts
    const activeCount = await tx.orgMembership.count({
      where: { user_id: userId, end_date: { gt: now } },
    });

    if (activeCount > 1) {
      await tx.userDefaultOrg.upsert({
        where: { user_id: userId },
        create: { user_id: userId, org_unit_id: orgUnitId },
        update: { org_unit_id: orgUnitId },
      });
    } else {
      await tx.userDefaultOrg.deleteMany({ where: { user_id: userId } });
    }
  }
}
