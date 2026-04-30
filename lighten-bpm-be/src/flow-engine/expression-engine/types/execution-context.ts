/**
 * Execution Context
 *
 * Provides all necessary context for executing reference functions.
 * Services (UserService, InstanceDataService) are injected directly into executors,
 * so callers only need to provide data.
 */

import { PrismaTransactionClient } from '../../../prisma/transaction-client.type';

export interface ExecutionContext {
  /**
   * Form data - used by getFormField()
   * Key-value pairs of form field names and their values
   */
  formData?: Record<string, unknown>;

  /**
   * Applicant ID - used by getApplicantProfile()
   * ID of the user who created the workflow instance
   */
  applicantId?: number;

  /**
   * Workflow Instance ID - used by getApplication()
   * ID of the current workflow instance
   */
  workflowInstanceId?: number;

  /**
   * Current Node ID - used by getCurrentNode()
   * Internal ID of the current workflow node being executed
   */
  currentNodeId?: number;

  /**
   * Transaction client - used to read uncommitted data within a transaction
   */
  tx?: PrismaTransactionClient;
}
