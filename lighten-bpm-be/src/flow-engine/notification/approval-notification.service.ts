import { Injectable, Logger } from '@nestjs/common';
import {
  ApprovalTask,
  InstanceStatus,
  WorkflowInstance,
  WorkflowRevisions,
} from '../../common/types/common.types';
import { NotificationService } from '../../notification/notification.service';
import { UserService } from '../../user/user.service';
import { ApprovalContext } from '../types/approval-context.types';

@Injectable()
export class ApprovalNotificationService {
  private readonly logger = new Logger(ApprovalNotificationService.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly userService: UserService,
  ) {}

  async notifyTaskPending(
    task: ApprovalTask,
    context: ApprovalContext,
  ): Promise<void> {
    try {
      const assignee = await this.userService.findOne(task.assignee_id);
      if (!assignee) {
        this.logger.warn(
          `Cannot send notification: Assignee ${task.assignee_id} not found`,
        );
        return;
      }

      const applicant = await this.userService.findOne(
        context.workflowInstance.applicant_id,
      );
      if (!applicant) {
        this.logger.warn(
          `Cannot send notification: Applicant ${context.workflowInstance.applicant_id} not found`,
        );
        return;
      }

      await this.notificationService.notifyApprovalTaskPending({
        taskId: task.public_id,
        assigneeId: assignee.id,
        assigneeEmail: assignee.email,
        assigneeName: assignee.name,
        instanceSerialNumber: context.workflowInstance.serial_number,
        workflowName: context.workflowInstance.revision.name,
        applicantName: applicant.name,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send PENDING notification for task ${task.public_id}: ${error}`,
      );
    }
  }

  async notifyApprovalDecision(
    decision: 'APPROVED' | 'REJECTED',
    approverUserId: number,
    context: ApprovalContext,
    comment?: string,
  ): Promise<void> {
    try {
      const approver = await this.userService.findOne(approverUserId);
      if (!approver) {
        this.logger.warn(
          `Cannot send notification: Approver ${approverUserId} not found`,
        );
        return;
      }

      const applicant = await this.userService.findOne(
        context.workflowInstance.applicant_id,
      );
      if (!applicant) {
        this.logger.warn(
          `Cannot send notification: Applicant ${context.workflowInstance.applicant_id} not found`,
        );
        return;
      }

      await this.notificationService.notifyApprovalDecision({
        taskId: context.targetApprovalTask.public_id,
        decision,
        applicantId: applicant.id,
        applicantEmail: applicant.email,
        applicantName: applicant.name,
        approverName: approver.name,
        instanceSerialNumber: context.workflowInstance.serial_number,
        workflowName: context.workflowInstance.revision.name,
        comment,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send approval decision notification for task ${context.targetApprovalTask.public_id}: ${error}`,
      );
    }
  }

  async notifyWorkflowCompleted(
    workflowInstance: WorkflowInstance & { revision: WorkflowRevisions },
  ): Promise<void> {
    try {
      const applicant = await this.userService.findOne(
        workflowInstance.applicant_id,
      );
      if (!applicant) {
        this.logger.warn(
          `Cannot send notification: Applicant ${workflowInstance.applicant_id} not found`,
        );
        return;
      }

      const finalStatus =
        workflowInstance.status === InstanceStatus.COMPLETED
          ? ('APPROVED' as const)
          : ('REJECTED' as const);

      await this.notificationService.notifyWorkflowCompleted({
        instanceId: workflowInstance.public_id,
        instanceSerialNumber: workflowInstance.serial_number,
        workflowName: workflowInstance.revision.name,
        finalStatus,
        applicantId: applicant.id,
        applicantEmail: applicant.email,
        applicantName: applicant.name,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send workflow completion notification for instance ${workflowInstance.serial_number}: ${error}`,
      );
    }
  }
}
