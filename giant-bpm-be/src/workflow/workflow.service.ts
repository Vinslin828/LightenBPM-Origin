import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import {
  Workflow,
  RevisionState,
  PermissionAction,
  GranteeType,
} from '../common/types/common.types';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { WorkflowDto, toWorkflowDto } from './dto/workflow.dto';
import {
  CreateWorkflowResponseDto,
  toCreateWorkflowResponseDto,
} from './dto/create-workflow-response.dto';
import { CreateWorkflowRevisionDto } from './dto/create-workflow-revision.dto';
import { ListWorkflowRespDto } from './dto/list-workflow-resp.dto';
import { UpdateWorkflowVersionDto } from './dto/update-workflow-version.dto';
import { TagDto } from '../tag/dto/tag.dto';
import {
  WorkflowRevisionDto,
  toWorkflowRevisionDto,
} from './dto/workflow-revision.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { FlowValidatorService } from '../flow-engine/validation/flow-definition/flow-validator.service';
import { FormReferenceValidatorService } from '../flow-engine/validation/form-reference/form-reference-validator.service';
import { FlowDefinition } from '../flow-engine/types';
import { ValidationError } from '../flow-engine/types/validation.types';
import { FormWorkflowBindingService } from '../form-workflow-binding/form-workflow-binding.service';
import { FormService } from '../form/form.service';
import {
  WorkflowRepository,
  WorkflowPermissionWithRelations,
} from './repositories/workflow.repository';
import { FlowAnalysisService } from '../flow-engine/analysis/flow-analysis.service';
import { GuaranteedNodesResponseDto } from './dto/guaranteed-nodes-response.dto';
import { PossibleNodesResponseDto } from './dto/possible-nodes-response.dto';

import { ListWorkflowsQueryDto } from './dto/list-workflows-query.dto';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGINATION_LIMIT,
} from '../common/dto/pagination.dto';
import { Prisma } from '@prisma/client';
import { TransactionService } from '../prisma/transaction.service';
import { PermissionBuilderService } from '../common/permission/permission-builder.service';
import { AuthUser, isAdminUser } from '../auth/types/auth-user';
import {
  AggregatedWorkflowPermissionDto,
  AggregatedPermissionActionDto,
} from './dto/workflow-permission.dto';
import { aggregatePermissions } from '../common/utils/permission-utils';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    private workflowRepository: WorkflowRepository,
    private bindingService: FormWorkflowBindingService,
    private formService: FormService,
    private flowValidator: FlowValidatorService,
    private formReferenceValidator: FormReferenceValidatorService,
    private flowAnalysisService: FlowAnalysisService,
    private transactionService: TransactionService,
    private readonly permissionBuilder: PermissionBuilderService,
  ) {}

  async listWorkflows(
    user: AuthUser,
    query?: ListWorkflowsQueryDto,
  ): Promise<{ items: ListWorkflowRespDto[]; total: number }> {
    const page = query?.page || DEFAULT_PAGE;
    const limit = query?.limit || DEFAULT_PAGINATION_LIMIT;
    const skip = (page - 1) * limit;

    const visibilityWhere =
      this.permissionBuilder.getWorkflowVisibilityWhere(user);

    const { items: workflows, total } =
      await this.workflowRepository.listWorkflows(
        skip,
        limit,
        query,
        visibilityWhere,
      );

    const items = workflows.map((workflow) => {
      const latestVersion = workflow.workflow_revisions[0];
      return {
        workflow_id: workflow.public_id,
        name: latestVersion ? latestVersion.name : '',
        description: latestVersion?.description ?? undefined,
        revisionId: latestVersion ? latestVersion.public_id : '',
        tags: workflow.workflow_tags.map((wt) => TagDto.fromPrisma(wt.tag)),
        is_active: workflow.is_active,
        created_at: workflow.created_at,
      };
    });

    return { items, total };
  }

  async listWorkflowRevisions(
    workflow_public_id: string,
  ): Promise<WorkflowRevisionDto[]> {
    const workflow =
      await this.workflowRepository.findWorkflowByPublicId(workflow_public_id);

    if (!workflow) {
      throw new NotFoundException(
        `Workflow with public_id ${workflow_public_id} not found`,
      );
    }

    const workflowRevisions =
      await this.workflowRepository.listWorkflowRevisions(workflow.id);

    return workflowRevisions.map((workflowRevision) =>
      toWorkflowRevisionDto(workflow, workflowRevision),
    );
  }

  async createWorkflow(
    createWorkflowDto: CreateWorkflowDto,
    user: AuthUser,
  ): Promise<CreateWorkflowResponseDto> {
    if (
      !createWorkflowDto.permissions ||
      createWorkflowDto.permissions.length === 0
    ) {
      createWorkflowDto.permissions = [
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
    }

    const workflow = await this.workflowRepository.createWorkflow(
      createWorkflowDto,
      user.id,
    );

    if (
      !workflow ||
      !workflow.workflow_revisions ||
      workflow.workflow_revisions.length === 0
    ) {
      throw new Error(
        'Workflow creation failed or no workflow_revisions returned',
      );
    }

    return toCreateWorkflowResponseDto(workflow);
  }

  async createWorkflowRevision(
    workflow_id: string,
    data: CreateWorkflowRevisionDto,
    user: AuthUser,
  ): Promise<WorkflowRevisionDto> {
    const { status, tags } = data;

    await this.validateWorkflowRevision(workflow_id, data);

    const workflow =
      await this.workflowRepository.findWorkflowByPublicId(workflow_id);
    if (!workflow) {
      throw new NotFoundException(`Workflow with id: ${workflow_id} not found`);
    }

    if (
      !this.permissionBuilder.canPerformAction(
        user,
        PermissionAction.MANAGE,
        workflow.permissions,
        workflow.created_by,
      )
    ) {
      throw new ForbiddenException(
        'You do not have permission to create revisions for this workflow',
      );
    }

    return this.transactionService.runTransaction(async (tx) => {
      const newRevision = await this.workflowRepository.createWorkflowRevision(
        workflow.id,
        data,
        user.id,
        status,
        tx,
      );

      if (tags) {
        const upudateTags: UpdateWorkflowDto = { tags };
        await this.workflowRepository.updateWorkflow(
          workflow.id,
          workflow.public_id,
          upudateTags,
          user.id,
          tx,
        );
      }

      if (status === RevisionState.ACTIVE) {
        await this.workflowRepository.archiveActiveWorkflowRevisions(
          workflow.id,
          newRevision.id,
          tx,
        );
      }

      return toWorkflowRevisionDto(workflow, newRevision);
    });
  }

  async getWorkflow(workflow_id: string): Promise<WorkflowDto | null> {
    const workflow =
      await this.workflowRepository.findWorkflowWithLatestRevision(workflow_id);

    if (!workflow || workflow.workflow_revisions.length === 0) {
      throw new NotFoundException(
        `No active revision found for workflow with id: ${workflow_id}`,
      );
    }

    const bindingForm = await this.bindingService.getBindingFormByWorkflowId(
      workflow.id,
    );

    return toWorkflowDto(
      workflow,
      workflow.workflow_revisions[0],
      bindingForm ?? undefined,
    );
  }

  async getWorkflowRevision(revision_id: string): Promise<WorkflowRevisionDto> {
    const workflowRevision =
      await this.workflowRepository.findWorkflowRevisionByPublicId(revision_id);

    if (!workflowRevision) {
      throw new NotFoundException(
        `Workflow revision with public_id ${revision_id} not found`,
      );
    }

    const bindingForm = await this.bindingService.getBindingFormByWorkflowId(
      workflowRevision.workflow_id,
    );

    return toWorkflowRevisionDto(
      workflowRevision.workflow,
      workflowRevision,
      bindingForm ?? undefined,
    );
  }

  async updateWorkflow(
    workflow_id: string,
    data: UpdateWorkflowDto,
    user: AuthUser,
  ): Promise<Workflow> {
    return this.transactionService.runTransaction(async (tx) => {
      const workflow =
        await this.workflowRepository.findWorkflowByPublicId(workflow_id);
      if (!workflow) {
        throw new NotFoundException(
          `Workflow with id ${workflow_id} not found`,
        );
      }

      if (
        !this.permissionBuilder.canPerformAction(
          user,
          PermissionAction.MANAGE,
          workflow.permissions,
          workflow.created_by,
        )
      ) {
        throw new ForbiddenException(
          'You do not have permission to update this workflow',
        );
      }

      return this.workflowRepository.updateWorkflow(
        workflow.id,
        workflow_id,
        data,
        user.id,
        tx,
      );
    });
  }

  async updateWorkflowRevision(
    revision_id: string,
    data: UpdateWorkflowVersionDto,
    user: AuthUser,
  ): Promise<void> {
    const { status, flow_definition } = data;

    const workflowRevision =
      await this.workflowRepository.findWorkflowRevisionByPublicId(revision_id);

    if (!workflowRevision) {
      throw new NotFoundException(
        `Workflow revision with public_id ${revision_id} not found`,
      );
    }

    if (
      !this.permissionBuilder.canPerformAction(
        user,
        PermissionAction.MANAGE,
        workflowRevision.workflow.permissions,
        workflowRevision.workflow.created_by,
      )
    ) {
      throw new ForbiddenException(
        'You do not have permission to update revisions for this workflow',
      );
    }

    if (workflowRevision.state !== RevisionState.DRAFT) {
      throw new BadRequestException(
        `Only workflow revisions with status DRAFT can be updated. Current status: ${workflowRevision.state}`,
      );
    }

    const workflow = await this.workflowRepository.findWorkflowById(
      workflowRevision.workflow_id,
    );

    if (!workflow) {
      throw new NotFoundException(
        `Workflow with id ${workflowRevision.workflow_id} not found`,
      );
    }

    await this.validateWorkflowRevision(workflow.public_id, {
      ...workflowRevision,
      status: status,
      flow_definition:
        flow_definition ??
        (workflowRevision.flow_definition as unknown as FlowDefinition),
    });

    await this.transactionService.runTransaction(async (tx) => {
      if (status === RevisionState.ACTIVE) {
        await this.workflowRepository.archiveActiveWorkflowRevisions(
          workflowRevision.workflow_id,
          workflowRevision.id,
          tx,
        );
      }

      await this.workflowRepository.updateWorkflowRevision(
        revision_id,
        {
          status,
          flow_definition,
        },
        tx,
      );
    });
  }

  async softDeleteWorkflow(
    public_id: string,
    user: AuthUser,
  ): Promise<Workflow> {
    const workflow =
      await this.workflowRepository.findWorkflowByPublicId(public_id);
    if (!workflow) {
      throw new NotFoundException(`Workflow with id ${public_id} not found`);
    }

    if (
      !this.permissionBuilder.canPerformAction(
        user,
        PermissionAction.MANAGE,
        workflow.permissions,
        workflow.created_by,
      )
    ) {
      throw new ForbiddenException(
        'You do not have permission to delete this workflow',
      );
    }

    return this.workflowRepository.softDeleteWorkflow(public_id);
  }

  async deleteWorkflow(
    public_id: string,
    user: AuthUser,
  ): Promise<Workflow | null> {
    const workflow =
      await this.workflowRepository.findWorkflowByPublicId(public_id);
    if (!workflow) {
      throw new NotFoundException(`Workflow with id ${public_id} not found`);
    }

    if (
      !this.permissionBuilder.canPerformAction(
        user,
        PermissionAction.MANAGE,
        workflow.permissions,
        workflow.created_by,
      )
    ) {
      throw new ForbiddenException(
        'You do not have permission to delete this workflow',
      );
    }

    return this.workflowRepository.deleteWorkflow(public_id);
  }

  async deleteWorkflowRevision(revision_id: string): Promise<void> {
    await this.workflowRepository.deleteWorkflowRevision(revision_id);
  }

  async listWorkflowPermissions(
    workflowPublicId: string,
    user?: AuthUser,
  ): Promise<AggregatedWorkflowPermissionDto[]> {
    const workflow =
      await this.workflowRepository.findWorkflowByPublicId(workflowPublicId);
    if (!workflow) {
      throw new NotFoundException(
        `Workflow with id ${workflowPublicId} not found`,
      );
    }

    if (
      user &&
      !this.permissionBuilder.canPerformAction(
        user,
        PermissionAction.MANAGE,
        workflow.permissions,
        workflow.created_by,
      )
    ) {
      throw new ForbiddenException(
        'You do not have permission to view permissions for this workflow',
      );
    }

    const permissions =
      await this.workflowRepository.findPermissionsByWorkflowId(workflow.id);
    return aggregatePermissions<
      Prisma.WorkflowPermissionGetPayload<object>,
      AggregatedPermissionActionDto,
      AggregatedWorkflowPermissionDto
    >(permissions, 'workflow_id', workflow.id, (p) => ({
      id: p.id,
      action: p.action,
    }));
  }

  async addWorkflowPermissions(
    workflowPublicId: string,
    data: Prisma.WorkflowPermissionCreateWithoutWorkflowInput[],
    user?: AuthUser,
  ): Promise<Prisma.WorkflowPermissionGetPayload<any>[]> {
    const workflow =
      await this.workflowRepository.findWorkflowByPublicId(workflowPublicId);
    if (!workflow) {
      throw new NotFoundException(
        `Workflow with id ${workflowPublicId} not found`,
      );
    }

    if (
      user &&
      !this.permissionBuilder.canPerformAction(
        user,
        PermissionAction.MANAGE,
        workflow.permissions,
        workflow.created_by,
      )
    ) {
      throw new ForbiddenException(
        'You do not have permission to manage permissions for this workflow',
      );
    }

    return this.workflowRepository.createPermissions(workflow.id, data);
  }

  async setWorkflowPermissions(
    workflowPublicId: string,
    data: Prisma.WorkflowPermissionCreateWithoutWorkflowInput[],
    user?: AuthUser,
  ): Promise<Prisma.WorkflowPermissionGetPayload<any>[]> {
    const workflow =
      await this.workflowRepository.findWorkflowByPublicId(workflowPublicId);
    if (!workflow) {
      throw new NotFoundException(
        `Workflow with id ${workflowPublicId} not found`,
      );
    }

    if (
      user &&
      !this.permissionBuilder.canPerformAction(
        user,
        PermissionAction.MANAGE,
        workflow.permissions,
        workflow.created_by,
      )
    ) {
      throw new ForbiddenException(
        'You do not have permission to manage permissions for this workflow',
      );
    }

    return this.workflowRepository.setPermissions(workflow.id, data);
  }

  async deleteWorkflowPermission(
    permissionId: number,
    user?: AuthUser,
  ): Promise<void> {
    if (user && !isAdminUser(user)) {
      const permission: WorkflowPermissionWithRelations | null =
        await this.workflowRepository.findPermissionById(permissionId);

      if (permission) {
        if (
          !this.permissionBuilder.canPerformAction(
            user,
            PermissionAction.MANAGE,
            permission.workflow.permissions,
            permission.workflow.created_by,
          )
        ) {
          throw new ForbiddenException(
            'You do not have permission to delete permissions for this workflow',
          );
        }
      }
    }

    await this.workflowRepository.deletePermission(permissionId);
  }

  async deleteWorkflowPermissionsByQuery(
    workflowPublicId: string,
    query: {
      grantee_type?: string;
      grantee_value?: string;
      action?: string;
    },
    user?: AuthUser,
  ): Promise<Prisma.BatchPayload> {
    const workflow =
      await this.workflowRepository.findWorkflowByPublicId(workflowPublicId);
    if (!workflow) {
      throw new NotFoundException(
        `Workflow with id ${workflowPublicId} not found`,
      );
    }

    if (
      user &&
      !this.permissionBuilder.canPerformAction(
        user,
        PermissionAction.MANAGE,
        workflow.permissions,
        workflow.created_by,
      )
    ) {
      throw new ForbiddenException(
        'You do not have permission to manage permissions for this workflow',
      );
    }

    return this.workflowRepository.deletePermissionsByQuery(workflow.id, query);
  }

  private async validateWorkflowRevision(
    workflowId: string,
    data: CreateWorkflowRevisionDto | UpdateWorkflowVersionDto,
  ) {
    const { status, flow_definition } = data;
    // Check if workflow is bound to a form
    const formId =
      await this.bindingService.findFormIdByWorkflowPublicId(workflowId);
    if (!formId) {
      this.logger.warn(`No binded form Id for flow: ${workflowId}`);
      throw new BadRequestException(
        'Workflow must be bound to a form before creating revisions',
      );
    }

    // Validate flow definition
    if (flow_definition) {
      const flowValidationResult =
        await this.flowValidator.validateFlowDefinition(flow_definition);
      if (!flowValidationResult.isValid) {
        this.logger.warn(
          `Invalid flow definition: ${JSON.stringify(flowValidationResult)}`,
        );
        throw new ValidationError(
          'Invalid flow definition',
          flowValidationResult.errors,
        );
      }
    }

    // Only validate form references if status is ACTIVE or SCHEDULED
    if (status === RevisionState.ACTIVE || status === RevisionState.SCHEDULED) {
      if (!flow_definition) {
        throw new BadRequestException(
          'Cannot activate workflow revision: flow_definition is required',
        );
      }

      const formSchema = await this.formService.findActiveFormSchema(formId);

      // Active form schema is required for ACTIVE/SCHEDULED revisions
      if (!formSchema) {
        throw new BadRequestException(
          'Cannot activate workflow revision: No active form revision found. ' +
            'Please activate a form revision first.',
        );
      }

      // Validate form references
      const formRefsValidationResult =
        this.formReferenceValidator.validateFlowFormReferences(
          flow_definition,
          formSchema,
        );
      if (!formRefsValidationResult.isValid) {
        throw new ValidationError(
          'Invalid form field references',
          formRefsValidationResult.errors,
        );
      }
    }
  }

  getGuaranteedPrecedingNodes(
    flowDefinition: FlowDefinition,
    nodeKey: string,
  ): GuaranteedNodesResponseDto {
    const nodeKeys = this.flowAnalysisService.findGuaranteedPrecedingNodes(
      flowDefinition,
      nodeKey,
    );

    const response = new GuaranteedNodesResponseDto();
    response.nodeKeys = nodeKeys;
    return response;
  }

  getPossiblePrecedingNodes(
    flowDefinition: FlowDefinition,
    nodeKey: string,
  ): PossibleNodesResponseDto {
    const nodeKeys = this.flowAnalysisService.findPossiblePrecedingNodes(
      flowDefinition,
      nodeKey,
    );

    const response = new PossibleNodesResponseDto();
    response.nodeKeys = nodeKeys;
    return response;
  }
}
