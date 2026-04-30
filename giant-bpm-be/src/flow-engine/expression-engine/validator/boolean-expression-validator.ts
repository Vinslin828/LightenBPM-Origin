/**
 * Boolean Expression Validator
 *
 * Validates that an expression returns a boolean value using:
 * 1. AST static analysis - checks expression structure
 * 2. Execution validation - runs with sample values as fallback
 *
 * This is used to validate condition expressions at workflow save time.
 */

import { parse } from 'acorn';
import type { Node } from 'acorn';
import { runScript, SAMPLE_RUNTIME_CONTEXT } from '../runner/script-runner';
import { validateExpressionSyntax } from './expression-validator';
import {
  ValidationResult,
  ErrorCode,
  validResult,
  invalidResult,
} from '../../types/validation.types';
import {
  findReturnStatements,
  BinaryExpressionNode,
  UnaryExpressionNode,
  ConditionalExpressionNode,
  LiteralNode,
  CallExpressionNode,
  MemberExpressionNode,
  IdentifierNode,
} from '../utils/ast-utils';

/**
 * Comparison operators that return boolean
 */
const COMPARISON_OPERATORS = ['>', '<', '>=', '<=', '==', '!=', '===', '!=='];

/**
 * Methods that return boolean
 */
const BOOLEAN_METHODS = [
  'includes',
  'startsWith',
  'endsWith',
  'hasOwnProperty',
  'isArray',
  'isNaN',
  'isFinite',
  'isInteger',
];

// =============================================================================
// Main Validator
// =============================================================================

/**
 * Validates that an expression returns a boolean value.
 *
 * Checks in order:
 * 1. Syntax check (via validateExpressionSyntax)
 * 2. AST static analysis for boolean return type
 * 3. Execution with mock context as fallback
 *
 * @param expression - The expression to validate
 * @returns Validation result
 */
export async function validateBooleanExpression(
  expression: string,
): Promise<ValidationResult> {
  // Step 1: Syntax check
  const syntaxResult = validateExpressionSyntax(expression);
  if (!syntaxResult.isValid) {
    return syntaxResult;
  }

  // Step 2: AST boolean check
  const astResult = validateBooleanExpressionByAST(expression);
  if (astResult.isValid) {
    return astResult;
  }

  // Step 3: Execution boolean check (fallback)
  return validateBooleanExpressionByExecution(expression);
}

// =============================================================================
// AST Validation
// =============================================================================

/**
 * Validates that an expression returns a boolean value using AST analysis.
 *
 * Supports three formats:
 * 1. Inline expression: "a > 5"
 * 2. Function definition: "function condition() { return a > 5; }"
 * 3. Statements with return: "const x = a + b; return x > 100;"
 */
function validateBooleanExpressionByAST(expression: string): ValidationResult {
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
      if (!checkReturnsBooleanType(returnStmt)) {
        return invalidResult(
          'All return statements must return a boolean value. Use comparison operators (>, <, ==, etc.), logical operators (&&, ||, !), or boolean methods (.includes(), .startsWith(), etc.)',
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
      if (!checkReturnsBooleanType(returnStmt)) {
        return invalidResult(
          'All return statements must return a boolean value. Use comparison operators (>, <, ==, etc.), logical operators (&&, ||, !), or boolean methods (.includes(), .startsWith(), etc.)',
          ErrorCode.INVALID_EXPRESSION,
        );
      }
    }
    return validResult();
  }

  // Case 3: Single expression statement
  if (body.length === 1 && firstStatement.type === 'ExpressionStatement') {
    const exprStmt = firstStatement as unknown as { expression: Node };
    const returnsBoolean = checkReturnsBooleanType(exprStmt.expression);

    if (!returnsBoolean) {
      return invalidResult(
        'Expression must return a boolean value. Use comparison operators (>, <, ==, etc.), logical operators (&&, ||, !), or boolean methods (.includes(), .startsWith(), etc.)',
        ErrorCode.INVALID_EXPRESSION,
      );
    }

    return validResult();
  }

  return invalidResult(
    'Expression must be a single expression, function definition, or statements with return',
    ErrorCode.INVALID_EXPRESSION,
  );
}

/**
 * Check if an AST node represents an expression that returns boolean.
 */
function checkReturnsBooleanType(node: Node): boolean {
  switch (node.type) {
    case 'BinaryExpression': {
      const binaryNode = node as BinaryExpressionNode;
      return COMPARISON_OPERATORS.includes(binaryNode.operator);
    }

    case 'LogicalExpression': {
      // &&, || - returns boolean if both operands return boolean
      // But in practice, for conditions, we accept any logical expression
      return true;
    }

    case 'UnaryExpression': {
      const unaryNode = node as UnaryExpressionNode;
      // ! operator returns boolean
      // !! (double not) also returns boolean
      return unaryNode.operator === '!';
    }

    case 'Literal': {
      const literalNode = node as LiteralNode;
      return typeof literalNode.value === 'boolean';
    }

    case 'ConditionalExpression': {
      // a ? b : c - both b and c must return boolean
      const condNode = node as ConditionalExpressionNode;
      return (
        checkReturnsBooleanType(condNode.consequent) &&
        checkReturnsBooleanType(condNode.alternate)
      );
    }

    case 'CallExpression': {
      const callNode = node as CallExpressionNode;
      return checkBooleanMethodCall(callNode);
    }

    case 'SequenceExpression': {
      // (a, b, c) - returns the last expression
      const seqNode = node as unknown as { expressions: Node[] };
      if (seqNode.expressions.length > 0) {
        return checkReturnsBooleanType(
          seqNode.expressions[seqNode.expressions.length - 1],
        );
      }
      return false;
    }

    case 'ParenthesizedExpression': {
      // (a) - check inner expression
      const parenNode = node as unknown as { expression: Node };
      return checkReturnsBooleanType(parenNode.expression);
    }

    default:
      return false;
  }
}

/**
 * Check if a CallExpression calls a method that returns boolean.
 */
function checkBooleanMethodCall(node: CallExpressionNode): boolean {
  const callee = node.callee;

  // Check for method calls like str.includes(), arr.includes(), etc.
  if (callee.type === 'MemberExpression') {
    const memberNode = callee as MemberExpressionNode;
    const property = memberNode.property;

    if (property.type === 'Identifier') {
      const identNode = property as IdentifierNode;
      return BOOLEAN_METHODS.includes(identNode.name);
    }
  }

  // Check for global functions like isNaN(), isFinite()
  if (callee.type === 'Identifier') {
    const identNode = callee as IdentifierNode;
    return BOOLEAN_METHODS.includes(identNode.name);
  }

  return false;
}

// =============================================================================
// Execution-based Validation
// =============================================================================

/**
 * Validates that an expression returns a boolean value by executing it.
 *
 * Uses runtime injection with mock functions that return sample values.
 * Used as a fallback when AST validation fails (e.g., for variable assignments).
 */
async function validateBooleanExpressionByExecution(
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

    // Check if result is boolean
    if (typeof result.value !== 'boolean') {
      return invalidResult(
        `Expression must return a boolean value, but got ${typeof result.value}`,
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
