/**
 * Function Executor Service
 *
 * Executes allowed function calls by delegating to the appropriate executor.
 * Reuses existing executors from form-reference module.
 */

import { Injectable } from '@nestjs/common';
import { GetFormFieldExecutor } from '../executors/get-form-field.executor';
import { GetApplicantProfileExecutor } from '../executors/get-applicant-profile.executor';
import { GetApplicationExecutor } from '../executors/get-application.executor';
import { GetMasterDataExecutor } from '../executors/get-master-data.executor';
import { GetCurrentNodeExecutor } from '../executors/get-current-node.executor';
import {
  ExecutionContext,
  ExtractedFunctionCall,
  AllowedFunctionName,
  FORM_FIELD_FUNCTION,
  APPLICANT_PROFILE_FUNCTION,
  APPLICATION_FUNCTION,
  MASTER_DATA_FUNCTION,
  CURRENT_NODE_FUNCTION,
} from '../types';
import { FlowExecutionError, ErrorCode } from '../../types';

/**
 * Service for executing extracted function calls
 */
@Injectable()
export class FunctionExecutorService {
  constructor(
    private readonly getFormFieldExecutor: GetFormFieldExecutor,
    private readonly getApplicantProfileExecutor: GetApplicantProfileExecutor,
    private readonly getApplicationExecutor: GetApplicationExecutor,
    private readonly getMasterDataExecutor: GetMasterDataExecutor,
    private readonly getCurrentNodeExecutor: GetCurrentNodeExecutor,
  ) {}

  /**
   * Execute a single function call and return its value
   *
   * @param call - The extracted function call
   * @param context - Execution context
   * @returns The resolved value (with property access applied if specified)
   */
  async execute(
    call: ExtractedFunctionCall,
    context: ExecutionContext,
  ): Promise<unknown> {
    // Execute the function
    let result = await this.executeFunction(
      call.functionName,
      call.args,
      context,
    );

    // Apply property access if specified
    if (call.accessedProperty) {
      result = this.resolvePropertyAccess(
        result,
        call.accessedProperty,
        call.originalText,
      );
    }

    return result;
  }

  /**
   * Execute multiple function calls and return a map of values
   *
   * @param calls - Array of extracted function calls
   * @param context - Execution context
   * @returns Map of originalText to resolved value
   */
  async executeAll(
    calls: ExtractedFunctionCall[],
    context: ExecutionContext,
  ): Promise<Map<string, unknown>> {
    const values = new Map<string, unknown>();

    for (const call of calls) {
      const value = await this.execute(call, context);
      values.set(call.originalText, value);
    }

    return values;
  }

  /**
   * Execute a function by name
   */
  private async executeFunction(
    functionName: AllowedFunctionName,
    args: string[],
    context: ExecutionContext,
  ): Promise<unknown> {
    switch (functionName) {
      case FORM_FIELD_FUNCTION:
        return this.getFormFieldExecutor.execute(args, context);

      case APPLICANT_PROFILE_FUNCTION:
        return this.getApplicantProfileExecutor.execute(args, context);

      case APPLICATION_FUNCTION:
        return this.getApplicationExecutor.execute(args, context);

      case MASTER_DATA_FUNCTION:
        return this.getMasterDataExecutor.execute(args, context);

      case CURRENT_NODE_FUNCTION:
        return this.getCurrentNodeExecutor.execute(args, context);

      default:
        throw new FlowExecutionError(
          `Unknown function: ${functionName as string}`,
          ErrorCode.EXEC_INVALID_EXPRESSION,
        );
    }
  }

  /**
   * Resolve property access on an object
   */
  private resolvePropertyAccess(
    obj: unknown,
    property: string,
    originalText: string,
  ): unknown {
    if (obj === null || obj === undefined) {
      throw new FlowExecutionError(
        `Cannot access property '${property}' of ${String(obj)} in expression: ${originalText}`,
        ErrorCode.EXEC_INVALID_EXPRESSION,
      );
    }

    if (typeof obj !== 'object') {
      throw new FlowExecutionError(
        `Cannot access property '${property}' on non-object type in expression: ${originalText}`,
        ErrorCode.EXEC_INVALID_EXPRESSION,
      );
    }

    if (!(property in obj)) {
      throw new FlowExecutionError(
        `Property '${property}' does not exist on object in expression: ${originalText}`,
        ErrorCode.EXEC_INVALID_EXPRESSION,
      );
    }

    return (obj as Record<string, unknown>)[property];
  }
}
