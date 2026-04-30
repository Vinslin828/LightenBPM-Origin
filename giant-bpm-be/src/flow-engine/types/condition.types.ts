import { ComparisonOperator, LogicOperator } from './common.types';

export interface SimpleCondition {
  field: string;
  operator: ComparisonOperator;
  value: string | number | boolean;
}

export interface ComplexCondition {
  left: ConditionBranch;
  logic: LogicOperator;
  right: ConditionBranch;
}

/**
 * Expression-based condition
 *
 * Allows full JavaScript expressions for complex conditions.
 * Supports inline expressions, statements with return, or function definitions.
 *
 * @example
 * // Inline expression
 * { expression: 'getFormField("amount").value > 5000' }
 *
 * // Function definition (frontend format)
 * { expression: 'function condition() { return getFormField("a").value + getFormField("b").value > 100; }' }
 */
export interface ExpressionCondition {
  expression: string;
}

export type ConditionBranch =
  | SimpleCondition
  | ComplexCondition
  | ExpressionCondition;

export interface ConditionItem {
  branch: ConditionBranch | null;
  next: string;
}
