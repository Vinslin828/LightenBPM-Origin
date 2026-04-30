import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import {
  FormRevision,
  WorkflowRevisions,
  ApprovalStatus,
  InstanceStatus,
  NodeResult,
  NodeStatus,
  PriorityLevel,
  WorkflowAction,
} from '../common/types/common.types';
import { JsonObject } from '@prisma/client/runtime/library';
import {
  ApprovalRequestDto,
  ApprovalRequest,
  ApprovalResponseDto,
} from '../instance/dto/approval-types.dto';
import { PrismaTransactionClient } from '../prisma/transaction-client.type';
import {
  WorkflowExecutorService,
  ExecutionStatus,
} from './execution/workflow-executor.service';
import {
  FlowDefinition,
  FormSchema,
  FormValidation,
  ApprovalNode,
  ApprovalMethod,
  ApprovalLogic,
} from './types';
import { RoutingBuilder } from './routing-builder/routing-builder';
import { requiresAllApprovers } from './shared/flow/flow-utils';
import {
  ExpressionEvaluatorService,
  ExecutionContext,
} from './expression-engine';
import { WorkflowInstanceWithRelations } from '../instance/repositories/workflow-instance.repository';
import { FormInstanceWithRelations } from '../instance/repositories/form-instance.repository';
import { UserService } from '../user/user.service';
import { TransactionService } from '../prisma/transaction.service';
import { ApplicationService } from '../instance/application.service';
import { ApplicationInstanceDto } from '../instance/dto/application.dto';
import { WorkflowInstanceDto } from '../instance/dto/workflow-instance.dto';
import { WorkflowNodeDto } from '../instance/dto/workflow-node.dto';
import { AuthUser, isAdminUser } from '../auth/types/auth-user';
import { UserDto } from '../user/dto/user.dto';
import { toWorkflowRevisionDto } from '../workflow/dto/workflow-revision.dto';
import { InstanceDataService } from '../instance/instance-data.service';
import { FormDataValidatorService } from './validation/form-data/form-data-validator.service';
import { ValidationExecutorService } from './expression-engine/services/validation-executor.service';
import {
  resolveComponentRules,
  VIEWER_ROLE,
  ApproverGroupRef,
} from '../instance/utils/component-rule-filter';
import {
  ApprovalContext,
  ApprovalTransactionResult,
} from './types/approval-context.types';
import { AutoApproveService } from './execution/auto-approve.service';
import { RejectionHandlerService } from './rejection/rejection-handler.service';
import { ApprovalNotificationService } from './notification/approval-notification.service';

/**
 * Result of createInstance operation
 * Types are imported from repositories to maintain proper layering
 */
interface CreateInstanceResult {
  workflowInstance: WorkflowInstanceWithRelations;
  formInstance: FormInstanceWithRelations;
}

@Injectable()
export class WorkflowEngineService {
  private readonly logger = new Logger(WorkflowEngineService.name);

  constructor(
    private readonly transactionService: TransactionService,
    private readonly workflowExecutor: WorkflowExecutorService,
    private readonly routingBuilder: RoutingBuilder,
    private readonly instanceDataService: InstanceDataService,
    private readonly userService: UserService,
    private readonly applicationService: ApplicationService,
    private readonly expressionEvaluator: ExpressionEvaluatorService,
    private readonly formDataValidator: FormDataValidatorService,
    private readonly validationExecutor: ValidationExecutorService,
    private readonly autoApproveService: AutoApproveService,
    private readonly rejectionHandler: RejectionHandlerService,
    private readonly approvalNotification: ApprovalNotificationService,
  ) {}

  /**
   * Validates approval request and gathers necessary context
   * @returns ApprovalContext containing all necessary data for processing
   */
  private async validateApprovalRequest(
    serial_number: string,
    approvalRequest: ApprovalRequestDto,
    userId: number,
  ): Promise<ApprovalContext> {
    // Step 1: Find workflow instance by serial number with revision
    const workflowInstance =
      await this.applicationService.findWorkflowInstanceWithRevision(
        serial_number,
        InstanceStatus.RUNNING,
      );

    if (!workflowInstance) {
      throw new NotFoundException(
        `Workflow instance with serial number ${serial_number} not found or not running.`,
      );
    }

    // Step 2: Find approval task by approval_id (approval task's public_id)
    const targetApprovalTask =
      await this.instanceDataService.findApprovalTaskByPublicIdWithNode(
        approvalRequest.approval_id,
      );

    if (!targetApprovalTask) {
      throw new NotFoundException(
        `Approval task with ID ${approvalRequest.approval_id} not found.`,
      );
    }

    // Step 3: Verify the task belongs to the current user and is PENDING
    if (targetApprovalTask.assignee_id !== userId) {
      throw new ForbiddenException(
        `Approval task ${approvalRequest.approval_id} does not belong to user ${userId}.`,
      );
    }

    if (targetApprovalTask.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException(
        `Approval task ${approvalRequest.approval_id} is not in PENDING status (current status: ${targetApprovalTask.status}).`,
      );
    }

    const targetWorkflowNode = targetApprovalTask.workflow_node;

    // Step 4: Verify the workflow node belongs to the current workflow instance
    if (targetWorkflowNode.instance_id !== workflowInstance.id) {
      throw new ForbiddenException(
        `Approval task does not belong to workflow instance ${serial_number}.`,
      );
    }

    // Step 5: Get approval node configuration from flow definition
    const flowDefinition = workflowInstance.revision
      .flow_definition as unknown as FlowDefinition;
    const approvalNodeConfig = flowDefinition.nodes.find(
      (node) => node.key === targetWorkflowNode.node_key,
    ) as ApprovalNode | undefined;

    if (!approvalNodeConfig) {
      throw new NotFoundException(
        `Approval node configuration not found for node key ${targetWorkflowNode.node_key}.`,
      );
    }

    return {
      workflowInstance,
      targetApprovalTask,
      targetWorkflowNode,
      approvalNodeConfig,
    };
  }

  /**
   * Validates, merges, and coerces approver-submitted form data.
   * Only editable fields (per component_rules) are applied on top of existing form data.
   */
  private async validateAndMergeApproverFormData(
    serial_number: string,
    submittedFormData: Record<string, any>,
    context: ApprovalContext,
  ): Promise<{ coercedFormData: Record<string, any>; formInstanceId: number }> {
    // 1. Load form instance
    const formInstance =
      await this.applicationService.findFormInstance(serial_number);
    if (!formInstance) {
      throw new NotFoundException(
        `Form instance not found for serial number ${serial_number}`,
      );
    }

    const formSchema = formInstance.form_revision
      .form_schema as unknown as FormSchema;
    const feValidation = formInstance.form_revision
      .fe_validation as unknown as FormValidation | null;
    const existingFormData =
      (formInstance.data_history[0]?.data as Record<string, unknown>) ?? {};

    // 2. Get editable/required fields for this approver
    const flowDefinition = context.workflowInstance.revision
      .flow_definition as unknown as FlowDefinition;
    const approverGroup: ApproverGroupRef = {
      nodeKey: context.targetWorkflowNode.node_key,
      groupIndex: context.targetApprovalTask.approver_group_index,
    };
    const rules = resolveComponentRules(
      flowDefinition,
      VIEWER_ROLE.APPROVER_ACTIVE,
      [approverGroup],
    );

    // 3. Merge: only overwrite editable fields
    const merged: Record<string, unknown> = { ...existingFormData };
    const editableSet = new Set(rules.editableNames);
    for (const name of editableSet) {
      if (name in submittedFormData) {
        merged[name] = submittedFormData[name] as unknown;
      }
    }

    // 4. Validate and coerce
    const requiredFieldNames = new Set(rules.requiredNames);
    const validationResult = this.formDataValidator.validateAndCoerceFormData(
      flowDefinition,
      formSchema,
      merged,
      requiredFieldNames,
    );
    if (!validationResult.isValid) {
      throw new BadRequestException({
        message: 'Form data validation failed',
        errors: validationResult.errors,
      });
    }

    let coercedData = validationResult.coercedData!;

    // 5. Execute expression validators
    const validatorResult = await this.validationExecutor.execute(
      formSchema,
      feValidation,
      {
        formData: coercedData,
        applicantId: context.workflowInstance.applicant_id,
        workflowInstanceId: context.workflowInstance.id,
      },
    );
    if (!validatorResult.isValid) {
      throw new BadRequestException({
        message: validatorResult.message || 'Form validation failed',
        errors: validatorResult.errors,
      });
    }

    // 6. Execute expression components
    coercedData = await this.applicationService.executeExpressionComponents(
      formSchema,
      coercedData,
      {
        formData: coercedData,
        applicantId: context.workflowInstance.applicant_id,
        workflowInstanceId: context.workflowInstance.id,
      },
    );

    return { coercedFormData: coercedData, formInstanceId: formInstance.id };
  }

  /**
   * Handles approval - checks for sequential/parallel logic
   */
  private async handleApproval(
    tx: PrismaTransactionClient,
    context: ApprovalContext,
    approvalTaskId: number,
  ): Promise<ApprovalTransactionResult> {
    this.logger.debug('handleApproval');
    const { targetWorkflowNode, targetApprovalTask, approvalNodeConfig } =
      context;

    const systemUserId = await this.getSystemUserId(); // Retrieve system user ID

    // Check if there are WAITING tasks in the same group (sequential approval like reporting_line)
    const waitingTasksInSameGroup =
      await this.instanceDataService.findWaitingApprovalTasksInGroup(
        targetWorkflowNode.id,
        targetApprovalTask.approver_group_index,
        tx,
      );

    this.logger.debug(
      `waiting tasks in same group: ${waitingTasksInSameGroup.length}`,
    );
    if (waitingTasksInSameGroup.length > 0) {
      // Sequential approval (reporting_line) - promote next WAITING task
      const nextTask = waitingTasksInSameGroup[0];

      // Check if auto-approval is enabled
      const reusePriorApprovals =
        this.autoApproveService.resolveReusePriorApprovals(
          approvalNodeConfig,
          targetApprovalTask.approver_group_index,
        );

      let shouldAutoApprove = false;
      if (reusePriorApprovals) {
        const priorApproval = await this.instanceDataService.findPriorApproval(
          context.workflowInstance.id,
          nextTask.assignee_id,
          tx,
        );
        shouldAutoApprove = !!priorApproval;
      }

      if (shouldAutoApprove) {
        this.logger.debug(
          `auto approve waiting tasks: ${JSON.stringify(nextTask)}`,
        );
        const autoApprovedTask = await this.autoApproveService.autoApproveTask(
          nextTask.id,
          context.workflowInstance.serial_number,
          nextTask.assignee_id,
          systemUserId,
          tx,
        );

        // Recursively process the next task (continue the chain)
        // Expression runs after recursive call so WAITING→PENDING promotion is visible
        const result = await this.handleApproval(
          tx,
          context,
          autoApprovedTask.id,
        );
        await this.executeNodeExpression(context, tx);
        return result;
      } else {
        this.logger.debug(
          `set waiting tasks to pending: ${JSON.stringify(nextTask)}`,
        );
        // Regular promotion to PENDING
        const updatedTask = await this.instanceDataService.updateApprovalTask(
          nextTask.id,
          { status: ApprovalStatus.PENDING },
          tx,
        );

        // Send notification for the newly PENDING task
        await this.approvalNotification.notifyTaskPending(updatedTask, context);

        // Execute expression after WAITING→PENDING promotion
        await this.executeNodeExpression(context, tx);

        return {
          taskStatus: ApprovalStatus.APPROVED,
          nodeCompleted: false,
        };
      }
    }

    // No WAITING tasks in this group - check if there are other PENDING tasks in the same group
    const otherPendingTasksInSameGroup =
      await this.instanceDataService.countPendingApprovalTasksInGroup(
        targetWorkflowNode.id,
        targetApprovalTask.approver_group_index,
        tx,
      );

    const groupApproverConfig =
      approvalNodeConfig.approval_method === ApprovalMethod.SINGLE
        ? approvalNodeConfig.approvers
        : approvalNodeConfig.approvers[targetApprovalTask.approver_group_index];

    if (
      otherPendingTasksInSameGroup > 0 &&
      groupApproverConfig &&
      !requiresAllApprovers(groupApproverConfig)
    ) {
      // OR consensus (default): one approval cancels remaining tasks in the group.
      // SPECIFIC_USERS uses AND consensus and falls through here so other users
      // remain PENDING and must approve themselves.
      await this.instanceDataService.updateManyApprovalTasks(
        {
          workflow_node_id: targetWorkflowNode.id,
          approver_group_index: targetApprovalTask.approver_group_index,
          id: { not: approvalTaskId },
          status: ApprovalStatus.PENDING,
        },
        {
          status: ApprovalStatus.CANCELLED,
          updated_at: new Date(),
          updated_by: systemUserId, // Attributing to system
        },
        tx,
      );
    }

    // Check if all groups have completed
    const groupsWithPendingOrWaiting =
      await this.instanceDataService.getGroupsWithPendingOrWaitingTasks(
        targetWorkflowNode.id,
        tx,
      );

    const nodeCompleted = this.isApprovalNodeCompleted(
      groupsWithPendingOrWaiting.length,
      approvalNodeConfig,
    );

    if (nodeCompleted) {
      // For PARALLEL + OR, cancel all remaining PENDING/WAITING tasks in other groups
      if (
        approvalNodeConfig.approval_method === ApprovalMethod.PARALLEL &&
        approvalNodeConfig.approval_logic === ApprovalLogic.OR
      ) {
        await this.instanceDataService.updateManyApprovalTasks(
          {
            workflow_node_id: targetWorkflowNode.id,
            status: { in: [ApprovalStatus.PENDING, ApprovalStatus.WAITING] },
          },
          {
            status: ApprovalStatus.CANCELLED,
            updated_at: new Date(),
            updated_by: systemUserId, // Attributing to system
          },
          tx,
        );
      }

      // Mark node as COMPLETED with APPROVED result
      await this.instanceDataService.updateWorkflowNode(
        targetWorkflowNode.id,
        {
          status: NodeStatus.COMPLETED,
          result: NodeResult.APPROVED,
          completed_at: new Date(),
        },
        tx,
      );

      // Execute expression after node completion
      await this.executeNodeExpression(context, tx);

      return {
        taskStatus: ApprovalStatus.APPROVED,
        nodeCompleted: true,
      };
    }

    // Execute expression after state changes (e.g., cancelled other PENDING tasks)
    await this.executeNodeExpression(context, tx);

    return {
      taskStatus: ApprovalStatus.APPROVED,
      nodeCompleted: false,
    };
  }

  /**
   * Determines if an approval node is completed based on remaining groups
   * @param remainingGroupsCount - Number of groups with PENDING or WAITING tasks
   * @param approvalNodeConfig - The approval node configuration
   * @returns True if the node is completed
   */
  private isApprovalNodeCompleted(
    remainingGroupsCount: number,
    approvalNodeConfig: ApprovalNode,
  ): boolean {
    if (approvalNodeConfig.approval_method === ApprovalMethod.SINGLE) {
      // SINGLE: only one group, completed when no remaining groups
      return remainingGroupsCount === 0;
    }

    // PARALLEL: multiple groups
    if (approvalNodeConfig.approval_logic === ApprovalLogic.AND) {
      // AND: all groups must complete
      return remainingGroupsCount === 0;
    } else {
      // OR: any one group completing means node is complete
      // If remainingGroupsCount < total groups, at least one group has completed
      const totalGroups = approvalNodeConfig.approvers.length;
      return remainingGroupsCount < totalGroups;
    }
  }

  /**
   * Continues workflow execution and updates instance status if completed
   */
  private async continueWorkflowExecution(
    workflowInstanceId: number,
    startNodeKey?: string,
  ): Promise<ApprovalResponseDto> {
    const systemUserId = await this.getSystemUserId(); // Retrieve system user ID

    const executionResult = await this.workflowExecutor.executeWorkflow(
      workflowInstanceId,
      undefined,
      startNodeKey,
    );

    // If workflow completed, update instance status and send notification
    if (executionResult.status === ExecutionStatus.COMPLETED) {
      // Get current iteration for filtering
      const workflowInstance =
        await this.applicationService.findWorkflowInstanceById(
          workflowInstanceId,
        );
      const currentIteration = workflowInstance?.current_iteration ?? 1;

      // Cancel all remaining PENDING/WAITING tasks in parallel branches
      // This ensures that if one branch completes the workflow,
      // other parallel branches are properly cleaned up
      await this.instanceDataService.updateManyApprovalTasksByInstanceId(
        workflowInstanceId,
        {
          status: ApprovalStatus.CANCELLED,
          updated_at: new Date(),
          updated_by: systemUserId, // Attributing completion to system
        },
        [ApprovalStatus.PENDING, ApprovalStatus.WAITING],
      );

      // Mark all PENDING workflow nodes in current iteration as COMPLETED with CANCELLED result
      // These nodes are in parallel branches that didn't reach completion
      await this.instanceDataService.updateManyWorkflowNodesByInstanceId(
        workflowInstanceId,
        {
          status: NodeStatus.COMPLETED,
          result: NodeResult.CANCELLED,
          completed_at: new Date(),
        },
        NodeStatus.PENDING,
        undefined,
        currentIteration,
      );

      // Update status to COMPLETED
      await this.instanceDataService.updateWorkflowInstanceWithEvent(
        workflowInstanceId,
        {
          status: InstanceStatus.COMPLETED,
        },
        {
          event_type: WorkflowAction.APPROVE,
          status_before: workflowInstance?.status,
          status_after: InstanceStatus.COMPLETED,
          actor_id: systemUserId,
          details: { message: 'Workflow completed successfully' },
        },
      );

      // Get updated workflow instance with revision for notification
      const updatedWorkflowInstance =
        await this.applicationService.findWorkflowInstanceWithRevision(
          workflowInstance!.serial_number,
        );

      if (!updatedWorkflowInstance) {
        throw new NotFoundException(
          `Workflow instance ${workflowInstanceId} not found after update`,
        );
      }

      // Send workflow completion notification
      await this.approvalNotification.notifyWorkflowCompleted(
        updatedWorkflowInstance,
      );
    }

    // Return response based on execution result
    return {
      approval_node_status:
        executionResult.status === ExecutionStatus.COMPLETED
          ? NodeStatus.COMPLETED
          : NodeStatus.PENDING,
      application_status:
        executionResult.status === ExecutionStatus.COMPLETED
          ? InstanceStatus.COMPLETED
          : InstanceStatus.RUNNING,
    };
  }

  async createInstance(
    formRevision: FormRevision,
    formData: JsonObject,
    workflowRevision: WorkflowRevisions,
    applicantId: number,
    submitterId: number,
    priority: PriorityLevel,
    tx?: PrismaTransactionClient,
  ): Promise<CreateInstanceResult> {
    return this.applicationService.createInstanceData(
      formRevision,
      formData,
      workflowRevision,
      applicantId,
      submitterId,
      priority,
      tx,
    );
  }

  async submit(
    workflow_instance_id: number,
    userId: number,
    tx?: PrismaTransactionClient,
  ) {
    this.logger.debug(
      `submit, workflow_instance_id: ${workflow_instance_id}, userId: ${userId}`,
    );
    const instance = await this.applicationService.findWorkflowInstanceById(
      workflow_instance_id,
      tx,
    );
    if (!instance || instance.status != InstanceStatus.DRAFT) {
      throw new ForbiddenException(
        `${instance?.serial_number} is in illegal state: ${instance?.status}`,
      );
    }

    // Check if this is a resubmission (after RETURN_TO_APPLICANT reject)
    // by checking if workflow_nodes exist for the current iteration
    const existingNodes =
      await this.instanceDataService.findWorkflowNodesByInstanceId(
        workflow_instance_id,
        instance.current_iteration,
        tx,
      );

    let shouldIncrementIteration = false;

    if (existingNodes.length > 0) {
      // Has existing nodes - this is a resubmission after reject
      // Verify all nodes are COMPLETED (safety check)
      const allNodesCompleted = existingNodes.every(
        (node) => node.status === NodeStatus.COMPLETED,
      );

      if (!allNodesCompleted) {
        const pendingNodes = existingNodes.filter(
          (node) => node.status === NodeStatus.PENDING,
        );
        throw new BadRequestException(
          `Cannot resubmit application ${instance.serial_number}: ` +
            `workflow has ${pendingNodes.length} pending node(s). ` +
            `All nodes must be completed before resubmission.`,
        );
      }

      shouldIncrementIteration = true;
      this.logger.debug(
        `Resubmission detected for ${instance.serial_number}, will increment iteration from ${instance.current_iteration} to ${instance.current_iteration + 1}`,
      );
    }

    // Calculate new iteration value
    const newIteration = shouldIncrementIteration
      ? instance.current_iteration + 1
      : instance.current_iteration;

    // Update workflow instance status and iteration
    await this.instanceDataService.updateWorkflowInstanceWithEvent(
      workflow_instance_id,
      {
        status: InstanceStatus.RUNNING,
        current_iteration: newIteration,
        updated_by: userId,
      },
      {
        event_type: WorkflowAction.SUBMIT,
        status_before: instance.status,
        status_after: InstanceStatus.RUNNING,
        actor_id: userId,
        details: { iteration: newIteration },
      },
      tx,
    );

    // Get updated instance with all details
    const updatedInstance =
      await this.applicationService.findWorkflowInstanceWithDetails(
        workflow_instance_id,
        tx,
      );

    if (!updatedInstance) {
      throw new NotFoundException(
        `Workflow instance ${workflow_instance_id} not found after update`,
      );
    }

    // Execute workflow and update status based on result
    // Pass transaction to ensure executeWorkflow sees the updated current_iteration
    const executionResult = await this.workflowExecutor.executeWorkflow(
      updatedInstance.id,
      tx,
    );
    this.logger.debug(`executionResult: ${JSON.stringify(executionResult)}`);

    if (executionResult.status === ExecutionStatus.COMPLETED) {
      const systemUserId = await this.getSystemUserId();

      // Cancel all remaining PENDING/WAITING tasks in parallel branches
      // (may not exist if workflow completed without approval nodes)
      await this.instanceDataService.updateManyApprovalTasksByInstanceId(
        updatedInstance.id,
        {
          status: ApprovalStatus.CANCELLED,
          updated_at: new Date(),
          updated_by: systemUserId,
        },
        [ApprovalStatus.PENDING, ApprovalStatus.WAITING],
        tx,
      );

      // Mark all PENDING workflow nodes in current iteration as COMPLETED with CANCELLED result
      await this.instanceDataService.updateManyWorkflowNodesByInstanceId(
        updatedInstance.id,
        {
          status: NodeStatus.COMPLETED,
          result: NodeResult.CANCELLED,
          completed_at: new Date(),
        },
        NodeStatus.PENDING,
        tx,
        newIteration,
      );

      // Update status to COMPLETED with event
      await this.instanceDataService.updateWorkflowInstanceWithEvent(
        updatedInstance.id,
        {
          status: InstanceStatus.COMPLETED,
        },
        {
          event_type: WorkflowAction.APPROVE,
          status_before: InstanceStatus.RUNNING,
          status_after: InstanceStatus.COMPLETED,
          actor_id: systemUserId,
          details: { message: 'Workflow completed successfully' },
        },
        tx,
      );

      this.logger.log(
        `Workflow instance ${updatedInstance.id} completed successfully`,
      );

      // Update local instance object to reflect the new status
      updatedInstance.status = InstanceStatus.COMPLETED;

      // Get updated workflow instance with revision for notification
      const updatedWorkflowInstance =
        await this.applicationService.findWorkflowInstanceWithRevision(
          updatedInstance.serial_number,
          undefined,
          tx,
        );

      if (updatedWorkflowInstance) {
        // Send workflow completion notification
        await this.approvalNotification.notifyWorkflowCompleted(
          updatedWorkflowInstance,
        );
      }
    }

    return updatedInstance;
  }

  async getApplicationDetail(
    serial_number: string,
    userId: number,
  ): Promise<ApplicationInstanceDto> {
    const instance =
      await this.applicationService.getFormInstanceBySerialNumber(
        serial_number,
      );
    if (!instance) {
      throw new NotFoundException(
        `Application instance with serial number: ${serial_number} not found`,
      );
    }
    const workflowNodes =
      await this.instanceDataService.findBySerialNumberWithTasks(serial_number);
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
          approval.assignee_id === userId || approval.escalated_to === userId,
      ),
    );
    // instance.workflow_instance.flow_definition =
    return ApplicationInstanceDto.fromPrisma(
      instance as Parameters<typeof ApplicationInstanceDto.fromPrisma>[0],
      myNodes,
      routing,
    );
  }

  /**
   * Withdraw an application instance
   * - DRAFT instances are force deleted (hard delete)
   * - RUNNING instances are cancelled (soft delete)
   * - All pending/waiting approval tasks are cancelled for RUNNING instances
   *
   * @param serial_number - The serial number of the application instance
   * @param userId - The user ID requesting withdrawal (must be the applicant)
   * @throws NotFoundException if instance not found
   * @throws ForbiddenException if user is not the applicant or instance status is invalid
   */
  async withdrawApplicationInstance(
    serial_number: string,
    user: AuthUser,
  ): Promise<void> {
    // Step 1: Find workflow instance by serial number
    const workflowInstance =
      await this.applicationService.findWorkflowInstanceWithRevision(
        serial_number,
      );

    if (!workflowInstance) {
      throw new NotFoundException(
        `Application instance with serial number: ${serial_number} not found`,
      );
    }

    // Step 2: Verify user is the applicant or admin
    if (!isAdminUser(user) && workflowInstance.applicant_id !== user.id) {
      throw new ForbiddenException(
        `Only the applicant can withdraw the application`,
      );
    }

    // Step 3: Handle based on instance status
    const { status } = workflowInstance;

    if (status === InstanceStatus.DRAFT) {
      // Force delete draft instances
      await this.forceDeleteApplicationInstance(serial_number, user);
      return;
    }

    if (status === InstanceStatus.RUNNING) {
      // Cancel running instances
      await this.transactionService.runTransaction(async (tx) => {
        // 1. Cancel all pending and waiting approval tasks
        await this.instanceDataService.updateManyApprovalTasksByInstanceId(
          workflowInstance.id,
          {
            status: ApprovalStatus.CANCELLED,
            updated_at: new Date(),
            updated_by: user.id,
          },
          [ApprovalStatus.PENDING, ApprovalStatus.WAITING],
          tx,
        );

        // 2. Complete all pending workflow nodes (mark as completed without result)
        await this.instanceDataService.updateManyWorkflowNodesByInstanceId(
          workflowInstance.id,
          {
            status: NodeStatus.COMPLETED,
            completed_at: new Date(),
            updated_at: new Date(),
          },
          NodeStatus.PENDING,
          tx,
        );

        // 3. Update workflow instance status to CANCELLED
        await this.instanceDataService.updateWorkflowInstanceWithEvent(
          workflowInstance.id,
          {
            status: InstanceStatus.CANCELLED,
            updated_by: user.id,
          },
          {
            event_type: WorkflowAction.WITHDRAW,
            status_before: status,
            status_after: InstanceStatus.CANCELLED,
            actor_id: user.id,
          },
          tx,
        );
      });

      this.logger.log(
        `Workflow instance ${serial_number} cancelled by user ${user.id}`,
      );
      return;
    }

    // Step 4: Reject withdrawal for other statuses
    throw new ForbiddenException(
      `Cannot withdraw application in status: ${status}. Only DRAFT or RUNNING instances can be withdrawn.`,
    );
  }

  /**
   * Force delete an application instance (hard delete)
   * Deletes all related records including:
   * - WorkflowNode (cascades to ApprovalTask and WorkflowComment)
   * - FormInstance
   * - WorkflowInstance
   * - ApplicationInstance
   *
   * Note: WorkflowHistory is preserved for audit trail purposes
   *
   * @param serial_number - The serial number of the application instance
   * @param user - The user performing the deletion (must be applicant or admin)
   * @throws NotFoundException if instance not found
   * @throws ForbiddenException if user is not authorized
   */
  async forceDeleteApplicationInstance(
    serial_number: string,
    user: AuthUser,
  ): Promise<void> {
    // Step 1: Find workflow instance by serial number
    const workflowInstance =
      await this.applicationService.findWorkflowInstanceWithRevision(
        serial_number,
      );

    if (!workflowInstance) {
      throw new NotFoundException(
        `Application instance with serial number: ${serial_number} not found`,
      );
    }

    // Step 2: Verify user is the applicant or admin
    if (!isAdminUser(user) && workflowInstance.applicant_id !== user.id) {
      throw new ForbiddenException(
        `Only the applicant can delete the application`,
      );
    }

    // Step 3: Force delete all related records in correct order
    // Note: WorkflowHistory is preserved for audit trail
    await this.transactionService.runTransaction(async (tx) => {
      await this.instanceDataService.deleteInstanceData(
        serial_number,
        workflowInstance.id,
        tx,
      );
    });

    this.logger.log(
      `Application instance ${serial_number} force deleted by user ${user.id}`,
    );
  }

  /**
   * Update approval task status (APPROVE/REJECT)
   *
   * This method orchestrates the approval process:
   * 1. Validates the request and gathers context
   * 2. Updates approval task in a transaction (handles both APPROVE/REJECT)
   * 3. Sends notifications for approval decision and workflow completion if applicable
   * 4. Continues workflow execution if approved
   */
  async updateApproval(
    serial_number: string,
    approvalRequest: ApprovalRequestDto,
    userId: number,
  ): Promise<ApprovalResponseDto> {
    this.logger.debug(
      `updateApproval, serial_number: ${serial_number}, approvalRequest: ${JSON.stringify(approvalRequest)}, userId: ${userId}`,
    );
    // Step 1: Validate request and gather context
    const context = await this.validateApprovalRequest(
      serial_number,
      approvalRequest,
      userId,
    );

    // Step 1.5: Validate and merge approver form data (before transaction)
    let approverFormUpdate:
      | { coercedFormData: Record<string, any>; formInstanceId: number }
      | undefined;
    if (approvalRequest.form_data) {
      approverFormUpdate = await this.validateAndMergeApproverFormData(
        serial_number,
        approvalRequest.form_data,
        context,
      );
    }

    // Step 2: Determine new approval status
    const newApprovalStatus =
      approvalRequest.approval_result === ApprovalRequest.APPROVE
        ? ApprovalStatus.APPROVED
        : ApprovalStatus.REJECTED;

    // Step 3: Process approval in transaction
    const transactionResult = await this.transactionService.runTransaction(
      async (tx) => {
        // Update approval task status
        const approvalTask = await this.instanceDataService.updateApprovalTask(
          context.targetApprovalTask.id,
          {
            status: newApprovalStatus,
            updated_at: new Date(),
            updated_by: userId,
          },
          tx,
        );

        // Create workflow comment if provided
        if (approvalRequest.comment) {
          await this.instanceDataService.createWorkflowComment(
            {
              text: approvalRequest.comment,
              serial_number: context.workflowInstance.serial_number,
              approval_task_id: approvalTask.id,
              author_id: userId,
              updated_by: userId,
            },
            tx,
          );
        }

        // Save approver form data snapshot if provided
        if (approverFormUpdate) {
          await this.applicationService.updateFormData(
            approverFormUpdate.formInstanceId,
            approverFormUpdate.coercedFormData as JsonObject,
            userId,
            tx,
          );
        }

        // Handle based on approval status
        if (approvalTask.status === ApprovalStatus.REJECTED) {
          const result = await this.rejectionHandler.handleRejection(
            tx,
            context,
            approvalTask.id,
            approvalRequest.reject_behavior,
            approvalRequest.reject_target_node_key,
          );
          // Execute expression after rejection handling
          await this.executeNodeExpression(context, tx);
          return result;
        } else {
          // Expression is executed inside handleApproval after state changes
          return this.handleApproval(tx, context, approvalTask.id);
        }
      },
    );

    // Step 4: If rejected, send notifications and return
    if (transactionResult.taskStatus === ApprovalStatus.REJECTED) {
      // Send rejection notification to applicant
      await this.approvalNotification.notifyApprovalDecision(
        'REJECTED',
        userId,
        context,
        approvalRequest.comment,
      );

      // Get updated workflow instance to check actual status
      const updatedWorkflowInstance =
        await this.applicationService.findWorkflowInstanceWithRevision(
          context.workflowInstance.serial_number, // Use serial number
        );

      if (!updatedWorkflowInstance) {
        throw new NotFoundException(
          `Workflow instance ${context.workflowInstance.id} not found`,
        );
      }

      // Only send workflow completion notification if workflow is actually completed/rejected
      // Don't send for DRAFT (RETURN_TO_APPLICANT case - waiting for applicant to resubmit)
      // Don't send for RUNNING (SEND_TO_SPECIFIC_NODE / BACK_TO_PREVIOUS_NODE - will continue execution)
      if (
        updatedWorkflowInstance.status === InstanceStatus.REJECTED ||
        updatedWorkflowInstance.status === InstanceStatus.COMPLETED
      ) {
        await this.approvalNotification.notifyWorkflowCompleted(
          updatedWorkflowInstance,
        );
        return {
          approval_node_status: NodeStatus.COMPLETED,
          application_status: updatedWorkflowInstance.status,
        };
      }

      // If status is DRAFT, return early (RETURN_TO_APPLICANT - waiting for resubmit)
      if (updatedWorkflowInstance.status === InstanceStatus.DRAFT) {
        return {
          approval_node_status: NodeStatus.COMPLETED,
          application_status: updatedWorkflowInstance.status,
        };
      }

      // If status is RUNNING (SEND_TO_SPECIFIC_NODE or BACK_TO_PREVIOUS_NODE),
      // continue workflow execution from the target node
      if (updatedWorkflowInstance.status === InstanceStatus.RUNNING) {
        const executionResult = await this.continueWorkflowExecution(
          context.workflowInstance.id,
          transactionResult.resumeFromNodeKey,
        );
        this.logger.debug(
          `Workflow restarted after reject, executionResult: ${JSON.stringify(executionResult)}`,
        );
        return executionResult;
      }

      // Fallback (should not reach here)
      return {
        approval_node_status: NodeStatus.COMPLETED,
        application_status: updatedWorkflowInstance.status,
      };
    }

    // Step 5: Continue workflow execution if approved
    const executionResult = await this.continueWorkflowExecution(
      context.workflowInstance.id,
    );
    this.logger.debug(`executionResult: ${JSON.stringify(executionResult)}`);

    // Step 6: Send approval decision notification only if workflow is NOT completed
    // If workflow completed, applicant will receive WORKFLOW_COMPLETED notification instead
    if (executionResult.application_status !== InstanceStatus.COMPLETED) {
      await this.approvalNotification.notifyApprovalDecision(
        'APPROVED',
        userId,
        context,
        approvalRequest.comment,
      );
    }

    return executionResult;
  }

  //Workfloe Core Logic
  restartWorkflow(workflow_instance_id: number) {
    this.logger.warn(`restart flow: ${workflow_instance_id}`);
    throw new NotImplementedException('function under development');
  }

  /**
   * Execute the approval node's expression if defined
   * Used after each approve/reject/auto-approve action
   */
  private async executeNodeExpression(
    context: ApprovalContext,
    tx?: PrismaTransactionClient,
  ): Promise<void> {
    if (!context.approvalNodeConfig.expression) {
      return;
    }

    const formInstance =
      await this.instanceDataService.findFormInstanceByWorkflowInstanceId(
        context.workflowInstance.id,
        tx,
      );
    if (!formInstance) {
      return;
    }

    const latestSnapshot = await this.instanceDataService.findLatestFormData(
      formInstance.id,
      tx,
    );
    const formData = (latestSnapshot?.data ?? {}) as Record<string, unknown>;
    const executionContext: ExecutionContext = {
      formData,
      applicantId: context.workflowInstance.applicant_id,
      workflowInstanceId: context.workflowInstance.id,
      currentNodeId: context.targetWorkflowNode.id,
      tx,
    };
    await this.expressionEvaluator.evaluate(
      context.approvalNodeConfig.expression,
      executionContext,
    );
  }

  private _systemUserId: number | undefined;

  private async getSystemUserId(): Promise<number> {
    if (this._systemUserId === undefined) {
      const systemUser = await this.userService.getSystemUser();
      this._systemUserId = systemUser.id;
    }
    return this._systemUserId;
  }
}
