import { Injectable } from '@nestjs/common';
import { ApprovalStatus, ApprovalTask } from '../../common/types/common.types';
import { ApprovalMethod, ApprovalNode } from '../types';
import { InstanceDataService } from '../../instance/instance-data.service';
import { PrismaTransactionClient } from '../../prisma/transaction-client.type';

@Injectable()
export class AutoApproveService {
  constructor(private readonly instanceDataService: InstanceDataService) {}

  /**
   * Determine if a task should be auto-approved based on prior approvals.
   */
  shouldAutoApprove(
    reusePriorApprovals: boolean,
    assigneeId: number,
    priorApprovedUsers: Set<number>,
  ): boolean {
    return reusePriorApprovals && priorApprovedUsers.has(assigneeId);
  }

  /**
   * Resolve the reuse_prior_approvals setting from the approval node config.
   * Handles both SINGLE and PARALLEL approval methods.
   */
  resolveReusePriorApprovals(
    approvalNodeConfig: ApprovalNode,
    groupIndex: number,
  ): boolean {
    if (approvalNodeConfig.approval_method === ApprovalMethod.SINGLE) {
      return approvalNodeConfig.approvers.reuse_prior_approvals ?? true;
    }
    // Parallel: get the specific approver config for this group
    const approverConfig = approvalNodeConfig.approvers[groupIndex];
    return approverConfig?.reuse_prior_approvals ?? true;
  }

  /**
   * Auto-approve a task and create the corresponding workflow comment.
   * Returns the updated approval task.
   */
  async autoApproveTask(
    taskId: number,
    serialNumber: string,
    assigneeId: number,
    systemUserId: number,
    tx?: PrismaTransactionClient,
  ): Promise<ApprovalTask> {
    const approvedTask = await this.instanceDataService.updateApprovalTask(
      taskId,
      {
        status: ApprovalStatus.APPROVED,
        updated_at: new Date(),
        updated_by: systemUserId,
      },
      tx,
    );

    await this.instanceDataService.createWorkflowComment(
      {
        text: 'Auto-approved (reused prior approval)',
        serial_number: serialNumber,
        approval_task_id: approvedTask.id,
        author_id: assigneeId,
        updated_by: systemUserId,
      },
      tx,
    );

    return approvedTask;
  }
}
