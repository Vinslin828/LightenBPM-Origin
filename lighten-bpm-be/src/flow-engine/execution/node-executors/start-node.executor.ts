import { Injectable } from '@nestjs/common';
import { StartNode } from '../../types';

export interface StartNodeExecutionResult {
  nextNodeKey: string;
}

/**
 * Start Node Executor
 *
 * Executes START node type.
 * Simply returns the next node to continue workflow execution.
 */
@Injectable()
export class StartNodeExecutor {
  /**
   * Executes a start node
   * @param nodeConfig - The start node configuration
   * @returns The next node key to execute
   */
  execute(nodeConfig: StartNode): StartNodeExecutionResult {
    return {
      nextNodeKey: nodeConfig.next,
    };
  }
}
