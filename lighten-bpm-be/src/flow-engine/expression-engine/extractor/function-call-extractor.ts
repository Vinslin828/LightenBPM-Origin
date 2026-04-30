/**
 * Function Call Extractor
 *
 * Extracts function calls from expressions using Acorn AST parser.
 * Supports:
 * - getFormField("fieldName").value
 * - getApplicantProfile().propertyName
 * - getApplication().propertyName
 */

import { parse, Node } from 'acorn';
import { ancestor } from 'acorn-walk';
import {
  ExtractedFunctionCall,
  AllowedFunctionName,
  ALLOWED_EXPRESSION_FUNCTIONS,
  FORM_FIELD_FUNCTION,
} from '../types';
import { CallExpressionNode, MemberExpressionNode } from '../utils/ast-utils';

/**
 * Extracts function calls from expression strings
 */
export class FunctionCallExtractor {
  /**
   * Extract all allowed function calls from an expression
   *
   * @param expression - The expression string to parse
   * @returns Array of extracted function calls with their positions
   */
  extract(expression: string): ExtractedFunctionCall[] {
    if (!expression || typeof expression !== 'string') {
      return [];
    }

    try {
      const ast = parse(expression, {
        ecmaVersion: 2020,
        sourceType: 'script',
        allowReturnOutsideFunction: true,
      });

      const calls: ExtractedFunctionCall[] = [];
      const processedRanges = new Set<string>();

      // Walk the AST to find function calls
      ancestor(ast, {
        CallExpression: (node: Node, _state, ancestors: Node[]) => {
          const callNode = node as CallExpressionNode;
          const functionName = this.getFunctionName(callNode);

          if (!functionName || !this.isAllowedFunction(functionName)) {
            return;
          }

          // Check if this CallExpression is part of a MemberExpression
          const parent = ancestors[ancestors.length - 2];
          if (
            parent &&
            (parent as MemberExpressionNode).type === 'MemberExpression'
          ) {
            // Will be handled by the MemberExpression case
            return;
          }

          // Extract standalone function call (no property access)
          const rangeKey = `${node.start}-${node.end}`;
          if (processedRanges.has(rangeKey)) {
            return;
          }
          processedRanges.add(rangeKey);

          const extracted = this.extractFromCallExpression(
            callNode,
            expression,
          );
          if (extracted) {
            calls.push(extracted);
          }
        },

        MemberExpression: (node: Node, _state, ancestors: Node[]) => {
          const memberNode = node as MemberExpressionNode;

          // Find allowed function call in the chain
          // e.g., getFormField("amount").value -> getFormField("amount")
          // e.g., getMasterData("X")[0].vendor_code -> getMasterData("X")
          // e.g., getMasterData("X").find(v => v.id === 1).name -> getMasterData("X")
          const callNode = this.findAllowedCallExpression(memberNode.object);
          if (!callNode) {
            return;
          }

          // Check if this MemberExpression is part of a larger chain
          const parent = ancestors[ancestors.length - 2];
          if (
            parent &&
            (parent.type === 'MemberExpression' ||
              parent.type === 'CallExpression')
          ) {
            // Skip - will be handled by the parent
            return;
          }

          // Avoid duplicate processing
          const rangeKey = `${callNode.start}-${callNode.end}`;
          if (processedRanges.has(rangeKey)) {
            return;
          }
          processedRanges.add(rangeKey);

          // Extract ONLY the function call, let JS runtime handle property access
          const extracted = this.extractFromCallExpression(
            callNode,
            expression,
          );
          if (extracted) {
            calls.push(extracted);
          }
        },
      });

      // Sort by position (start) for consistent ordering
      calls.sort((a, b) => a.start - b.start);

      return calls;
    } catch {
      // Parse error - return empty array
      return [];
    }
  }

  /**
   * Recursively find an allowed CallExpression within a chain of MemberExpressions
   * For example, in getMasterData("X")[0].vendor_code:
   * - The outermost node is MemberExpression (.vendor_code)
   * - Its object is MemberExpression ([0])
   * - Its object is CallExpression (getMasterData("X"))
   *
   * Also handles method chains like getMasterData("X").find(v => ...).score:
   * - The outermost node is MemberExpression (.score)
   * - Its object is CallExpression (.find(...))
   * - .find's callee is MemberExpression, its object is CallExpression (getMasterData("X"))
   */
  private findAllowedCallExpression(node: Node): CallExpressionNode | null {
    if (node.type === 'CallExpression') {
      const callNode = node as CallExpressionNode;
      const functionName = this.getFunctionName(callNode);
      if (functionName && this.isAllowedFunction(functionName)) {
        return callNode;
      }

      // If this is a method call (e.g., .find(...), .filter(...)),
      // recurse into the callee's object to find allowed function
      if (callNode.callee.type === 'MemberExpression') {
        const memberCallee = callNode.callee as MemberExpressionNode;
        return this.findAllowedCallExpression(memberCallee.object);
      }

      return null;
    }

    if (node.type === 'MemberExpression') {
      const memberNode = node as MemberExpressionNode;
      return this.findAllowedCallExpression(memberNode.object);
    }

    return null;
  }

  /**
   * Get function name from a CallExpression node
   */
  private getFunctionName(node: CallExpressionNode): string | null {
    if (node.callee.type === 'Identifier' && node.callee.name) {
      return node.callee.name;
    }
    return null;
  }

  /**
   * Check if a function name is in the allowed list
   */
  private isAllowedFunction(name: string): name is AllowedFunctionName {
    return ALLOWED_EXPRESSION_FUNCTIONS.includes(name as AllowedFunctionName);
  }

  /**
   * Extract function call info from a CallExpression (no property access)
   */
  private extractFromCallExpression(
    node: CallExpressionNode,
    expression: string,
  ): ExtractedFunctionCall | null {
    const functionName = this.getFunctionName(node);
    if (!functionName || !this.isAllowedFunction(functionName)) {
      return null;
    }

    const args = this.extractArguments(node);

    return {
      functionName,
      args,
      accessedProperty: undefined,
      originalText: expression.slice(node.start, node.end),
      start: node.start,
      end: node.end,
    };
  }
  /**
   * Extract string arguments from a function call
   */
  private extractArguments(node: CallExpressionNode): string[] {
    const args: string[] = [];

    for (const arg of node.arguments) {
      if (arg.type === 'Literal' && typeof arg.value === 'string') {
        args.push(arg.value);
      }
    }

    return args;
  }

  /**
   * Extract all form field names from an expression.
   * Returns array of field names referenced by getFormField().
   * Used by validation to check if fields exist in form schema.
   */
  getFormFieldNames(expression: string): string[] {
    const calls = this.extract(expression);
    return calls
      .filter((call) => call.functionName === FORM_FIELD_FUNCTION)
      .map((call) => call.args[0])
      .filter((name): name is string => !!name);
  }
}
