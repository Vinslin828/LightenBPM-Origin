import { z } from 'zod';
import { NodeTypeSchema, ApprovalLogicSchema } from './common.schema';
import { ApproverConfigSchema } from './approver-config.schema';
import { ComponentRuleSchema } from './component-rule.schema';
import { RejectConfigSchema } from './reject-config.schema';
import { ConditionNodeSchema } from './condition.schema';
import { NodeType, ApprovalMethod, APPLICANT_SOURCE } from '../../../types';

/**
 * Node Schemas
 *
 * Defines validation rules for different node types in the workflow.
 */

// Base node schema - common fields for all nodes
const NodeBaseSchema = z.object({
  key: z.string().min(1, 'Node key is required'),
  type: NodeTypeSchema,
  description: z.string().optional(),
});

// START node
export const StartNodeSchema = NodeBaseSchema.extend({
  type: z.literal(NodeType.START),
  next: z.string().min(1, 'Next node key is required'),
  applicant_source: z
    .enum([APPLICANT_SOURCE.SUBMITTER, APPLICANT_SOURCE.SELECTION])
    .optional(),
  component_rules: z.array(ComponentRuleSchema).optional(),
});

// END node
export const EndNodeSchema = NodeBaseSchema.extend({
  type: z.literal(NodeType.END),
});

// SINGLE APPROVAL node
export const SingleApprovalNodeSchema = NodeBaseSchema.extend({
  type: z.literal(NodeType.APPROVAL),
  next: z.string().min(1, 'Next node key is required'),
  approval_method: z.literal(ApprovalMethod.SINGLE),
  approvers: ApproverConfigSchema, // Single approver object
  reject_config: RejectConfigSchema.optional(),
  expression: z.string().optional(),
});

// PARALLEL APPROVAL node
export const ParallelApprovalNodeSchema = NodeBaseSchema.extend({
  type: z.literal(NodeType.APPROVAL),
  next: z.string().min(1, 'Next node key is required'),
  approval_method: z.literal(ApprovalMethod.PARALLEL),
  approval_logic: ApprovalLogicSchema,
  approvers: z
    .array(ApproverConfigSchema)
    .min(1, 'At least one approver is required for parallel approval'),
  reject_config: RejectConfigSchema.optional(),
  expression: z.string().optional(),
});

// Combined APPROVAL node schema
export const ApprovalNodeSchema = z.union([
  SingleApprovalNodeSchema,
  ParallelApprovalNodeSchema,
]);

// SUBFLOW node
export const SubflowNodeSchema = NodeBaseSchema.extend({
  type: z.literal(NodeType.SUBFLOW),
  next: z.string().min(1, 'Next node key is required'),
  subflowId: z.string().min(1, 'Subflow ID is required'),
});

// Re-export CONDITION node from condition.schema.ts
export { ConditionNodeSchema };

/**
 * Combined Node Schema (All node types)
 *
 * Uses union for all node types.
 * Note: We use regular union instead of discriminatedUnion because
 * APPROVAL nodes have the same 'type' discriminator but differ by 'approval_method'.
 */
export const NodeSchema = z.union([
  StartNodeSchema,
  EndNodeSchema,
  SingleApprovalNodeSchema,
  ParallelApprovalNodeSchema,
  ConditionNodeSchema,
  SubflowNodeSchema,
]);
