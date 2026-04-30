import {
  ApprovalTask,
  WorkflowInstance,
  WorkflowNode,
  WorkflowRevisions,
  ApprovalStatus,
} from '../../common/types/common.types';
import { ApprovalNode } from './index';

/**
 * Context object for approval processing
 * Contains all necessary data for handling approval updates
 */
export interface ApprovalContext {
  workflowInstance: WorkflowInstance & {
    revision: WorkflowRevisions;
  };
  targetApprovalTask: ApprovalTask & {
    workflow_node: WorkflowNode;
  };
  targetWorkflowNode: WorkflowNode;
  approvalNodeConfig: ApprovalNode;
}

/**
 * Result of approval transaction processing
 */
export interface ApprovalTransactionResult {
  taskStatus: ApprovalStatus;
  nodeCompleted: boolean;
  resumeFromNodeKey?: string; // For SEND_TO_SPECIFIC_NODE: which node to resume from
}
