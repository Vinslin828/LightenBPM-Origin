/**
 * GetApplication Executor
 *
 * Executes the getApplication() function
 * Returns the current workflow instance data
 */

import { Injectable } from '@nestjs/common';
import { FunctionExecutor } from '../types/function-executor.interface';
import { ExecutionContext } from '../types/execution-context';
import { FlowExecutionError, ErrorCode } from '../../types';
import { InstanceDataService } from '../../../instance/instance-data.service';
import { keysToCamelCase } from '../utils/case-converter';

@Injectable()
export class GetApplicationExecutor implements FunctionExecutor {
  constructor(private readonly instanceDataService: InstanceDataService) {}

  /**
   * Execute getApplication()
   *
   * @param args - No arguments expected
   * @param context - Must contain workflowInstanceId
   * @returns Workflow instance object
   */
  async execute(args: string[], context: ExecutionContext): Promise<any> {
    // Validate arguments
    if (args.length !== 0) {
      throw new FlowExecutionError(
        `getApplication() expects no arguments, got ${args.length}`,
        ErrorCode.EXEC_INVALID_EXPRESSION,
      );
    }

    // Validate context
    if (context.workflowInstanceId === undefined) {
      throw new FlowExecutionError(
        `workflowInstanceId is required in execution context for getApplication()`,
        ErrorCode.EXEC_INVALID_EXPRESSION,
      );
    }

    // Fetch workflow instance data with events
    try {
      const instanceData =
        await this.instanceDataService.findWorkflowInstanceByIdWithEvents(
          context.workflowInstanceId,
        );

      if (!instanceData) {
        throw new FlowExecutionError(
          `Workflow instance with ID ${context.workflowInstanceId} not found`,
          ErrorCode.EXEC_INVALID_EXPRESSION,
        );
      }

      // Calculate appliedAt from SUBMIT event
      const appliedAt = instanceData.events?.find(
        (e) => e.event_type === 'SUBMIT',
      )?.created_at;

      // Add appliedAt before conversion so it gets converted to timestamp
      const dataWithAppliedAt = {
        ...instanceData,
        applied_at: appliedAt,
      };

      // Convert snake_case keys to camelCase and dates to epoch time
      const result = keysToCamelCase(dataWithAppliedAt) as Record<
        string,
        unknown
      >;

      return result;
    } catch (error) {
      if (error instanceof FlowExecutionError) {
        throw error;
      }

      throw new FlowExecutionError(
        `Failed to fetch workflow instance data: ${(error as Error).message}`,
        ErrorCode.EXEC_INVALID_EXPRESSION,
      );
    }
  }
}
