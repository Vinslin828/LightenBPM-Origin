/**
 * Number Array Expression Validator
 *
 * Validates that an expression is intended to return an array of positive
 * integer user IDs, using:
 * 1. Syntax check
 * 2. AST static analysis - rejects obviously wrong return types (literals,
 *    objects, comparisons, etc.)
 *
 * No mock execution: runtime values can't be simulated reliably (form field
 * types are dynamic, master data shapes vary), and chaining `.map / .filter /
 * [i].xxx` on undefined / empty mock data caused false positives that blocked
 * legitimate expressions. The runtime check in approval-node.executor enforces
 * the actual `number[]` contract on real data.
 *
 * Used for validating SPECIFIC_USERS approver expressions at workflow save time.
 */

import { parse } from 'acorn';
import type { Node } from 'acorn';
import { validateExpressionSyntax } from './expression-validator';
import {
  ValidationResult,
  ErrorCode,
  validResult,
  invalidResult,
} from '../../types/validation.types';
import { findReturnStatements, LiteralNode } from '../utils/ast-utils';

export function validateNumberArrayExpression(
  expression: string,
): ValidationResult {
  const syntaxResult = validateExpressionSyntax(expression);
  if (!syntaxResult.isValid) {
    return syntaxResult;
  }

  return validateNumberArrayByAST(expression);
}

// =============================================================================
// AST Validation - reject obviously wrong return types
// =============================================================================

function validateNumberArrayByAST(expression: string): ValidationResult {
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
      const issue = rejectObviouslyNonArray(returnStmt);
      if (issue) return issue;
    }
    return validResult();
  }

  const returnStatements = findReturnStatements(body);
  if (returnStatements.length > 0) {
    for (const returnStmt of returnStatements) {
      const issue = rejectObviouslyNonArray(returnStmt);
      if (issue) return issue;
    }
    return validResult();
  }

  if (body.length === 1 && firstStatement.type === 'ExpressionStatement') {
    const exprStmt = firstStatement as unknown as { expression: Node };
    const issue = rejectObviouslyNonArray(exprStmt.expression);
    if (issue) return issue;
    return validResult();
  }

  return invalidResult(
    'Expression must be a single expression, function definition, or statements with return',
    ErrorCode.INVALID_EXPRESSION,
  );
}

/**
 * Reject node types that clearly cannot produce a number[].
 * Returns null if the node is AST-undecidable (let it through; runtime check
 * in approval-node.executor will catch wrong values).
 */
function rejectObviouslyNonArray(node: Node): ValidationResult | null {
  switch (node.type) {
    case 'Literal': {
      const literalNode = node as LiteralNode;
      return invalidResult(
        `Expression must return an array of positive integer user IDs, but got ${typeof literalNode.value}`,
        ErrorCode.INVALID_EXPRESSION,
      );
    }
    case 'ObjectExpression':
      return invalidResult(
        'Expression must return an array of positive integer user IDs, but got an object literal',
        ErrorCode.INVALID_EXPRESSION,
      );
    case 'TemplateLiteral':
      return invalidResult(
        'Expression must return an array of positive integer user IDs, but got a template string',
        ErrorCode.INVALID_EXPRESSION,
      );
    case 'BinaryExpression':
    case 'LogicalExpression':
    case 'UnaryExpression':
      return invalidResult(
        `Expression must return an array of positive integer user IDs, but got a ${node.type}`,
        ErrorCode.INVALID_EXPRESSION,
      );
    default:
      return null;
  }
}
