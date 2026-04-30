import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { generatePublicId } from '../common/utils/id-generator';
import { ApprovalStatus, Prisma } from '@prisma/client';
import {
  ApprovalTask,
  FormRevision,
  User,
  WorkflowComment,
  WorkflowNode,
  WorkflowRevisions,
  WorkflowInstance,
  WorkflowAction,
  InstanceStatus,
  NodeStatus,
  PriorityLevel,
  PermissionAction,
  InstanceShare,
} from '../common/types/common.types';
import { ApplicationDto, ApplicationInstanceDto } from './dto/application.dto';
import { ApprovalDetailResponseDto } from './dto/approval-detail-response.dto';
import {
  ApplicationsFilterEnum,
  ListApplicationsQueryDto,
} from './dto/list-applications-query.dto';

import { JsonObject } from '@prisma/client/runtime/library';
import { PrismaTransactionClient } from '../prisma/transaction-client.type';
import { ApplicationRepository } from './repositories/application.repository';
import { ApplicationNodesDto } from './dto/application-nodes.dto';
import { WorkflowCommentDto } from './dto/workflow-comment.dto';
import { WorkflowHistoryResponseDto } from './dto/workflow-history-response.dto';
import { SelectableRejectTargetsResponseDto } from './dto/selectable-reject-targets-response.dto';
import {
  FlowDefinition,
  FormSchema,
  FORM_FIELD_TYPES,
} from '../flow-engine/types';
import {
  applyComponentRules,
  resolveComponentRules,
  ResolvedComponentRules,
  ApproverGroupRef,
  VIEWER_ROLE,
} from './utils/component-rule-filter';
import { ListAvailableApplicationsQueryDto } from './dto/list-available-applications-query.dto';
import { ApprovalTaskRepository } from './repositories/approval-task.repository';
import { ApplicationRoutingResponseDto } from './dto/application-routing-response.dto';
import { RoutingBuilder } from '../flow-engine/routing-builder/routing-builder';
import { FlowAnalysisService } from '../flow-engine/analysis/flow-analysis.service';
import { WorkflowInstanceRepository } from './repositories/workflow-instance.repository';
import { FormInstanceRepository } from './repositories/form-instance.repository';
import { WorkflowNodeRepository } from './repositories/workflow-node.repository';
import { WorkflowNodeDto } from './dto/workflow-node.dto';
import { WorkflowInstanceDto } from './dto/workflow-instance.dto';
import { toWorkflowRevisionDto } from '../workflow/dto/workflow-revision.dto';
import { UserDto } from '../user/dto/user.dto';
import { InstanceShareRepository } from './repositories/instance-share.repository';
import {
  CreateInstanceShareDto,
  InstanceShareDto,
  AggregatedInstanceShareDto,
  AggregatedInstanceShareActionDto,
} from './dto/instance-share.dto';

import { CheckDuplicateDto } from './dto/check-duplicate.dto';
import { ValidateFieldsDto } from './dto/validate-fields.dto';
import { ValidateFieldsResponseDto } from './dto/validate-fields-response.dto';
import { ValidationExecutorService } from '../flow-engine/expression-engine/services/validation-executor.service';
import {
  DuplicateCheckResponseDto,
  DuplicateMatchDto,
} from './dto/duplicate-check-response.dto';
import { InstanceDataService } from './instance-data.service';
import {
  FormSchemaResolverService,
  ExpressionEvaluatorService,
} from '../flow-engine/expression-engine';
import {
  PermissionBuilderService,
  ResourcePermission,
} from '../common/permission/permission-builder.service';
import { AuthUser, isAdminUser } from '../auth/types/auth-user';
import { aggregateShares } from '../common/utils/permission-utils';

@Injectable()
export class ApplicationService {
  private readonly logger = new Logger(ApplicationService.name);

  constructor(
    private readonly applicationRepository: ApplicationRepository,
    private readonly approvalTaskRepository: ApprovalTaskRepository,
    private readonly routingBuilder: RoutingBuilder,
    private readonly flowAnalysisService: FlowAnalysisService,
    private readonly workflowInstanceRepository: WorkflowInstanceRepository,
    private readonly formInstanceRepository: FormInstanceRepository,
    private readonly workflowNodeRepository: WorkflowNodeRepository,
    private readonly instanceDataService: InstanceDataService,
    private readonly formSchemaResolverService: FormSchemaResolverService,
    private readonly permissionBuilder: PermissionBuilderService,
    private readonly instanceShareRepository: InstanceShareRepository,
    private readonly validationExecutor: ValidationExecutorService,
    private readonly expressionEvaluator: ExpressionEvaluatorService,
  ) {}

  async createInstanceShare(
    serialNumber: string,
    data: CreateInstanceShareDto,
    user: AuthUser,
  ): Promise<InstanceShareDto> {
    const instance =
      await this.workflowInstanceRepository.findBySerialNumber(serialNumber);
    if (!instance) {
      throw new NotFoundException(
        `Instance with serial number ${serialNumber} not found`,
      );
    }

    await this.checkCanManageShares(instance.id, instance.applicant_id, user);

    return this.instanceShareRepository.create({
      workflow_instance_id: instance.id,
      user_id: data.user_id,
      reason: data.reason,
      created_by: user.id,
      permission: 'VIEW', // Standard permission for sharing
    }) as unknown as Promise<InstanceShareDto>;
  }

  async createInstanceShares(
    serialNumber: string,
    data: CreateInstanceShareDto[],
    user: AuthUser,
  ): Promise<InstanceShareDto[]> {
    const instance =
      await this.workflowInstanceRepository.findBySerialNumber(serialNumber);
    if (!instance) {
      throw new NotFoundException(
        `Instance with serial number ${serialNumber} not found`,
      );
    }

    await this.checkCanManageShares(instance.id, instance.applicant_id, user);

    return this.instanceShareRepository.createMany(
      data.map((s) => ({
        workflow_instance_id: instance.id,
        user_id: s.user_id,
        reason: s.reason,
        created_by: user.id,
        permission: 'VIEW',
      })),
    ) as unknown as Promise<InstanceShareDto[]>;
  }

  async setInstanceShares(
    serialNumber: string,
    data: CreateInstanceShareDto[],
    user: AuthUser,
  ): Promise<InstanceShareDto[]> {
    const instance =
      await this.workflowInstanceRepository.findBySerialNumber(serialNumber);
    if (!instance) {
      throw new NotFoundException(
        `Instance with serial number ${serialNumber} not found`,
      );
    }

    await this.checkCanManageShares(instance.id, instance.applicant_id, user);

    return this.instanceShareRepository.setShares(
      instance.id,
      data.map((s) => ({
        workflow_instance_id: instance.id,
        user_id: s.user_id,
        reason: s.reason,
        created_by: user.id,
        permission: 'VIEW',
      })),
    ) as unknown as Promise<InstanceShareDto[]>;
  }

  async listInstanceShares(
    serialNumber: string,
    user: AuthUser,
  ): Promise<AggregatedInstanceShareDto[]> {
    this.logger.debug(
      `listInstanceShares: user=${user.id}, sn=${serialNumber}`,
    );
    const instance =
      await this.workflowInstanceRepository.findBySerialNumber(serialNumber);
    if (!instance) {
      throw new NotFoundException(
        `Instance with serial number ${serialNumber} not found`,
      );
    }

    await this.checkCanManageShares(instance.id, instance.applicant_id, user);

    const shares = await this.instanceShareRepository.findManyByInstanceId(
      instance.id,
    );
    return aggregateShares<
      InstanceShare,
      AggregatedInstanceShareActionDto,
      AggregatedInstanceShareDto
    >(shares, (s: InstanceShare) => ({
      id: s.id,
      permission: s.permission,
      reason: s.reason ?? undefined,
      created_by: s.created_by,
      created_at: s.created_at,
    }));
  }

  async deleteInstanceShare(shareId: number, user: AuthUser): Promise<void> {
    const share = await this.instanceShareRepository.findById(shareId);
    if (!share) {
      throw new NotFoundException(`Share with id ${shareId} not found`);
    }

    const instance = await this.workflowInstanceRepository.findById(
      share.workflow_instance_id,
    );

    // Only applicant, creator of the share, or admin can delete
    if (
      !isAdminUser(user) &&
      share.created_by !== user.id &&
      instance?.applicant_id !== user.id
    ) {
      throw new ForbiddenException('Not authorized to delete this share');
    }

    await this.instanceShareRepository.delete(shareId);
  }

  async deleteInstanceSharesByQuery(
    serialNumber: string,
    query: { user_id?: number },
    user: AuthUser,
  ): Promise<Prisma.BatchPayload> {
    const instance =
      await this.workflowInstanceRepository.findBySerialNumber(serialNumber);
    if (!instance) {
      throw new NotFoundException(
        `Instance with serial number ${serialNumber} not found`,
      );
    }

    await this.checkCanManageShares(instance.id, instance.applicant_id, user);

    return this.instanceShareRepository.deleteMany(instance.id, query);
  }

  async listAvailableApplications(
    user: AuthUser,
    query?: ListAvailableApplicationsQueryDto,
  ): Promise<{ items: ApplicationDto[]; total: number }> {
    const visibilityWhere =
      this.permissionBuilder.getWorkflowVisibilityWhere(user);
    return this.applicationRepository.listAvailableApplications(
      user.id,
      query,
      visibilityWhere,
    );
  }

  async listApplications(
    user: AuthUser,
    query: ListApplicationsQueryDto,
  ): Promise<{ items: ApplicationInstanceDto[]; total: number }> {
    // 1. Handle Approving Filters (Inbox / Archive)
    if (query.filter === ApplicationsFilterEnum.APPROVING) {
      return this.applicationRepository.listApprovingApplicationInstances(
        user.id,
        query,
      );
    }

    // 2. Determine Visibility Scope for Sent Box / Shared Box / Admin View
    let visibilityWhere: Prisma.WorkflowInstanceWhereInput;

    switch (query.filter) {
      case ApplicationsFilterEnum.ALL:
        if (!isAdminUser(user)) {
          throw new ForbiddenException('Only admins can view all applications');
        }
        visibilityWhere = {}; // Unrestricted view for admins
        break;

      case ApplicationsFilterEnum.SHARED:
        visibilityWhere = {
          instance_shares: {
            some: { user_id: user.id },
          },
        };
        break;

      case ApplicationsFilterEnum.VISIBLE:
        visibilityWhere =
          this.permissionBuilder.getInstanceVisibilityWhere(user);
        break;

      case ApplicationsFilterEnum.SUBMITTED:
      default:
        visibilityWhere = { applicant_id: user.id };
        break;
    }

    return this.applicationRepository.listSubmittedApplicationInstances(
      user.id,
      query,
      visibilityWhere,
    );
  }

  async findLatestApplicationRevision(workflowId: number, formId: number) {
    return this.applicationRepository.findLatestApplicationRevision(
      workflowId,
      formId,
    );
  }

  async findFormInstance(serial_number: string) {
    return this.applicationRepository.findFormInstance(serial_number);
  }

  canUseWorkflow(
    user: AuthUser,
    permissions: ResourcePermission[],
    creatorId: number,
  ) {
    return this.permissionBuilder.canPerformAction(
      user,
      PermissionAction.USE,
      permissions,
      creatorId,
    );
  }

  async updateFormData(
    instanceId: number,
    formData: JsonObject,
    userId: number,
    tx?: PrismaTransactionClient,
  ) {
    const updatedForm = await this.applicationRepository.updateFormData(
      instanceId,
      formData,
      userId,
      tx,
    );

    // Create a new snapshot
    await this.instanceDataService.createFormInstanceSnapshot(
      {
        form_instance_id: instanceId,
        data: formData,
        created_by: userId,
      },
      tx,
    );

    return updatedForm;
  }

  /**
   * Execute all expression components in a form schema and merge results into formData.
   * - Success → store computed value
   * - Failure → store null, log warn
   * - Frontend value differs → log warn, use backend result
   */
  async executeExpressionComponents(
    formSchema: FormSchema,
    formData: Record<string, unknown>,
    context: {
      formData: Record<string, unknown>;
      applicantId: number;
      workflowInstanceId?: number;
    },
  ): Promise<Record<string, unknown>> {
    const updatedFormData = { ...formData };

    for (const [, entity] of Object.entries(formSchema?.entities || {})) {
      if (entity.type !== FORM_FIELD_TYPES.EXPRESSION) {
        continue;
      }

      const expression = entity.attributes?.expression;
      const componentName = entity.attributes?.name;
      if (!expression || !componentName) {
        continue;
      }

      let computedValue: unknown = null;

      try {
        const result = await this.expressionEvaluator.evaluate(
          expression,
          context,
        );

        if (result.success) {
          computedValue = result.value;
        } else {
          this.logger.warn(
            `Expression component "${componentName}" execution failed: ${result.error}. Storing null.`,
          );
        }
      } catch (error) {
        this.logger.warn(
          `Expression component "${componentName}" execution threw: ${error}. Storing null.`,
        );
      }

      // Compare with frontend value if present
      if (componentName in formData) {
        const frontendValue = formData[componentName];
        if (JSON.stringify(frontendValue) !== JSON.stringify(computedValue)) {
          this.logger.warn(
            `Expression component "${componentName}": frontend value differs from backend. ` +
              `Frontend: ${JSON.stringify(frontendValue)}, Backend: ${JSON.stringify(computedValue)}. Using backend result.`,
          );
        }
      }

      updatedFormData[componentName] = computedValue;
    }

    return updatedFormData;
  }

  async createInstanceData(
    formRevision: FormRevision,
    formData: JsonObject,
    workflowRevision: WorkflowRevisions,
    applicantId: number,
    submitterId: number,
    priority: PriorityLevel,
    tx?: PrismaTransactionClient,
  ) {
    const serial_number =
      await this.workflowInstanceRepository.generateSerialNumber(
        workflowRevision.workflow_id,
        new Date(),
        tx,
      );

    // 1. Create ApplicationInstance first (required by FK constraint)
    await this.applicationRepository.createApplicationInstance(
      {
        serial_number: serial_number,
      },
      tx,
    );

    // 2. Create WorkflowInstance
    const workflowInstance =
      await this.workflowInstanceRepository.createWithRelations(
        {
          public_id: generatePublicId(),
          serial_number: serial_number,
          revision_id: workflowRevision.id,
          applicant_id: applicantId,
          submitter_id: submitterId,
          status: InstanceStatus.DRAFT,
          priority: priority,
        },
        tx,
      );

    // 2a. On-behalf submission: auto-grant the submitter view access via a
    // share owned by the applicant, so the submitter sees the application
    // through the APPLICANT viewer role (not APPROVER).
    if (applicantId !== submitterId) {
      await this.instanceShareRepository.create(
        {
          workflow_instance_id: workflowInstance.id,
          user_id: submitterId,
          permission: PermissionAction.VIEW,
          reason: 'Auto-shared on behalf submission',
          created_by: applicantId,
        },
        tx,
      );
    }

    // 3. Create FormInstance
    const formInstance = await this.formInstanceRepository.createWithRelations(
      {
        public_id: generatePublicId(),
        serial_number: serial_number,
        revision_id: formRevision.id,
        updated_by: submitterId,
        workflow_instance_id: workflowInstance.id,
      },
      tx,
    );

    // 4. Create initial snapshot and event
    await this.instanceDataService.createFormInstanceSnapshot(
      {
        form_instance_id: formInstance.id,
        data: formData,
        created_by: submitterId,
      },
      tx,
    );

    await this.instanceDataService.updateWorkflowInstanceWithEvent(
      workflowInstance.id,
      {}, // No additional fields to update on instance
      {
        event_type: WorkflowAction.UPDATE,
        status_after: InstanceStatus.DRAFT,
        actor_id: submitterId,
      },
      tx,
    );

    return { workflowInstance, formInstance };
  }

  async findWorkflowInstanceWithRevision(
    serialNumber: string,
    status?: InstanceStatus,
    tx?: PrismaTransactionClient,
  ) {
    return this.workflowInstanceRepository.findBySerialNumberWithRevision(
      serialNumber,
      status,
      tx,
    );
  }

  async findWorkflowInstanceById(id: number, tx?: PrismaTransactionClient) {
    return this.workflowInstanceRepository.findById(id, tx);
  }

  async findWorkflowInstanceWithDetails(
    id: number,
    tx?: PrismaTransactionClient,
  ) {
    return this.workflowInstanceRepository.findWithDetails(id, tx);
  }

  async updateWorkflowInstance(
    id: number,
    data: Prisma.WorkflowInstanceUncheckedUpdateInput,
    tx?: PrismaTransactionClient,
  ) {
    return this.workflowInstanceRepository.update(
      id,
      data as Partial<WorkflowInstance>,
      tx,
    );
  }

  async findFormInstanceByWorkflowId(
    workflowInstanceId: number,
    tx?: PrismaTransactionClient,
  ) {
    return this.formInstanceRepository.findByWorkflowInstanceId(
      workflowInstanceId,
      tx,
    );
  }

  async deleteInstanceData(
    serialNumber: string,
    workflowInstanceId: number,
    tx?: PrismaTransactionClient,
  ) {
    // Delete workflow nodes (will cascade delete ApprovalTask and WorkflowComment)
    await this.workflowNodeRepository.deleteManyByInstanceId(
      workflowInstanceId,
      tx,
    );

    // Delete form instance
    await this.formInstanceRepository.deleteManyBySerialNumber(
      serialNumber,
      tx,
    );

    // Delete workflow instance
    await this.workflowInstanceRepository.delete(workflowInstanceId, tx);

    // Delete application instance (root entity)
    await this.applicationRepository.deleteApplicationInstance(
      serialNumber,
      tx,
    );
  }

  async getFormInstanceBySerialNumber(serial_number: string) {
    return this.formInstanceRepository.findBySerialNumberWithDetails(
      serial_number,
    );
  }

  async getApplicationInstance(
    serial_number: string,
    user: AuthUser,
  ): Promise<ApplicationInstanceDto> {
    const visibilityWhere =
      this.permissionBuilder.getInstanceVisibilityWhere(user);
    const instance =
      await this.formInstanceRepository.findBySerialNumberWithDetails(
        serial_number,
        visibilityWhere,
      );
    if (!instance) {
      // Check if it exists at all to distinguish between 404 and 403
      const exists =
        await this.formInstanceRepository.findBySerialNumberWithDetails(
          serial_number,
        );
      if (exists) {
        throw new ForbiddenException(
          `You do not have permission to view application instance: ${serial_number}`,
        );
      }
      throw new NotFoundException(
        `Application instance with serial number: ${serial_number} not found`,
      );
    }
    const workflowNodes =
      await this.workflowNodeRepository.findBySerialNumberWithTasks(
        serial_number,
      );
    const nodes = workflowNodes.map((node) => WorkflowNodeDto.fromPrisma(node));
    if (!instance.workflow_instance.revision.workflow) {
      throw new Error('workflow not found!');
    }
    const workflowInstance = WorkflowInstanceDto.fromPrisma(
      instance.workflow_instance,
      toWorkflowRevisionDto(
        instance.workflow_instance.revision.workflow,
        instance.workflow_instance.revision,
      ),
      UserDto.fromPrisma(instance.workflow_instance.applicant),
      UserDto.fromPrisma(instance.workflow_instance.submitter),
      undefined, // Withdrawer no longer exists as direct field
    );
    const flowInstance = {
      ...workflowInstance,
      nodes,
    };
    const latestSnapshot = instance.data_history?.[0];
    const formData = (latestSnapshot?.data ?? {}) as Record<string, any>;
    const routing = await this.routingBuilder.build(
      serial_number,
      flowInstance,
      formData,
      instance.workflow_instance.id,
    );
    const myNodes = nodes.filter((node) =>
      node.approvals.some(
        (approval) =>
          approval.assignee_id === user.id || approval.escalated_to === user.id,
      ),
    );

    // Resolve form schema references
    const originalSchema = instance.form_revision
      .form_schema as unknown as FormSchema;
    if (originalSchema) {
      const resolvedSchema =
        await this.formSchemaResolverService.resolveFormSchema(originalSchema, {
          formData,
          applicantId: instance.workflow_instance.applicant_id,
          workflowInstanceId: instance.workflow_instance.id,
        });
      // Replace form_schema with resolved schema
      (
        instance.form_revision as unknown as { form_schema: FormSchema }
      ).form_schema = resolvedSchema;
    }

    return ApplicationInstanceDto.fromPrisma(
      instance as Parameters<typeof ApplicationInstanceDto.fromPrisma>[0],
      myNodes,
      routing,
    );
  }

  async getApplicationInstanceWithRules(
    serial_number: string,
    user: AuthUser,
  ): Promise<ApplicationInstanceDto> {
    const appInstance = await this.getApplicationInstance(serial_number, user);

    // Get flow definition (needed for all cases: start node rules)
    const workflowInstance =
      await this.workflowInstanceRepository.findBySerialNumberWithRevision(
        serial_number,
      );
    if (!workflowInstance) return appInstance;

    const flowDefinition = workflowInstance.revision
      .flow_definition as unknown as FlowDefinition;
    if (!flowDefinition) return appInstance;

    // Determine viewer role + which approver groups the viewer belongs to
    const role = await this.determineViewerRole(
      user,
      appInstance,
      workflowInstance,
      serial_number,
    );

    const rules = resolveComponentRules(
      flowDefinition,
      role.viewerRole,
      role.myApproverGroups,
    );
    this.applyComponentRulesFilter(appInstance, rules);

    return appInstance;
  }

  private async determineViewerRole(
    user: AuthUser,
    appInstance: ApplicationInstanceDto,
    workflowInstance: { id: number; applicant_id: number },
    serialNumber: string,
  ): Promise<{
    viewerRole: (typeof VIEWER_ROLE)[keyof typeof VIEWER_ROLE];
    myApproverGroups: ApproverGroupRef[];
  }> {
    if (isAdminUser(user)) {
      return { viewerRole: VIEWER_ROLE.ADMIN, myApproverGroups: [] };
    }

    const isDraft =
      appInstance.workflow_instance.status === InstanceStatus.DRAFT;
    const isApplicant = workflowInstance.applicant_id === user.id;

    // Check shares
    const allShares = await this.instanceShareRepository.findManyByInstanceId(
      workflowInstance.id,
    );
    const userShares = allShares.filter((s) => s.user_id === user.id);
    const isApplicantShared = userShares.some(
      (s) => s.created_by === workflowInstance.applicant_id,
    );

    if (isApplicant || isApplicantShared) {
      return {
        viewerRole: isDraft
          ? VIEWER_ROLE.APPLICANT_DRAFT
          : VIEWER_ROLE.APPLICANT,
        myApproverGroups: [],
      };
    }

    // Approver / share from approver — collect (nodeKey, groupIndex) pairs
    // from tasks assigned to the viewer (or to any sharer whose shares
    // reach the viewer).
    const myGroups: ApproverGroupRef[] = [];
    const seen = new Map<string, Set<number>>();
    const addGroup = (nodeKey: string, groupIndex: number) => {
      let indices = seen.get(nodeKey);
      if (!indices) {
        indices = new Set<number>();
        seen.set(nodeKey, indices);
      }
      if (indices.has(groupIndex)) return;
      indices.add(groupIndex);
      myGroups.push({ nodeKey, groupIndex });
    };

    for (const node of appInstance.workflow_nodes ?? []) {
      for (const task of node.approvals) {
        if (task.assignee_id === user.id || task.escalated_to === user.id) {
          addGroup(node.node_key, task.approver_group_index);
        }
      }
    }

    if (userShares.length > 0) {
      const allNodes =
        await this.workflowNodeRepository.findBySerialNumberWithTasks(
          serialNumber,
        );
      const sharerIds = new Set(userShares.map((s) => s.created_by));

      for (const node of allNodes) {
        for (const task of node.approval_tasks) {
          if (
            sharerIds.has(task.assignee_id) ||
            (task.escalated_to && sharerIds.has(task.escalated_to))
          ) {
            addGroup(node.node_key, task.approver_group_index);
          }
        }
      }
    }

    return {
      viewerRole: VIEWER_ROLE.APPROVER,
      myApproverGroups: myGroups,
    };
  }

  async getApprovalDetailWithRules(
    approval_task_id: string,
    user: AuthUser,
  ): Promise<ApprovalDetailResponseDto> {
    const { serialNumber, approvalTask, workflowNode, comments } =
      await this.getApprovalDetail(approval_task_id);
    const appInstance = await this.getApplicationInstance(serialNumber, user);

    const workflowInstance =
      await this.workflowInstanceRepository.findBySerialNumberWithRevision(
        serialNumber,
      );
    if (workflowInstance) {
      const flowDefinition = workflowInstance.revision
        .flow_definition as unknown as FlowDefinition;
      if (flowDefinition) {
        // APPROVER_ACTIVE applies only while the task is still PENDING. Once
        // the task is closed, resolve the viewer's role the same way as the
        // generic application detail endpoint — which yields APPROVER (or
        // APPLICANT, ADMIN, etc.) and the matching read-only ruleset.
        let rules: ResolvedComponentRules;
        if (approvalTask.status === ApprovalStatus.PENDING) {
          rules = resolveComponentRules(
            flowDefinition,
            VIEWER_ROLE.APPROVER_ACTIVE,
            [
              {
                nodeKey: workflowNode.node_key,
                groupIndex: approvalTask.approver_group_index,
              },
            ],
          );
        } else {
          const role = await this.determineViewerRole(
            user,
            appInstance,
            workflowInstance,
            serialNumber,
          );
          rules = resolveComponentRules(
            flowDefinition,
            role.viewerRole,
            role.myApproverGroups,
          );
        }
        this.applyComponentRulesFilter(appInstance, rules);
      }
    }

    return ApprovalDetailResponseDto.fromPrisma(
      appInstance,
      approvalTask,
      workflowNode,
      comments,
    );
  }

  async getApplicationRouting(
    serialNumber: string,
    user: AuthUser,
  ): Promise<ApplicationRoutingResponseDto> {
    const visibilityWhere =
      this.permissionBuilder.getInstanceVisibilityWhere(user);
    const instance = await this.workflowInstanceRepository.findBySerialNumber(
      serialNumber,
      visibilityWhere,
    );

    if (!instance) {
      const exists =
        await this.workflowInstanceRepository.findBySerialNumber(serialNumber);
      if (exists) {
        throw new ForbiddenException(
          `You do not have permission to view routing for application instance: ${serialNumber}`,
        );
      }
      throw new NotFoundException(
        `Application instance with serial number: ${serialNumber} not found`,
      );
    }

    const { flowInstance, formData, workflowInstanceId } =
      await this.applicationRepository.getApplicationInstance(serialNumber);
    const routing = await this.routingBuilder.build(
      serialNumber,
      flowInstance,
      formData,
      workflowInstanceId,
    );
    return {
      serial_number: serialNumber,
      overall_status: flowInstance.status,
      routing,
    };
  }

  async getApprovalDetail(approval_task_id: string): Promise<{
    serialNumber: string;
    approvalTask: ApprovalTask;
    workflowNode: WorkflowNode & { approval_tasks: ApprovalTask[] };
    comments: (WorkflowComment & { author: User })[];
  }> {
    const result =
      await this.approvalTaskRepository.findByUuid(approval_task_id);
    if (!result) {
      throw new NotFoundException(
        `Not Approval Found with task id = ${approval_task_id}`,
      );
    }
    return {
      serialNumber: result.serial_number,
      approvalTask: result.approval_task,
      workflowNode: result.workflow_node,
      comments: result.comments,
    };
  }

  async getApplicationNodes(
    serial_number: string,
    user: AuthUser,
  ): Promise<ApplicationNodesDto[]> {
    const visibilityWhere =
      this.permissionBuilder.getInstanceVisibilityWhere(user);
    const instance = await this.workflowInstanceRepository.findBySerialNumber(
      serial_number,
      visibilityWhere,
    );

    if (!instance) {
      const exists =
        await this.workflowInstanceRepository.findBySerialNumber(serial_number);
      if (exists) {
        throw new ForbiddenException(
          `You do not have permission to view nodes for application instance: ${serial_number}`,
        );
      }
      throw new NotFoundException(
        `Application instance with serial number: ${serial_number} not found`,
      );
    }

    return this.applicationRepository.getApplicationNodes(serial_number);
  }

  async getApplicationComments(
    serial_number: string,
    user: AuthUser,
  ): Promise<WorkflowCommentDto[]> {
    const visibilityWhere =
      this.permissionBuilder.getInstanceVisibilityWhere(user);
    const instance = await this.workflowInstanceRepository.findBySerialNumber(
      serial_number,
      visibilityWhere,
    );

    if (!instance) {
      const exists =
        await this.workflowInstanceRepository.findBySerialNumber(serial_number);
      if (exists) {
        throw new ForbiddenException(
          `You do not have permission to view comments for application instance: ${serial_number}`,
        );
      }
      throw new NotFoundException(
        `Application instance with serial number: ${serial_number} not found`,
      );
    }

    return this.applicationRepository.getApplicationComments(serial_number);
  }

  async getApplicationWorkflowHistory(
    serial_number: string,
    user: AuthUser,
  ): Promise<WorkflowHistoryResponseDto> {
    const visibilityWhere =
      this.permissionBuilder.getInstanceVisibilityWhere(user);
    const instance = await this.workflowInstanceRepository.findBySerialNumber(
      serial_number,
      visibilityWhere,
    );

    if (!instance) {
      const exists =
        await this.workflowInstanceRepository.findBySerialNumber(serial_number);
      if (exists) {
        throw new ForbiddenException(
          `You do not have permission to view history for application instance: ${serial_number}`,
        );
      }
      throw new NotFoundException(
        `Application instance with serial number: ${serial_number} not found`,
      );
    }

    const history =
      await this.applicationRepository.getApplicationWorkflowHistory(
        serial_number,
      );

    const response = new WorkflowHistoryResponseDto();
    response.serial_number = serial_number;
    response.history = history;

    return response;
  }

  async getSelectableRejectTargets(
    serial_number: string,
    node_key: string,
    user: AuthUser,
  ): Promise<SelectableRejectTargetsResponseDto> {
    const visibilityWhere =
      this.permissionBuilder.getInstanceVisibilityWhere(user);
    const instance_check =
      await this.workflowInstanceRepository.findBySerialNumber(
        serial_number,
        visibilityWhere,
      );

    if (!instance_check) {
      const exists =
        await this.workflowInstanceRepository.findBySerialNumber(serial_number);
      if (exists) {
        throw new ForbiddenException(
          `You do not have permission to access application instance: ${serial_number}`,
        );
      }
      throw new NotFoundException(
        `Application instance with serial number ${serial_number} not found`,
      );
    }

    // Get application instance with flow definition
    const { flowInstance } =
      await this.applicationRepository.getApplicationInstance(serial_number);

    if (!flowInstance) {
      throw new NotFoundException(
        `Application instance with serial number ${serial_number} not found`,
      );
    }

    // Get all nodes for this application instance
    const applicationNodes =
      await this.applicationRepository.getApplicationNodes(serial_number);

    if (!applicationNodes || applicationNodes.length === 0) {
      throw new NotFoundException(
        `No workflow nodes found for application ${serial_number}`,
      );
    }

    // Collect all node keys that have been completed
    // Only nodes with workflow_node entities (excludes CONDITION nodes)
    const completedNodeKeys = new Set<string>();

    applicationNodes.forEach((appNode) => {
      appNode.workflowNodes.forEach((node) => {
        // Include nodes that have been completed
        if (node.status === NodeStatus.COMPLETED) {
          completedNodeKeys.add(node.node_key);
        }
      });
    });

    // Get flow definition
    const flowDefinition = flowInstance.revision
      .flow_definition as unknown as FlowDefinition;

    // Use flow analysis service to find selectable nodes
    // The service will infer CONDITION nodes and calculate selectable targets
    const selectableNodes =
      this.flowAnalysisService.findSelectableRejectTargets(
        flowDefinition,
        Array.from(completedNodeKeys),
        node_key,
      );

    const response = new SelectableRejectTargetsResponseDto();
    response.nodeKeys = selectableNodes;
    return response;
  }

  async validateFields(
    dto: ValidateFieldsDto,
    applicantId: number,
  ): Promise<ValidateFieldsResponseDto> {
    const fieldValue = dto.currentField
      ? (dto.formData?.[dto.currentField] ?? null)
      : null;

    const result = await this.validationExecutor.executeValidators(
      dto.codes?.map((c) => ({ code: c.code, errorMessage: c.errorMessage })),
      dto.registryIds,
      fieldValue,
      {
        formData: dto.formData,
        applicantId,
      },
      dto.formValidators?.map((v) => ({
        code: v.code,
        errorMessage: v.errorMessage,
      })),
    );

    return new ValidateFieldsResponseDto({
      isValid: result.isValid,
      message: result.isValid ? 'Validation passed' : 'Validation failed',
      errors: result.errors,
    });
  }

  async checkDuplicate(
    dto: CheckDuplicateDto,
  ): Promise<DuplicateCheckResponseDto> {
    const formId = await this.formInstanceRepository.findFormIdByPublicId(
      dto.formId,
    );

    if (!formId) {
      throw new NotFoundException(`Form "${dto.formId}" not found`);
    }

    const rows = await this.formInstanceRepository.findDuplicatesByFieldValue(
      formId,
      dto.fieldName,
      String(dto.fieldValue),
    );

    const matches = rows.map(
      (row) =>
        new DuplicateMatchDto({
          serialNumber: row.serial_number,
          applicantId: row.applicant_id,
          applicantName: row.applicant_name,
          status: row.status,
          submittedAt: row.submitted_at.getTime(),
        }),
    );

    return new DuplicateCheckResponseDto(matches);
  }

  private async checkCanManageShares(
    instanceId: number,
    applicantId: number,
    user: AuthUser,
  ): Promise<void> {
    if (isAdminUser(user)) return;
    if (applicantId === user.id) return;

    const isApprover = await this.instanceDataService.isUserInvolvedAsApprover(
      instanceId,
      user.id,
    );
    if (isApprover) return;

    throw new ForbiddenException(
      'Only the applicant, admin, or involved approvers can manage shares for this instance',
    );
  }

  private applyComponentRulesFilter(
    appInstance: ApplicationInstanceDto,
    rules: ResolvedComponentRules,
  ): void {
    const formSchema = appInstance.form_instance.revision
      .form_schema as unknown as FormSchema;
    const formData = appInstance.form_instance.form_data as Record<
      string,
      unknown
    >;
    if (!formSchema) return;

    const { filteredSchema, filteredData } = applyComponentRules(
      formSchema,
      formData,
      rules.hiddenNames,
      rules.editableNames,
      rules.disableNames,
      rules.requiredNames,
    );

    (
      appInstance.form_instance.revision as { form_schema: unknown }
    ).form_schema = filteredSchema;
    (appInstance.form_instance as { form_data: unknown }).form_data =
      filteredData;
  }
}
