import { Injectable, Logger } from '@nestjs/common';
import { SqsService } from './sqs.service';
import {
  ApprovalTaskPendingMessage,
  ApprovalDecisionMessage,
  WorkflowCompletedMessage,
  NotificationType,
} from './dto/notification-message.dto';

/**
 * Notification Service
 *
 * Business logic for sending notifications
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly sqsService: SqsService) {}

  /**
   * Send notification when an approval task becomes PENDING
   * (either newly created or promoted from WAITING)
   * @param data - The approval task data
   */
  async notifyApprovalTaskPending(data: {
    taskId: string;
    assigneeId: number;
    assigneeEmail: string | null;
    assigneeName: string;
    instanceSerialNumber: string;
    workflowName: string;
    applicantName: string;
    formData?: Record<string, unknown>;
  }): Promise<void> {
    if (!data.assigneeEmail) {
      this.logger.warn(
        `Skipping notifyApprovalTaskPending: No email for assignee ${data.assigneeName} (ID: ${data.assigneeId})`,
      );
      return;
    }

    const message: ApprovalTaskPendingMessage = {
      type: NotificationType.APPROVAL_TASK_PENDING,
      timestamp: new Date().toISOString(),
      data: {
        taskId: data.taskId,
        assigneeId: data.assigneeId,
        assigneeEmail: data.assigneeEmail,
        assigneeName: data.assigneeName,
        instanceSerialNumber: data.instanceSerialNumber,
        workflowName: data.workflowName,
        applicantName: data.applicantName,
        formData: data.formData,
      },
    };

    const messageId = await this.sqsService.sendMessage(message);

    if (messageId) {
      this.logger.debug(
        `notifyApprovalTaskPending, TaskId: ${data.taskId}, Assignee: ${data.assigneeName}, MessageId: ${messageId}`,
      );
    }
  }

  /**
   * Send notification when an approval task is approved or rejected
   * @param data - The approval decision data
   */
  async notifyApprovalDecision(data: {
    taskId: string;
    decision: 'APPROVED' | 'REJECTED';
    applicantId: number;
    applicantEmail: string | null;
    applicantName: string;
    approverName: string;
    instanceSerialNumber: string;
    workflowName: string;
    comment?: string;
  }): Promise<void> {
    if (!data.applicantEmail) {
      this.logger.warn(
        `Skipping notifyApprovalDecision: No email for applicant ${data.applicantName} (ID: ${data.applicantId})`,
      );
      return;
    }

    const message: ApprovalDecisionMessage = {
      type:
        data.decision === 'APPROVED'
          ? NotificationType.APPROVAL_TASK_APPROVED
          : NotificationType.APPROVAL_TASK_REJECTED,
      timestamp: new Date().toISOString(),
      data: {
        taskId: data.taskId,
        decision: data.decision,
        applicantId: data.applicantId,
        applicantEmail: data.applicantEmail,
        applicantName: data.applicantName,
        approverName: data.approverName,
        instanceSerialNumber: data.instanceSerialNumber,
        workflowName: data.workflowName,
        comment: data.comment,
      },
    };

    const messageId = await this.sqsService.sendMessage(message);

    if (messageId) {
      this.logger.debug(
        `notifyApprovalDecision, Decision: ${data.decision}, TaskId: ${data.taskId}, Applicant: ${data.applicantName}, MessageId: ${messageId}`,
      );
    }
  }

  /**
   * Send notification when a workflow is completed
   * @param data - The workflow completion data
   */
  async notifyWorkflowCompleted(data: {
    instanceId: string;
    instanceSerialNumber: string;
    workflowName: string;
    finalStatus: 'APPROVED' | 'REJECTED';
    applicantId: number;
    applicantEmail: string | null;
    applicantName: string;
  }): Promise<void> {
    if (!data.applicantEmail) {
      this.logger.warn(
        `Skipping notifyWorkflowCompleted: No email for applicant ${data.applicantName} (ID: ${data.applicantId})`,
      );
      return;
    }

    const message: WorkflowCompletedMessage = {
      type: NotificationType.WORKFLOW_COMPLETED,
      timestamp: new Date().toISOString(),
      data: {
        instanceId: data.instanceId,
        instanceSerialNumber: data.instanceSerialNumber,
        workflowName: data.workflowName,
        finalStatus: data.finalStatus,
        applicantId: data.applicantId,
        applicantEmail: data.applicantEmail,
        applicantName: data.applicantName,
      },
    };

    const messageId = await this.sqsService.sendMessage(message);

    if (messageId) {
      this.logger.debug(
        `notifyWorkflowCompleted, Status: ${data.finalStatus}, Instance: ${data.instanceSerialNumber}, Applicant: ${data.applicantName}, MessageId: ${messageId}`,
      );
    }
  }
}
