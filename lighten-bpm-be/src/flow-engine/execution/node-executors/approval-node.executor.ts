import { Injectable, Logger } from '@nestjs/common';
import {
  ApprovalNode,
  ApprovalMethod,
  ApproverConfig,
  ApproverType,
  ReportingLineMethod,
  SourceType,
} from '../../types';
import { InstanceDataService } from '../../../instance/instance-data.service';
import { OrgUnitService } from '../../../org-unit/org-unit.service';
import { UserService } from '../../../user/user.service';
import { UserWithOrg } from '../../../user/repository/user.repository';
import { NotificationService } from '../../../notification/notification.service';
import {
  ApprovalTask,
  User,
  ApprovalStatus,
  NodeType,
} from '../../../common/types/common.types';
import { FlowExecutionError, ErrorCode } from '../../types';
import { PrismaTransactionClient } from '../../../prisma/transaction-client.type';
import {
  ExpressionEvaluatorService,
  ExecutionContext,
} from '../../expression-engine';
import { AutoApproveService } from '../auto-approve.service';
import { requiresAllApprovers } from '../../shared/flow/flow-utils';

export interface ApprovalNodeExecutionResult {
  /**
   * Indicates that this node requires approval
   * The workflow execution will pause here until approval is completed
   */
  requiresApproval: true;
  nextNodeKey: string;
  approvalMethod: ApprovalMethod;
}

/**
 * Represents a group of approvers from a single approver configuration
 * Used to maintain sequential order within reporting line approvers
 */
interface ApproverGroup {
  users: User[];
  isSequential: boolean; // True for reporting_line types that need sequential approval
  reusePriorApprovals: boolean; // Whether to reuse prior approvals for this group
  desc?: string; //approver group description (optional)
  approverConfig: ApproverConfig; // Original config for this group (used for consensus rules)
}

/**
 * Approval Node Executor
 *
 * Executes APPROVAL node type.
 * Resolves approvers based on configuration and creates approval tasks.
 */
@Injectable()
export class ApprovalNodeExecutor {
  private readonly logger = new Logger(ApprovalNodeExecutor.name);

  constructor(
    private readonly instanceDataService: InstanceDataService,
    private readonly orgUnitService: OrgUnitService,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService,
    private readonly expressionEvaluator: ExpressionEvaluatorService,
    private readonly autoApproveService: AutoApproveService,
  ) {}

  /**
   * Executes an approval node
   * @param nodeConfig - The approval node configuration
   * @param workflowInstanceId - The workflow instance ID
   * @param applicantId - The applicant user ID
   * @param formData - The form data for expression evaluation
   * @param tx - Optional Prisma transaction client
   * @returns Approval execution result indicating approval is required
   */
  async execute(
    nodeConfig: ApprovalNode,
    workflowInstanceId: number,
    applicantId: number,
    formData: Record<string, any>,
    tx?: PrismaTransactionClient,
  ): Promise<ApprovalNodeExecutionResult> {
    this.logger.debug(
      `execute, nodeConfig: ${JSON.stringify(nodeConfig)}, workflowInstanceId: ${workflowInstanceId}, applicantId: ${applicantId}, formData: ${JSON.stringify(formData)}`,
    );

    // Get workflow instance for serial_number and current_iteration
    const workflowInstance =
      await this.instanceDataService.findWorkflowInstanceById(
        workflowInstanceId,
        tx,
      );
    if (!workflowInstance) {
      throw new FlowExecutionError(
        `Workflow instance ${workflowInstanceId} not found`,
        ErrorCode.INVALID_APPROVER_CONFIG,
      );
    }

    // Create workflow node for this approval with current iteration
    const workflowNode = await this.instanceDataService.createWorkflowNode(
      {
        instance_id: workflowInstanceId,
        node_key: nodeConfig.key,
        node_type: NodeType.APPROVAL,
        iteration: workflowInstance.current_iteration,
      },
      tx,
    );
    this.logger.debug(
      `created workflowNode, id: ${workflowNode.id}, node_key: ${workflowNode.node_key}, instance_id: ${workflowNode.instance_id}, iteration: ${workflowNode.iteration}, status: ${workflowNode.status}`,
    );

    // Resolve approvers based on configuration
    const approverGroups = await this.resolveApprovers(
      nodeConfig,
      applicantId,
      workflowInstanceId,
      formData,
    );

    const totalApprovers = approverGroups.reduce(
      (sum, group) => sum + group.users.length,
      0,
    );

    if (totalApprovers === 0) {
      throw new FlowExecutionError(
        `No approvers found for node ${nodeConfig.key}`,
        ErrorCode.APPROVER_NOT_FOUND,
        { nodeKey: nodeConfig.key },
      );
    }

    // Get prior approved users (will be used selectively based on each approver's config)
    const priorApprovedUsers =
      await this.instanceDataService.getPriorApprovedUsers(
        workflowInstanceId,
        tx,
      );

    // Phase 1: Create all tasks with initial status (PENDING/WAITING)
    const approvalTasks = await this.createApprovalTasks(
      workflowNode.id,
      approverGroups,
      workflowInstance.current_iteration,
      tx,
    );
    this.logger.debug(
      `created approvalTasks: count: ${approvalTasks.length}, tasks: ${approvalTasks.map((t) => `{id: ${t.id}, workflow_node_id: ${t.workflow_node_id}, assignee_id: ${t.assignee_id}, status: ${t.status}, group: ${t.approver_group_index}}`).join(', ')}`,
    );

    // Execute expression after all tasks created (initial entry)
    await this.executeExpression(
      nodeConfig,
      formData,
      applicantId,
      workflowInstanceId,
      workflowNode.id,
      tx,
    );

    // Phase 2: Process auto-approvals (each auto-approve triggers expression via callback)
    await this.processAutoApprovals(
      approvalTasks,
      approverGroups,
      priorApprovedUsers,
      workflowInstance.serial_number,
      () =>
        this.executeExpression(
          nodeConfig,
          formData,
          applicantId,
          workflowInstanceId,
          workflowNode.id,
          tx,
        ),
      tx,
    );
    this.logger.debug(
      `after auto-approval: ${approvalTasks.map((t) => `{id: ${t.id}, assignee_id: ${t.assignee_id}, status: ${t.status}}`).join(', ')}`,
    );

    // Send notifications for PENDING tasks (after auto-approvals are processed)
    await this.notifyPendingTasks(workflowNode.id, workflowInstanceId, tx);

    return {
      requiresApproval: true,
      nextNodeKey: nodeConfig.next,
      approvalMethod: nodeConfig.approval_method,
    };
  }

  /**
   * Resolves approvers based on the approval node configuration
   * Returns groups of approvers with sequential flag
   */
  async resolveApprovers(
    nodeConfig: ApprovalNode,
    applicantId: number,
    workflowInstanceId: number,
    formData: Record<string, any>,
  ): Promise<ApproverGroup[]> {
    if (nodeConfig.approval_method === ApprovalMethod.SINGLE) {
      // Single approval - approvers is a single object
      const users = await this.resolveApproverConfig(
        nodeConfig.approvers,
        applicantId,
        workflowInstanceId,
        formData,
      );
      const isSequential = this.isReportingLineType(nodeConfig.approvers.type);
      const reusePriorApprovals =
        nodeConfig.approvers.reuse_prior_approvals ?? true;
      const desc = nodeConfig.approvers.description;
      return [
        {
          users,
          isSequential,
          reusePriorApprovals,
          desc,
          approverConfig: nodeConfig.approvers,
        },
      ];
    } else {
      // Parallel approval - approvers is an array
      // Each approver config becomes a separate group
      const groups: ApproverGroup[] = [];

      for (const approverConfig of nodeConfig.approvers) {
        const users = await this.resolveApproverConfig(
          approverConfig,
          applicantId,
          workflowInstanceId,
          formData,
        );
        if (users.length > 0) {
          const isSequential = this.isReportingLineType(approverConfig.type);
          const reusePriorApprovals =
            approverConfig.reuse_prior_approvals ?? true;
          const desc = approverConfig.description;
          groups.push({
            users,
            isSequential,
            reusePriorApprovals,
            desc,
            approverConfig,
          });
        }
      }

      return groups;
    }
  }

  /**
   * Check if an approver type is reporting_line type (requires sequential approval)
   */
  private isReportingLineType(type: ApproverType): boolean {
    return (
      type === ApproverType.APPLICANT_REPORTING_LINE ||
      type === ApproverType.SPECIFIC_USER_REPORTING_LINE
    );
  }

  /**
   * Resolves a single approver configuration to a list of users
   */
  private async resolveApproverConfig(
    config: ApproverConfig,
    applicantId: number,
    workflowInstanceId: number,
    formData: Record<string, any>,
  ): Promise<User[]> {
    switch (config.type) {
      case ApproverType.APPLICANT: {
        const applicants = await this.userService.findByIds([applicantId]);
        return applicants;
      }

      case ApproverType.APPLICANT_REPORTING_LINE: {
        const applicant: UserWithOrg | null =
          await this.userService.findOne(applicantId);
        if (!applicant || !applicant.resolved_default_org) {
          return [];
        }

        const context: ExecutionContext = {
          formData,
          applicantId,
          workflowInstanceId,
        };
        const orgUnitId = await this.resolveOrgUnitIdFromReferenceField(
          applicant.resolved_default_org.id,
          config.config.org_reference_field,
          context,
        );

        return this.getReportingLineUsers(
          applicantId,
          orgUnitId,
          config.config.method,
          config.config.job_grade,
          config.config.level,
        );
      }

      case ApproverType.SPECIFIC_USER_REPORTING_LINE: {
        const context: ExecutionContext = {
          formData,
          applicantId,
          workflowInstanceId,
        };

        // Get the specific user ID
        let userId: number;
        if (config.config.source === SourceType.MANUAL) {
          userId = config.config.user_id!;
        } else {
          // source === 'form_field'
          const execResult = await this.expressionEvaluator.evaluate(
            config.config.form_field!,
            context,
          );
          if (!execResult.success || typeof execResult.value !== 'number') {
            throw new FlowExecutionError(
              `Failed to resolve user from form field: ${config.config.form_field}`,
              ErrorCode.INVALID_APPROVER_CONFIG,
            );
          }
          userId = execResult.value;
        }

        const user: UserWithOrg | null = await this.userService.findOne(userId);
        if (!user || !user.resolved_default_org) {
          return [];
        }

        const orgUnitId = await this.resolveOrgUnitIdFromReferenceField(
          user.resolved_default_org.id,
          config.config.org_reference_field,
          context,
        );

        return this.getReportingLineUsers(
          userId,
          orgUnitId,
          config.config.method,
          config.config.job_grade,
          config.config.level,
        );
      }

      case ApproverType.DEPARTMENT_HEAD: {
        // Get the org_unit_id
        let orgUnitId: number;
        if (config.config.source === SourceType.MANUAL) {
          orgUnitId = config.config.org_unit_id!;
        } else {
          // source === 'form_field'
          const context: ExecutionContext = {
            formData,
            applicantId,
            workflowInstanceId,
          };
          const execResult = await this.expressionEvaluator.evaluate(
            config.config.form_field!,
            context,
          );
          if (!execResult.success) {
            throw new FlowExecutionError(
              `Failed to resolve org_unit from form field: ${config.config.form_field}`,
              ErrorCode.INVALID_APPROVER_CONFIG,
            );
          }
          if (typeof execResult.value === 'number') {
            orgUnitId = execResult.value;
          } else if (typeof execResult.value === 'string') {
            try {
              const org = await this.orgUnitService.findByCode(
                execResult.value,
              );
              orgUnitId = org.id;
            } catch {
              throw new FlowExecutionError(
                `Referenced org code not found: ${execResult.value}`,
                ErrorCode.INVALID_APPROVER_CONFIG,
              );
            }
          } else {
            throw new FlowExecutionError(
              `Invalid org_unit value type from form field: ${config.config.form_field}`,
              ErrorCode.INVALID_APPROVER_CONFIG,
            );
          }
        }

        const users = await this.orgUnitService.getOrgUnitHeadUsers(orgUnitId);
        return this.userService.findByIds(users.map((u) => u.id));
      }

      case ApproverType.ROLE: {
        const users = await this.orgUnitService.getOrgUnitMemberUsers(
          config.config.role_id,
        );
        return this.userService.findByIds(users.map((u) => u.id));
      }

      case ApproverType.SPECIFIC_USERS: {
        const cfg = config.config;

        if ('expression' in cfg) {
          const context: ExecutionContext = {
            formData,
            applicantId,
            workflowInstanceId,
          };
          const execResult = await this.expressionEvaluator.evaluate(
            cfg.expression,
            context,
          );
          if (!execResult.success) {
            throw new FlowExecutionError(
              `Failed to evaluate specific_users expression: ${execResult.error ?? 'unknown error'}`,
              ErrorCode.INVALID_APPROVER_CONFIG,
            );
          }
          const value = execResult.value;
          if (
            !Array.isArray(value) ||
            value.length === 0 ||
            !value.every(
              (v) => typeof v === 'number' && Number.isInteger(v) && v > 0,
            )
          ) {
            throw new FlowExecutionError(
              `specific_users expression must return a non-empty array of positive integer user IDs`,
              ErrorCode.INVALID_APPROVER_CONFIG,
            );
          }
          const userIds = Array.from(new Set(value as number[]));
          return this.userService.findByIds(userIds);
        }

        return this.userService.findByIds(cfg.user_ids);
      }

      default: {
        throw new FlowExecutionError(
          `Unknown approver type: ${(config as ApproverConfig).type}`,
          ErrorCode.INVALID_APPROVER_CONFIG,
        );
      }
    }
  }

  /**
   * Resolves org_unit_id from org_reference_field expression
   * Used by APPLICANT_REPORTING_LINE and SPECIFIC_USER_REPORTING_LINE
   *
   * @param defaultOrgUnitId - Fallback org_unit_id if resolution fails
   * @param orgReferenceField - The expression to evaluate (e.g., getFormField("org").value)
   * @param context - Execution context
   * @returns Resolved org_unit_id or the default
   */
  private async resolveOrgUnitIdFromReferenceField(
    defaultOrgUnitId: number,
    orgReferenceField: string | undefined,
    context: ExecutionContext,
  ): Promise<number> {
    if (!orgReferenceField) {
      return defaultOrgUnitId;
    }

    const execResult = await this.expressionEvaluator.evaluate(
      orgReferenceField,
      context,
    );

    if (!execResult.success) {
      return defaultOrgUnitId;
    }

    if (typeof execResult.value === 'number') {
      return execResult.value;
    }

    if (typeof execResult.value === 'string') {
      try {
        const org = await this.orgUnitService.findByCode(execResult.value);
        return org.id;
      } catch {
        this.logger.warn(`Referenced org code not found: ${execResult.value}`);
      }
    }

    return defaultOrgUnitId;
  }

  /**
   * Gets reporting line users based on method
   */
  private async getReportingLineUsers(
    userId: number,
    orgUnitId: number,
    method: ReportingLineMethod,
    jobGrade?: number,
    level?: number,
  ): Promise<User[]> {
    if (method === ReportingLineMethod.TO_JOB_GRADE) {
      return this.orgUnitService.getReportingLine(
        userId,
        orgUnitId,
        jobGrade,
        undefined,
      );
    } else {
      // method === ReportingLineMethod.TO_LEVEL
      return this.orgUnitService.getReportingLine(
        userId,
        orgUnitId,
        undefined,
        level,
      );
    }
  }

  /**
   * Execute the approval node's expression if defined (fire-and-forget result)
   */
  private async executeExpression(
    nodeConfig: ApprovalNode,
    formData: Record<string, any>,
    applicantId: number,
    workflowInstanceId: number,
    currentNodeId: number,
    tx?: PrismaTransactionClient,
  ): Promise<void> {
    if (!nodeConfig.expression) {
      return;
    }
    const context: ExecutionContext = {
      formData,
      applicantId,
      workflowInstanceId,
      currentNodeId,
      tx,
    };
    await this.expressionEvaluator.evaluate(nodeConfig.expression, context);
  }

  /**
   * Creates approval tasks for all approver groups with initial status (PENDING/WAITING).
   * No auto-approval is performed here.
   *
   * NOTE: Duplicate approvers are NOT removed at this stage.
   * This allows the same user to appear in multiple approval tasks if they
   * are assigned through different approver configs (e.g., role + reporting_line).
   */
  private async createApprovalTasks(
    workflowNodeId: number,
    approverGroups: ApproverGroup[],
    iteration: number,
    tx?: PrismaTransactionClient,
  ): Promise<ApprovalTask[]> {
    const createdTasks: ApprovalTask[] = [];
    const systemUser = await this.userService.getSystemUser();

    for (let groupIdx = 0; groupIdx < approverGroups.length; groupIdx++) {
      const group = approverGroups[groupIdx];

      for (let i = 0; i < group.users.length; i++) {
        const user = group.users[i];

        // Sequential: first user PENDING, rest WAITING
        // Non-sequential: all PENDING
        const status =
          group.isSequential && i > 0
            ? ApprovalStatus.WAITING
            : ApprovalStatus.PENDING;

        const createdTask =
          await this.instanceDataService.createApprovalTaskWithOptionalComment(
            {
              workflow_node_id: workflowNodeId,
              assignee_id: user.id,
              approver_group_index: groupIdx,
              iteration,
              status,
              updated_by: systemUser.id,
            },
            undefined,
            tx,
          );
        createdTasks.push(createdTask);
      }
    }

    return createdTasks;
  }

  /**
   * Processes auto-approvals for tasks that have prior approvals.
   * Calls onAutoApproved callback after each auto-approve.
   *
   * Auto-approval logic:
   * - Sequential groups (reporting_line): auto-approve from the front of the chain.
   *   Stop at the first user who cannot be auto-approved and ensure they are PENDING.
   * - Non-sequential groups (e.g., role-based): if any user can be auto-approved,
   *   approve them and cancel all other tasks in the group.
   */
  private async processAutoApprovals(
    tasks: ApprovalTask[],
    approverGroups: ApproverGroup[],
    priorApprovedUsers: Set<number>,
    serialNumber: string,
    onAutoApproved?: () => Promise<void>,
    tx?: PrismaTransactionClient,
  ): Promise<void> {
    const systemUser = await this.userService.getSystemUser();

    for (let groupIdx = 0; groupIdx < approverGroups.length; groupIdx++) {
      const group = approverGroups[groupIdx];
      const groupTasks = tasks.filter(
        (t) => t.approver_group_index === groupIdx,
      );

      if (group.isSequential) {
        // Sequential: auto-approve from the front, promote next to PENDING
        for (let i = 0; i < groupTasks.length; i++) {
          const task = groupTasks[i];
          const canAutoApprove = this.autoApproveService.shouldAutoApprove(
            group.reusePriorApprovals,
            task.assignee_id,
            priorApprovedUsers,
          );

          if (!canAutoApprove) {
            // First non-auto-approvable user: ensure it's PENDING and stop
            if (task.status !== ApprovalStatus.PENDING) {
              await this.instanceDataService.updateApprovalTask(
                task.id,
                { status: ApprovalStatus.PENDING },
                tx,
              );
              task.status = ApprovalStatus.PENDING;
            }
            break;
          }

          // Auto-approve this task
          await this.autoApproveService.autoApproveTask(
            task.id,
            serialNumber,
            task.assignee_id,
            systemUser.id,
            tx,
          );
          task.status = ApprovalStatus.APPROVED;

          // Promote next task to PENDING before running expression
          // so expression sees the correct current/prev/next state
          const nextTask = groupTasks[i + 1];
          if (nextTask && nextTask.status !== ApprovalStatus.PENDING) {
            const nextCanAutoApprove =
              this.autoApproveService.shouldAutoApprove(
                group.reusePriorApprovals,
                nextTask.assignee_id,
                priorApprovedUsers,
              );
            if (!nextCanAutoApprove) {
              await this.instanceDataService.updateApprovalTask(
                nextTask.id,
                { status: ApprovalStatus.PENDING },
                tx,
              );
              nextTask.status = ApprovalStatus.PENDING;
            }
          }

          await onAutoApproved?.();
        }
      } else if (requiresAllApprovers(group.approverConfig)) {
        // AND consensus (SPECIFIC_USERS): fast-path every user with prior
        // approval, but leave the rest PENDING — they must approve themselves.
        for (const task of groupTasks) {
          const canAutoApprove = this.autoApproveService.shouldAutoApprove(
            group.reusePriorApprovals,
            task.assignee_id,
            priorApprovedUsers,
          );
          if (!canAutoApprove) continue;

          await this.autoApproveService.autoApproveTask(
            task.id,
            serialNumber,
            task.assignee_id,
            systemUser.id,
            tx,
          );
          task.status = ApprovalStatus.APPROVED;
          await onAutoApproved?.();
        }
      } else {
        // OR consensus (default): one approval suffices for the group, so any
        // qualifying user is fast-pathed and remaining tasks cancelled.
        const autoApprovableTask = groupTasks.find((t) =>
          this.autoApproveService.shouldAutoApprove(
            group.reusePriorApprovals,
            t.assignee_id,
            priorApprovedUsers,
          ),
        );

        if (autoApprovableTask) {
          await this.autoApproveService.autoApproveTask(
            autoApprovableTask.id,
            serialNumber,
            autoApprovableTask.assignee_id,
            systemUser.id,
            tx,
          );
          autoApprovableTask.status = ApprovalStatus.APPROVED;

          // Cancel all other tasks in the group
          for (const task of groupTasks) {
            if (task.id !== autoApprovableTask.id) {
              await this.instanceDataService.updateApprovalTask(
                task.id,
                {
                  status: ApprovalStatus.CANCELLED,
                  updated_at: new Date(),
                  updated_by: systemUser.id,
                },
                tx,
              );
              task.status = ApprovalStatus.CANCELLED;
            }
          }

          await onAutoApproved?.();
        }
      }
    }
  }

  /**
   * Send notifications for all PENDING approval tasks in a workflow node
   * @param workflowNodeId - The workflow node ID
   * @param workflowInstanceId - The workflow instance ID
   * @param tx - Optional transaction client to see uncommitted data
   */
  private async notifyPendingTasks(
    workflowNodeId: number,
    workflowInstanceId: number,
    tx?: PrismaTransactionClient,
  ): Promise<void> {
    // Get workflow instance with full details (use tx to see uncommitted data)
    const workflowInstance =
      await this.instanceDataService.findWorkflowInstanceWithDetails(
        workflowInstanceId,
        tx,
      );
    if (!workflowInstance) {
      return; // Silently skip if instance not found
    }

    // Find all PENDING tasks for this workflow node (use tx to see uncommitted data)
    const pendingTasks =
      await this.instanceDataService.findApprovalTasksByNodeIdAndStatus(
        workflowNodeId,
        ApprovalStatus.PENDING,
        tx,
      );

    // Send notification for each PENDING task
    for (const task of pendingTasks) {
      const assignee = await this.userService.findOne(task.assignee_id);
      if (!assignee) {
        continue; // Skip if assignee not found
      }

      await this.notificationService.notifyApprovalTaskPending({
        taskId: task.public_id,
        assigneeId: assignee.id,
        assigneeEmail: assignee.email,
        assigneeName: assignee.name,
        instanceSerialNumber: workflowInstance.serial_number,
        workflowName: workflowInstance.revision.name,
        applicantName: workflowInstance.applicant.name,
      });
    }
  }
}
