/**
 * AST Utilities
 *
 * Shared AST node types and helper functions for expression processing.
 */

import { Node } from 'acorn';

// =============================================================================
// AST Node Types
// =============================================================================

export interface BinaryExpressionNode extends Node {
  type: 'BinaryExpression';
  operator: string;
  left: Node;
  right: Node;
}

export interface UnaryExpressionNode extends Node {
  type: 'UnaryExpression';
  operator: string;
  argument: Node;
}

export interface ConditionalExpressionNode extends Node {
  type: 'ConditionalExpression';
  test: Node;
  consequent: Node;
  alternate: Node;
}

export interface LiteralNode extends Node {
  type: 'Literal';
  value: unknown;
}

export interface CallExpressionNode extends Node {
  type: 'CallExpression';
  callee: Node & { type: string; name?: string };
  arguments: Array<{ type: string; value?: unknown }>;
}

export interface MemberExpressionNode extends Node {
  type: 'MemberExpression';
  object: Node;
  property: { type: string; name?: string };
}

export interface IdentifierNode extends Node {
  type: 'Identifier';
  name: string;
}

export interface ObjectExpressionNode extends Node {
  type: 'ObjectExpression';
  properties: PropertyNode[];
}

export interface PropertyNode extends Node {
  type: 'Property';
  key: { type: string; name?: string; value?: string };
  value: Node;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Find all return statement arguments in a list of statements (recursively)
 */
export function findReturnStatements(statements: Node[]): Node[] {
  const returnArgs: Node[] = [];

  for (const stmt of statements) {
    if (stmt.type === 'ReturnStatement') {
      const returnStmt = stmt as unknown as { argument: Node | null };
      if (returnStmt.argument) {
        returnArgs.push(returnStmt.argument);
      }
    } else if (stmt.type === 'IfStatement') {
      const ifStmt = stmt as unknown as {
        consequent: Node;
        alternate: Node | null;
      };
      returnArgs.push(...findReturnStatementsInBlock(ifStmt.consequent));
      if (ifStmt.alternate) {
        returnArgs.push(...findReturnStatementsInBlock(ifStmt.alternate));
      }
    } else if (stmt.type === 'BlockStatement') {
      const blockStmt = stmt as unknown as { body: Node[] };
      returnArgs.push(...findReturnStatements(blockStmt.body));
    }
  }

  return returnArgs;
}

/**
 * Find return statements in a block or statement
 */
export function findReturnStatementsInBlock(node: Node): Node[] {
  if (node.type === 'BlockStatement') {
    const blockStmt = node as unknown as { body: Node[] };
    return findReturnStatements(blockStmt.body);
  } else if (node.type === 'ReturnStatement') {
    const returnStmt = node as unknown as { argument: Node | null };
    return returnStmt.argument ? [returnStmt.argument] : [];
  } else if (node.type === 'IfStatement') {
    // Handle else-if chains
    const ifStmt = node as unknown as {
      consequent: Node;
      alternate: Node | null;
    };
    const results = findReturnStatementsInBlock(ifStmt.consequent);
    if (ifStmt.alternate) {
      results.push(...findReturnStatementsInBlock(ifStmt.alternate));
    }
    return results;
  }
  return [];
}

/**
 * Validate that input is a non-empty string
 */
export function validateNonEmptyString(
  expression: unknown,
): { valid: true } | { valid: false; error: string } {
  if (!expression || typeof expression !== 'string') {
    return {
      valid: false,
      error: 'Expression must be a non-empty string',
    };
  }
  return { valid: true };
}
