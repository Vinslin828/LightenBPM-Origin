import { z } from "zod";

// Schemas for the 'routing' section, aligned with the documentation.
export const routingUserSchema = z.object({
  id: z.number(),
  sub: z.string().nullish(),
  email: z.string(),
  name: z.string(),
  job_grade: z.number(),
  default_org_id: z.number(),
  created_at: z.string(),
  updated_at: z.union([z.string(), z.object({})]),
});

export const routingApprovalSchema = z.object({
  approvalTaskId: z.string(),
  assignee: routingUserSchema,
  status: z.enum(["WAITING", "PENDING", "APPROVED", "REJECTED", "CANCELLED"]),
});

export const approvalGroupSchema = z.object({
  approvals: z.array(routingApprovalSchema),
  isReportingLine: z.boolean(),
  desc: z.string().optional(),
});

export const reportingLineConfigSchema = z.object({
  type: z.enum(["level", "job_grade"]),
  target: z.number(),
});

const nodeStatusSchema = z.preprocess(
  (value) => {
    if (typeof value === "string") {
      return value.toUpperCase();
    }
    return value;
  },
  z.union([z.enum(["INACTIVE", "PENDING", "COMPLETED", "FAILED"])]),
);

export const baseNodeSchema = z.object({
  key: z.string(),
  status: nodeStatusSchema,
  desc: z.string().optional(),
  parent_keys: z.array(z.string()),
  child_keys: z.array(z.string()).optional(),
});

export const approvalRoutingNodeSchema = baseNodeSchema.extend({
  type: z.literal("approval"),
  result: z.enum(["approved", "rejected", "delegated", "timeout"]).optional(),
  approvalMethod: z.enum(["single", "parallel"]),
  approvalLogic: z.enum(["AND", "OR"]).optional(),
  reportingLineConfig: reportingLineConfigSchema.optional(),
  approvalGroups: z.array(approvalGroupSchema),
});

export const routingNodeSchema = z.discriminatedUnion("type", [
  approvalRoutingNodeSchema,
  baseNodeSchema.extend({ type: z.literal("start") }),
  baseNodeSchema.extend({ type: z.literal("condition") }),
  baseNodeSchema.extend({ type: z.literal("subflow") }),
  baseNodeSchema.extend({ type: z.literal("end") }),
]);

export const routingSchema = z.object({
  serialNumber: z.string(),
  workflowInstanceId: z.string(),
  nodes: z.array(routingNodeSchema),
});
