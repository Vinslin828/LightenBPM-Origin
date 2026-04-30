/**
 * Base interface for all notification messages sent to SQS
 */
export interface NotificationMessage {
  type: NotificationType;
  timestamp: string;
  data: unknown;
}

/**
 * Types of notifications supported by the system
 */
export enum NotificationType {
  APPROVAL_TASK_PENDING = 'APPROVAL_TASK_PENDING',
  APPROVAL_TASK_APPROVED = 'APPROVAL_TASK_APPROVED',
  APPROVAL_TASK_REJECTED = 'APPROVAL_TASK_REJECTED',
  WORKFLOW_COMPLETED = 'WORKFLOW_COMPLETED',
}

/**
 * Data for approval task pending notification
 * Sent when a task becomes PENDING (either newly created or promoted from WAITING)
 */
export interface ApprovalTaskPendingData {
  taskId: string;
  assigneeId: number;
  assigneeEmail: string | null;
  assigneeName: string;
  instanceSerialNumber: string;
  workflowName: string;
  applicantName: string;
  formData?: Record<string, unknown>;
}

/**
 * Complete message for approval task pending notification
 */
export interface ApprovalTaskPendingMessage extends NotificationMessage {
  type: NotificationType.APPROVAL_TASK_PENDING;
  data: ApprovalTaskPendingData;
}

/**
 * Data for approval decision notification (APPROVED/REJECTED)
 * Sent to applicant when their task is approved or rejected
 */
export interface ApprovalDecisionData {
  taskId: string;
  decision: 'APPROVED' | 'REJECTED';
  applicantId: number;
  applicantEmail: string | null;
  applicantName: string;
  approverName: string;
  instanceSerialNumber: string;
  workflowName: string;
  comment?: string;
}

/**
 * Complete message for approval decision notification
 */
export interface ApprovalDecisionMessage extends NotificationMessage {
  type:
    | NotificationType.APPROVAL_TASK_APPROVED
    | NotificationType.APPROVAL_TASK_REJECTED;
  data: ApprovalDecisionData;
}

/**
 * Data for workflow completion notification
 * Sent to applicant when entire workflow is completed
 */
export interface WorkflowCompletedData {
  instanceId: string;
  instanceSerialNumber: string;
  workflowName: string;
  finalStatus: 'APPROVED' | 'REJECTED';
  applicantId: number;
  applicantEmail: string | null;
  applicantName: string;
}

/**
 * Complete message for workflow completion notification
 */
export interface WorkflowCompletedMessage extends NotificationMessage {
  type: NotificationType.WORKFLOW_COMPLETED;
  data: WorkflowCompletedData;
}
