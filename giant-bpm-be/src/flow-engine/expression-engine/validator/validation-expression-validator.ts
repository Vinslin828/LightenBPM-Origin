/**
 * Validation Expression Validator
 *
 * Validates that an expression returns either:
 * 1. boolean - simple pass/fail
 * 2. { isValid: boolean, error: string } - pass/fail with custom error message
 *
 * This is used to validate validation expressions for:
 * - Component validation registry
 * - Component-level inline validation
 * - Form-level validation
 */

import { parse } from 'acorn';
import type { Node } from 'acorn';
import { runScript, SAMPLE_RUNTIME_CONTEXT } from '../runner/script-runner';
import { validateBooleanExpression } from './boolean-expression-validator';
import {
  ValidationResult,
  ErrorCode,
  validResult,
  invalidResult,
} from '../../types/validation.types';
import {
  findReturnStatements,
  validateNonEmptyString,
  ConditionalExpressionNode,
  ObjectExpressionNode,
  PropertyNode,
} from '../utils/ast-utils';

// =============================================================================
// Main Validator
// =============================================================================

/**
 * Validates that an expression returns a valid validation result.
 *
 * Checks in order:
 * 1. AST: Is it a boolean expression?
 * 2. AST: Is it a validation result object expression?
 * 3. Execution: Does it return boolean?
 * 4. Execution: Does it return validation result object?
 *
 * @param expression - The expression to validate
 * @returns Validation result
 */
export async function validateValidationExpression(
  expression: string,
): Promise<ValidationResult> {
  const stringCheck = validateNonEmptyString(expression);
  if (!stringCheck.valid) {
    return invalidResult(stringCheck.error, ErrorCode.INVALID_EXPRESSION);
  }

  // Step 1: Try boolean validation (AST first, then execution fallback)
  const boolResult = await validateBooleanExpression(expression);
  if (boolResult.isValid) {
    return validResult();
  }

  // Step 2: Try AST validation for validation result object
  const objAstResult = validateValidationResultExpressionByAST(expression);
  if (objAstResult.isValid) {
    return validResult();
  }

  // Step 3: Try execution validation for validation result object
  const objExecResult =
    await validateValidationResultExpressionByExecution(expression);
  if (objExecResult.isValid) {
    return validResult();
  }

  // All validations failed - return combined error message
  return invalidResult(
    'Expression must return either boolean or { isValid: boolean, error: string }',
    ErrorCode.INVALID_EXPRESSION,
  );
}

// =============================================================================
// AST Validation for { isValid, error } Object
// =============================================================================

/**
 * Validates that an expression returns a validation result object using AST analysis.
 *
 * Expected return type: { isValid: boolean; error: string }
 */
function validateValidationResultExpressionByAST(
  expression: string,
): ValidationResult {
  try {
    const ast = parse(expression, {
      ecmaVersion: 2020,
      sourceType: 'script',
      allowReturnOutsideFunction: true,
    });

    const body = (ast as { body: Node[] }).body;
    if (body.length === 0) {
      return invalidResult(
        'Expression cannot be empty',
        ErrorCode.INVALID_EXPRESSION,
      );
    }

    const firstStatement = body[0];

    // Case 1: Function definition - check return statements
    if (firstStatement.type === 'FunctionDeclaration') {
      const funcNode = firstStatement as unknown as { body: { body: Node[] } };
      const returnStatements = findReturnStatements(funcNode.body.body);

      if (returnStatements.length === 0) {
        return invalidResult(
          'Function must have at least one return statement',
          ErrorCode.INVALID_EXPRESSION,
        );
      }

      for (const returnStmt of returnStatements) {
        if (!checkReturnsValidationResultType(returnStmt)) {
          return invalidResult(
            'All return statements must return { isValid: boolean, error: string }',
            ErrorCode.INVALID_EXPRESSION,
          );
        }
      }

      return validResult();
    }

    // Case 2: Statements with return - check return statements
    const returnStatements = findReturnStatements(body);
    if (returnStatements.length > 0) {
      for (const returnStmt of returnStatements) {
        if (!checkReturnsValidationResultType(returnStmt)) {
          return invalidResult(
            'All return statements must return { isValid: boolean, error: string }',
            ErrorCode.INVALID_EXPRESSION,
          );
        }
      }
      return validResult();
    }

    // Case 3: Single expression statement
    if (body.length === 1 && firstStatement.type === 'ExpressionStatement') {
      const exprStmt = firstStatement as unknown as { expression: Node };
      if (checkReturnsValidationResultType(exprStmt.expression)) {
        return validResult();
      }
    }

    return invalidResult(
      'Expression does not return validation result object',
      ErrorCode.INVALID_EXPRESSION,
    );
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
 * Check if an AST node represents an expression that returns a validation result object.
 */
function checkReturnsValidationResultType(node: Node): boolean {
  switch (node.type) {
    case 'ObjectExpression': {
      const objNode = node as ObjectExpressionNode;
      return isValidationResultObject(objNode);
    }

    case 'ConditionalExpression': {
      // a ? b : c - both b and c must return validation result
      const condNode = node as ConditionalExpressionNode;
      return (
        checkReturnsValidationResultType(condNode.consequent) &&
        checkReturnsValidationResultType(condNode.alternate)
      );
    }

    case 'ParenthesizedExpression': {
      const parenNode = node as unknown as { expression: Node };
      return checkReturnsValidationResultType(parenNode.expression);
    }

    case 'SequenceExpression': {
      const seqNode = node as unknown as { expressions: Node[] };
      if (seqNode.expressions.length > 0) {
        return checkReturnsValidationResultType(
          seqNode.expressions[seqNode.expressions.length - 1],
        );
      }
      return false;
    }

    default:
      return false;
  }
}

/**
 * Check if an ObjectExpression has the shape: { isValid: boolean, error: string, ... }
 * Extra properties are allowed for flexibility.
 */
function isValidationResultObject(node: ObjectExpressionNode): boolean {
  const properties = node.properties;

  // Must have at least 2 properties
  if (properties.length < 2) {
    return false;
  }

  let hasIsValid = false;
  let hasError = false;

  for (const prop of properties) {
    if (prop.type !== 'Property') {
      continue;
    }

    const keyName = getPropertyKeyName(prop);

    if (keyName === 'isValid') {
      hasIsValid = true;
    } else if (keyName === 'error') {
      hasError = true;
    }
  }

  // Must have both isValid and error (extra properties are OK)
  return hasIsValid && hasError;
}

/**
 * Get the name of a property key
 */
function getPropertyKeyName(prop: PropertyNode): string | null {
  const key = prop.key;

  if (key.type === 'Identifier' && key.name) {
    return key.name;
  }

  if (key.type === 'Literal' && typeof key.value === 'string') {
    return key.value;
  }

  return null;
}

// =============================================================================
// Execution-based Validation for { isValid, error } Object
// =============================================================================

/**
 * Validates that an expression returns a validation result object by executing it.
 */
async function validateValidationResultExpressionByExecution(
  expression: string,
): Promise<ValidationResult> {
  try {
    // Execute the expression with sample runtime context
    const result = await runScript(expression, SAMPLE_RUNTIME_CONTEXT);

    if (!result.success) {
      return invalidResult(
        `Expression execution failed: ${result.error}`,
        ErrorCode.INVALID_EXPRESSION,
      );
    }

    // Check if result is a validation result object
    if (!isValidValidationResultValue(result.value)) {
      return invalidResult(
        'Expression must return { isValid: boolean, error: string }',
        ErrorCode.INVALID_EXPRESSION,
      );
    }

    return validResult();
  } catch (error) {
    return invalidResult(
      error instanceof Error ? error.message : 'Validation failed',
      ErrorCode.INVALID_EXPRESSION,
    );
  }
}

/**
 * Check if a value is a valid validation result object
 */
function isValidValidationResultValue(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // Must have isValid as boolean
  if (typeof obj.isValid !== 'boolean') {
    return false;
  }

  // Must have error as string
  if (typeof obj.error !== 'string') {
    return false;
  }

  return true;
}
