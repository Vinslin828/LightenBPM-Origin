import { z } from 'zod';
import { ComparisonOperatorSchema, LogicOperatorSchema } from './common.schema';
import { NUMERIC_OPERATORS, STRING_OPERATORS } from '../../../types';

/**
 * Condition Schemas
 *
 * Handles validation for condition branches (simple, complex, and expression).
 * Uses recursive schema for nested conditions.
 */

// Simple condition: field operator value
const SimpleConditionSchema = z
  .object({
    field: z.string().min(1, 'Field is required'),
    operator: ComparisonOperatorSchema,
    value: z.union([z.string(), z.number(), z.boolean()]),
  })
  .superRefine((condition, ctx) => {
    // Validate operator and value type compatibility
    if (NUMERIC_OPERATORS.includes(condition.operator)) {
      if (typeof condition.value !== 'number') {
        ctx.addIssue({
          code: 'custom',
          path: ['value'],
          message: `Operator '${condition.operator}' requires numeric value`,
        });
      }
    } else if (STRING_OPERATORS.includes(condition.operator)) {
      if (typeof condition.value !== 'string') {
        ctx.addIssue({
          code: 'custom',
          path: ['value'],
          message: `Operator '${condition.operator}' requires string value`,
        });
      }
    }
    // == and != operators can work with any type, no validation needed
  });

// Expression condition: JavaScript expression that returns boolean
const ExpressionConditionSchema = z.object({
  expression: z.string().min(1, 'Expression is required'),
});

// Complex condition: left logic right (recursive)
// We need to use z.lazy() for recursive types
export type ConditionBranch =
  | z.infer<typeof SimpleConditionSchema>
  | z.infer<typeof ExpressionConditionSchema>
  | ComplexCondition;

export interface ComplexCondition {
  left: ConditionBranch;
  logic: z.infer<typeof LogicOperatorSchema>;
  right: ConditionBranch;
}

const ComplexConditionSchema: z.ZodType<ComplexCondition> = z.lazy(() =>
  z.object({
    left: ConditionBranchSchema,
    logic: LogicOperatorSchema,
    right: ConditionBranchSchema,
  }),
);

// Union of simple, expression, and complex conditions
export const ConditionBranchSchema: z.ZodType<ConditionBranch> = z.union([
  SimpleConditionSchema,
  ExpressionConditionSchema,
  ComplexConditionSchema,
]);

// Condition item: branch + next node
export const ConditionItemSchema = z.object({
  branch: ConditionBranchSchema.nullable(),
  next: z.string().min(1, 'Next node key is required'),
});

// Condition node
export const ConditionNodeSchema = z.object({
  key: z.string().min(1, 'Node key is required'),
  type: z.literal('condition'),
  conditions: z
    .array(ConditionItemSchema)
    .min(1, 'At least one condition is required'),
  description: z.string().optional(),
});
