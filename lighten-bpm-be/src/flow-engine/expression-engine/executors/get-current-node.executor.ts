/**
 * GetCurrentNode Executor
 *
 * Executes the getCurrentNode() function
 * Returns the current workflow node data with approval tasks
 */

import { Injectable } from '@nestjs/common';
import { FunctionExecutor } from '../types/function-executor.interface';
import { ExecutionContext } from '../types/execution-context';
import { FlowExecutionError, ErrorCode } from '../../types';
import { InstanceDataService } from '../../../instance/instance-data.service';
import { keysToCamelCase } from '../utils/case-converter';

@Injectable()
export class GetCurrentNodeExecutor implements FunctionExecutor {
  constructor(private readonly instanceDataService: InstanceDataService) {}

  /**
   * Execute getCurrentNode()
   *
   * @param args - No arguments expected
   * @param context - Must contain currentNodeId
   * @returns Workflow node object with approverId (approval tasks array)
   */
  async execute(args: string[], context: ExecutionContext): Promise<any> {
    // Validate arguments
    if (args.length !== 0) {
      throw new FlowExecutionError(
        `getCurrentNode() expects no arguments, got ${args.length}`,
        ErrorCode.EXEC_INVALID_EXPRESSION,
      );
    }

    // Validate context
    if (context.currentNodeId === undefined) {
      throw new FlowExecutionError(
        `currentNodeId is required in execution context for getCurrentNode()`,
        ErrorCode.EXEC_INVALID_EXPRESSION,
      );
    }

    try {
      const nodeWithTasks =
        await this.instanceDataService.findWorkflowNodeByIdWithApprovalTasks(
          context.currentNodeId,
          context.tx,
        );

      if (!nodeWithTasks) {
        throw new FlowExecutionError(
          `Workflow node with ID ${context.currentNodeId} not found`,
          ErrorCode.EXEC_INVALID_EXPRESSION,
        );
      }

      const { approval_tasks, ...nodeData } = nodeWithTasks;

      // Convert node data to camelCase
      const result = keysToCamelCase(nodeData) as Record<string, unknown>;

      // Build approverId with current/prev/next based on task status
      const pending = approval_tasks
        .filter((t) => t.status === 'PENDING')
        .map((t) => t.assignee_id);
      const approved = approval_tasks
        .filter((t) => t.status === 'APPROVED' || t.status === 'REJECTED')
        .map((t) => t.assignee_id);
      const waiting = approval_tasks
        .filter((t) => t.status === 'WAITING')
        .map((t) => t.assignee_id);

      result.approverId = {
        current: pending.length > 0 ? pending : null,
        prev: approved.length > 0 ? approved : null,
        next: waiting.length > 0 ? waiting : null,
      };

      return result;
    } catch (error) {
      if (error instanceof FlowExecutionError) {
        throw error;
      }

      throw new FlowExecutionError(
        `Failed to fetch current node data: ${(error as Error).message}`,
        ErrorCode.EXEC_INVALID_EXPRESSION,
      );
    }
  }
}
