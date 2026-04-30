/**
 * Function Executor Interface
 *
 * Strategy pattern interface for executing different reference functions
 */

import { ExecutionContext } from './execution-context';

export interface FunctionExecutor {
  /**
   * Execute the function with given arguments and context
   *
   * @param args - Array of arguments passed to the function
   * @param context - Execution context containing necessary data and services
   * @returns The result of the function execution
   */
  execute(args: string[], context: ExecutionContext): Promise<any>;
}
