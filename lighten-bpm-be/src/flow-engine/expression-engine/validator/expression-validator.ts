/**
 * Generic Expression Validator
 *
 * Validates that an expression is syntactically correct.
 * Does NOT check return type or execute the expression.
 * Used for fire-and-forget expressions (e.g., approval node expressions)
 * which may use functions like fetch() that cannot be validated
 * in the sample runtime context.
 */

import { parse } from 'acorn';
import {
  ValidationResult,
  ErrorCode,
  validResult,
  invalidResult,
} from '../../types/validation.types';
import { validateNonEmptyString } from '../utils/ast-utils';
import { FunctionCallExtractor } from '../extractor/function-call-extractor';
import { CURRENT_NODE_FUNCTION } from '../types/function-call.types';

/**
 * Validates that an expression has valid syntax using AST parsing.
 *
 * @param expression - The expression to validate
 * @returns Validation result
 */
export function validateExpressionSyntax(expression: string): ValidationResult {
  const stringCheck = validateNonEmptyString(expression);
  if (!stringCheck.valid) {
    return invalidResult(stringCheck.error, ErrorCode.INVALID_EXPRESSION);
  }

  try {
    parse(expression, {
      ecmaVersion: 2020,
      sourceType: 'script',
      allowReturnOutsideFunction: true,
    });

    return validResult();
  } catch (error) {
    return invalidResult(
      error instanceof Error
        ? `Syntax error: ${error.message}`
        : 'Failed to parse expression',
      ErrorCode.INVALID_EXPRESSION,
    );
  }
}

/**
 * Checks if an expression contains getCurrentNode() calls.
 * getCurrentNode() is only allowed in approval node expressions.
 *
 * @param expression - The expression to check
 * @returns true if expression contains getCurrentNode()
 */
export function containsCurrentNodeCall(expression: string): boolean {
  const extractor = new FunctionCallExtractor();
  const calls = extractor.extract(expression);
  return calls.some((c) => c.functionName === CURRENT_NODE_FUNCTION);
}
