/**
 * GetFormField Executor
 *
 * Executes the getFormField() function
 * Returns the field object from form data
 */

import { Injectable } from '@nestjs/common';
import { FunctionExecutor } from '../types/function-executor.interface';
import { ExecutionContext } from '../types/execution-context';
import { FlowExecutionError, ErrorCode } from '../../types';

/**
 * Detect a currency-shaped form_data value: { value: number, currencyCode: string }.
 * Used so expression authors can write `getFormField("x").value` and
 * `getFormField("x").currencyCode` directly instead of `.value.value`.
 */
function isCurrencyShape(v: unknown): v is Record<string, unknown> {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    typeof (v as Record<string, unknown>).value === 'number' &&
    typeof (v as Record<string, unknown>).currencyCode === 'string'
  );
}

@Injectable()
export class GetFormFieldExecutor implements FunctionExecutor {
  /**
   * Execute getFormField(fieldName)
   *
   * For plain values this returns `{ value: fieldValue }` so expression
   * authors can write `getFormField("amount").value`. For currency-shaped
   * values (`{ value, currencyCode }`) it returns the object itself so both
   * `.value` and `.currencyCode` are accessible directly.
   *
   * @param args - [fieldName]
   * @param context - Must contain formData
   * @returns Field object exposing value (and currencyCode for currency fields)
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async execute(
    args: string[],
    context: ExecutionContext,
  ): Promise<Record<string, unknown>> {
    // Validate arguments
    if (args.length !== 1) {
      throw new FlowExecutionError(
        `getFormField() expects exactly 1 argument, got ${args.length}`,
        ErrorCode.EXEC_INVALID_EXPRESSION,
      );
    }

    const fieldName = args[0];

    // Validate context
    if (!context.formData) {
      throw new FlowExecutionError(
        `formData is required in execution context for getFormField()`,
        ErrorCode.EXEC_INVALID_EXPRESSION,
      );
    }

    // Get field value from form data
    // Returns undefined if field doesn't exist (e.g., non-required field not filled)
    // Expression authors should handle undefined values appropriately
    const fieldValue: unknown = context.formData[fieldName];

    if (isCurrencyShape(fieldValue)) {
      return { ...fieldValue };
    }

    return { value: fieldValue };
  }
}
