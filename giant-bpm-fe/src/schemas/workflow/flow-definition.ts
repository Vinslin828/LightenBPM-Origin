import { z } from "zod";
import { formSchema } from "../form/response";

// =================================================================
// Base & Common Schemas
// =================================================================

const nodeTypes = z.enum(["start", "approval", "condition", "subflow", "end"]);

const baseNodeSchema = z.object({
  key: z.string(),
  type: nodeTypes,
  next: z.string().optional(),
  description: z.string().optional(),
});

const componentRuleSchema = z.object({
  component_name: z.string(),
  actions: z.array(z.string()),
  condition: z.string().optional(),
});

// =================================================================
// Condition Node Schemas
// =================================================================

const conditionOperatorSchema = z.enum([
  ">",
  "<",
  ">=",
  "<=",
  "==",
  "!=",
  "contains",
  "not_contains",
  "equals",
  "not_equals",
]);

const simpleBranchSchema = z.object({
  field: z.string(),
  operator: conditionOperatorSchema,
  value: z.union([z.string(), z.number()]),
});

const codeExpressionSchema = z.object({
  expression: z.string(),
});

export type Branch =
  | z.infer<typeof simpleBranchSchema>
  | z.infer<typeof codeExpressionSchema>
  | {
      left: Branch;
      logic: "AND" | "OR" | "XOR";
      right: Branch;
    };

const branchSchema: z.ZodType<Branch> = z.lazy(() =>
  z.union([
    simpleBranchSchema,
    codeExpressionSchema,
    z.object({
      left: branchSchema,
      logic: z.enum(["AND", "OR", "XOR"]),
      right: branchSchema,
    }),
  ]),
);

const conditionSchema = z.object({
  branch: branchSchema.nullable(),
  next: z.string(),
});

const conditionNodeSchema = baseNodeSchema.extend({
  type: z.literal("condition"),
  conditions: z.array(conditionSchema).refine(
    (conditions) => {
      const nullBranches = conditions.filter((c) => c.branch === null);
      return nullBranches.length === 1;
    },
    {
      message:
        "Conditions must have exactly one fallback branch (branch: null)",
    },
  ),
});

// =================================================================
// Approval Node Schemas
// =================================================================

// 4.2.3.1: type -> applicant
const applicantConfigSchema = z.object({}).optional();

// 4.2.3.2: type -> applicant_reporting_line
const applicantReportingLineConfigSchema = z
  .object({
    method: z.enum(["to_job_grade", "to_level"]),
    job_grade: z.number().int().optional(),
    level: z.number().int().optional(),
    org_reference_field: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.method === "to_job_grade") return data.job_grade !== undefined;
      if (data.method === "to_level") return data.level !== undefined;
      return false;
    },
    {
      message:
        "job_grade is required for method 'to_job_grade', and level is required for method 'to_level'",
    },
  );

// 4.2.3.3: type -> specific_user_reporting_line
const specificUserReportingLineConfigSchema = z
  .object({
    source: z.enum(["manual", "form_field"]),
    user_id: z.number().int().optional(),
    form_field: z.string().optional(),
    method: z.enum(["to_job_grade", "to_level"]),
    job_grade: z.number().int().optional(),
    level: z.number().int().optional(),
    org_reference_field: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.source === "manual") return data.user_id !== undefined;
      if (data.source === "form_field") return data.form_field !== undefined;
      return false;
    },
    {
      message:
        "user_id is required for source 'manual', and form_field is required for source 'form_field'",
    },
  )
  .refine(
    (data) => {
      if (data.method === "to_job_grade") return data.job_grade !== undefined;
      if (data.method === "to_level") return data.level !== undefined;
      return false;
    },
    {
      message:
        "job_grade is required for method 'to_job_grade', and level is required for method 'to_level'",
    },
  );

// 4.2.3.4: type -> department_head
const departmentHeadConfigSchema = z
  .object({
    source: z.enum(["manual", "form_field"]),
    org_unit_id: z.number().int().optional(),
    form_field: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.source === "manual") return data.org_unit_id !== undefined;
      if (data.source === "form_field") return data.form_field !== undefined;
      return false;
    },
    {
      message:
        "org_unit_id is required for source 'manual', and form_field is required for source 'form_field'",
    },
  );

// 4.2.3.5: type -> role
const roleConfigSchema = z.object({
  role_id: z.number().int(),
});

// 4.2.3.6: type -> specific_users
const specificUsersConfigSchema = z
  .object({
    // Backward compatible: old payload had no `source` and only `user_ids`.
    source: z.enum(["manual", "expression", "form_field"]).optional(),
    user_ids: z.array(z.number().int()).optional(),
    expression: z.string().optional(),
    form_field: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.source === undefined) return data.user_ids !== undefined;
      if (data.source === "manual") return data.user_ids !== undefined;
      if (data.source === "expression") return data.expression !== undefined;
      if (data.source === "form_field") return data.form_field !== undefined;
      return false;
    },
    {
      message:
        "user_ids is required for legacy/manual config, expression is required for source 'expression', and form_field is required for source 'form_field'",
    },
  );

// 4.2.2: approvers.type (discriminated union)
const approverObjectSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("applicant"),
    config: applicantConfigSchema,
    description: z.string().optional(),
    reuse_prior_approvals: z.boolean().optional(),
    component_rules: z.array(componentRuleSchema).optional(),
  }),
  z.object({
    type: z.literal("applicant_reporting_line"),
    config: applicantReportingLineConfigSchema,
    description: z.string().optional(),
    reuse_prior_approvals: z.boolean().optional(),
    component_rules: z.array(componentRuleSchema).optional(),
  }),
  z.object({
    type: z.literal("specific_user_reporting_line"),
    config: specificUserReportingLineConfigSchema,
    description: z.string().optional(),
    reuse_prior_approvals: z.boolean().optional(),
    component_rules: z.array(componentRuleSchema).optional(),
  }),
  z.object({
    type: z.literal("department_head"),
    config: departmentHeadConfigSchema,
    description: z.string().optional(),
    reuse_prior_approvals: z.boolean().optional(),
    component_rules: z.array(componentRuleSchema).optional(),
  }),
  z.object({
    type: z.literal("role"),
    config: roleConfigSchema,
    description: z.string().optional(),
    reuse_prior_approvals: z.boolean().optional(),
    component_rules: z.array(componentRuleSchema).optional(),
  }),
  z.object({
    type: z.literal("specific_users"),
    config: specificUsersConfigSchema,
    description: z.string().optional(),
    reuse_prior_approvals: z.boolean().optional(),
    component_rules: z.array(componentRuleSchema).optional(),
  }),
]);

// 4.2.1: Approval Node (discriminated union on approval_method)
const approvalNodeSchema = baseNodeSchema
  .extend({
    type: z.literal("approval"),
    approval_method: z.enum(["single", "parallel"]),
    approval_logic: z.enum(["AND", "OR"]).optional(),
    approvers: z.union([approverObjectSchema, z.array(approverObjectSchema)]),
    component_rules: z.array(componentRuleSchema).optional(),
  })
  .refine(
    (data) => {
      if (data.approval_method === "parallel") {
        return (
          data.approval_logic !== undefined && Array.isArray(data.approvers)
        );
      }
      if (data.approval_method === "single") {
        return !Array.isArray(data.approvers);
      }
      return false;
    },
    {
      message:
        "For 'parallel' method, 'approval_logic' is required and 'approvers' must be an array. For 'single' method, 'approvers' must be an object.",
    },
  );

// =================================================================
// Simple Node Schemas
// =================================================================

const startNodeSchema = baseNodeSchema.extend({
  type: z.literal("start"),
  next: z.string(), // 'next' is required for start nodes
  component_rules: z.array(componentRuleSchema).optional(),
  applicant_source: z.enum(["submitter", "selection"]).optional(),
});

const endNodeSchema = baseNodeSchema.extend({
  type: z.literal("end"),
  next: z.undefined(), // 'next' is forbidden for end nodes
});

const subflowNodeSchema = baseNodeSchema.extend({
  type: z.literal("subflow"),
  // Assuming a subflow node needs to specify which workflow to call
  // and has a 'next' node to go to after completion.
  // This part can be expanded based on more detailed requirements.
  subflow_id: z.string(),
  next: z.string(),
});

// =================================================================
// Top-Level Schemas
// =================================================================

export const nodeSchema = z.discriminatedUnion("type", [
  startNodeSchema,
  approvalNodeSchema,
  conditionNodeSchema,
  subflowNodeSchema,
  endNodeSchema,
]);

export const flowDefinitionSchema = z.object({
  version: z.number().int().min(1),
  nodes: z.array(nodeSchema),
});

export type FlowDefinitionResponse = z.infer<typeof flowDefinitionSchema>;
export type NodeResponse = z.infer<typeof nodeSchema>;
export type ApprovalNodeResponse = z.infer<typeof approvalNodeSchema>;
export type ConditionNodeResponse = z.infer<typeof conditionNodeSchema>;
export type StartNodeResponse = z.infer<typeof startNodeSchema>;
export type EndNodeResponse = z.infer<typeof endNodeSchema>;
export type SubflowNodeResponse = z.infer<typeof subflowNodeSchema>;
export type ApproverObjectResponse = z.infer<typeof approverObjectSchema>;
