/**
 * Expression Evaluator Service
 *
 * Main service for evaluating complex expressions.
 * Uses runtime injection to provide getter functions (getFormField, getMasterData, etc.)
 * directly in the isolated-vm context.
 *
 * This approach supports:
 * - Dynamic function arguments (e.g., getFormField(variableName))
 * - Loops and complex control flow
 * - Any JavaScript expression or statement
 */

import { Injectable, Logger } from '@nestjs/common';
import { GetFormFieldExecutor } from '../executors/get-form-field.executor';
import { GetApplicantProfileExecutor } from '../executors/get-applicant-profile.executor';
import { GetApplicationExecutor } from '../executors/get-application.executor';
import { GetMasterDataExecutor } from '../executors/get-master-data.executor';
import { GetCurrentNodeExecutor } from '../executors/get-current-node.executor';
import { FetchExecutor } from '../executors/fetch.executor';
import { ExecutionContext, EvaluationResult } from '../types';
import { runScript, RuntimeContext } from '../runner/script-runner';

@Injectable()
export class ExpressionEvaluatorService {
  private readonly logger = new Logger(ExpressionEvaluatorService.name);

  constructor(
    private readonly getFormFieldExecutor: GetFormFieldExecutor,
    private readonly getApplicantProfileExecutor: GetApplicantProfileExecutor,
    private readonly getApplicationExecutor: GetApplicationExecutor,
    private readonly getMasterDataExecutor: GetMasterDataExecutor,
    private readonly getCurrentNodeExecutor: GetCurrentNodeExecutor,
    private readonly fetchExecutor: FetchExecutor,
  ) {}

  /**
   * Evaluate a complex expression
   *
   * Supports:
   * - Function calls: getFormField("x").value, getApplicantProfile().name, etc.
   * - Dynamic arguments: getFormField(variableName)
   * - Ternary operator: a ? b : c
   * - String concatenation: "a" + "b"
   * - Logical operators: &&, ||, !
   * - Comparison operators: <, >, <=, >=, ==, !=
   * - Arithmetic operators: +, -, *, /
   * - Variable declarations: const x = ...
   * - Control flow: if-else, loops
   * - Return statements
   *
   * @param expression - The expression to evaluate
   * @param context - Execution context containing formData, applicantId, etc.
   * @returns Evaluation result with success status and value or error
   */
  async evaluate(
    expression: string,
    context: ExecutionContext,
  ): Promise<EvaluationResult> {
    if (!expression || typeof expression !== 'string') {
      return {
        success: false,
        error: 'Expression must be a non-empty string',
      };
    }

    try {
      // Create runtime context with getter functions
      const runtimeContext = this.createRuntimeContext(context);

      // Run the expression with injected functions
      const result = await runScript(expression, runtimeContext);

      if (!result.success) {
        this.logger.warn(`Expression evaluation failed: ${result.error}`);
        return {
          success: false,
          error: result.error,
        };
      }

      this.logger.debug(
        `Evaluate: "${expression.slice(0, 100)}${expression.length > 100 ? '...' : ''}" → [result omitted]`,
      );

      return {
        success: true,
        value: result.value,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Evaluation failed';

      this.logger.warn(`Expression evaluation failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Create a runtime context with getter functions for the isolate.
   * These functions will be available as globals in the script.
   */
  private createRuntimeContext(context: ExecutionContext): RuntimeContext {
    return {
      getFormField: (fieldId: string): Promise<Record<string, unknown>> => {
        return this.getFormFieldExecutor.execute([fieldId], context);
      },

      getApplicantProfile: (): Promise<Record<string, unknown>> => {
        return this.getApplicantProfileExecutor.execute([], context);
      },

      getApplication: (): Promise<Record<string, unknown>> => {
        return this.getApplicationExecutor.execute([], context);
      },

      getMasterData: (
        name: string,
        options?: Record<string, unknown>,
      ): Promise<Record<string, unknown>[]> => {
        return this.getMasterDataExecutor.execute(
          options ? [name, options] : [name],
          context,
        );
      },

      getCurrentNode: (): Promise<Record<string, unknown>> => {
        return this.getCurrentNodeExecutor.execute([], context);
      },

      fetch: (url: string, options?: Record<string, unknown>) => {
        return this.fetchExecutor.execute(
          options ? [url, options] : [url],
          context,
        );
      },
    };
  }
}
