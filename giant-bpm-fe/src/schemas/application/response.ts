import { z } from "zod";
import {
  formSchema,
  formRevisionSchema,
  formSchemaSchema,
} from "../form/response";
import { workflowRevisionSchema } from "../workflow/response";
import { userSchema } from "../master-data/response";
import { routingSchema } from "./routing-definition";
import { createApiPaginationSchema } from "../shared";

const approvalStatus = z.preprocess(
  (val) => {
    if (typeof val === "string") {
      return val.toUpperCase();
    }
    return val;
  },
  z.enum(["PENDING", "APPROVED", "REJECTED", "CANCELLED", "WAITING"]),
);
const routingStatus = z.enum(["PENDING", "IN_ACTIVE", "COMPLETED", "FAILED"]);
export const applicationListItemSchema = z.object({
  serial_number: z.string(),
  overallStatus: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        return val.toUpperCase();
      }
      return val;
    },
    z.enum([
      "DRAFT",
      "RUNNING",
      "COMPLETED",
      "REJECTED",
      "CANCELLED",
      "REPLACED",
    ]),
  ),
  approvalStatus: approvalStatus.default("PENDING"),
  applicantId: z.number(),
  submitterId: z.number(),
  formName: z.string(),
  workflowName: z.string(),
  createdAt: z.string(),
  submittedAt: z.string().nullish(),
  pendingApprovalTask: z
    .object({
      id: z.string(),
      assignee_id: z.number(),
      status: approvalStatus,
    })
    .optional(),
});

export type ApplicationListItemResponse = z.infer<
  typeof applicationListItemSchema
>;

export const applicationListSchema = createApiPaginationSchema(
  applicationListItemSchema,
);
export type ApplicationListResponse = z.infer<typeof applicationListSchema>;

// The revision for a workflow *instance* contains a `bindingForm`.
const workflowInstanceRevisionSchema = workflowRevisionSchema.extend({
  bindingForm: formSchema.optional(),
});

// Schema for a workflow *instance*, which is different from a workflow *definition*.
const workflowInstanceSchema = z.object({
  id: z.string(),
  revision: workflowInstanceRevisionSchema,
  applicant: userSchema,
  submitter: userSchema.optional(),
  status: z.string(),
  priority: z.string(),
  appliedAt: z.string().nullish(),
  completedAt: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
  withdrawnAt: z.string().nullish(), // Handles undefined
  withdrawnBy: userSchema.nullish(), // Handles undefined
});

// Schemas for the 'workflow_nodes' section
const approvalSchema = z.object({
  id: z.string(),
  assignee_id: z.number(),
  escalated_to: z.number().optional(),
  status: approvalStatus,
  dueDate: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const workflowNodeSchema = z.object({
  id: z.string(),
  node_key: z.string(),
  subflow_instance: workflowInstanceSchema.nullish(),
  node_type: z.string(),
  status: routingStatus,
  result: z.string().nullish(),
  startedAt: z.string().nullish(),
  completedAt: z.string().nullish(),
  dueDate: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
  approvals: z.array(approvalSchema).nullish(),
});

// Explicit schema for form_instance within an application response
const formInstanceSchema = z.object({
  id: z.string(),
  revision: formRevisionSchema,
  form_data: z.record(z.string(), z.any()),
  updatedBy: z.number(),
  updatedAt: z.string(),
});

export const applicationSchema = z.object({
  serial_number: z.string(),
  form_instance: formInstanceSchema, // Use explicit schema that doesn't require tags
  workflow_instance: workflowInstanceSchema,
  workflow_nodes: z.array(workflowNodeSchema).optional(), // Make optional
  routing: routingSchema.optional(), // Make optional
});

export type ApplicationResponse = z.infer<typeof applicationSchema>;

export const applicationFormSchema = z.object({
  binding_id: z.number(),
  form_id: z.string(),
  form_revision_id: z.string(),
  form_name: z.string(),
  form_desc: z.string(),
  workflow_id: z.string(),
  workflow_revision_id: z.string(),
  workflow_name: z.string(),
  workflow_desc: z.string().nullish(),
});
export type ApplicationFormResponse = z.infer<typeof applicationFormSchema>;

export const bindingSchema = z.array(
  z.object({
    id: z.number(),
    form_id: z.string(),
    workflow_id: z.string(),
  }),
);

export type BindingResponse = z.infer<typeof bindingSchema>;

export const applicationFormListSchema = createApiPaginationSchema(
  applicationFormSchema,
);
export type ApplicationFormListResponse = z.infer<
  typeof applicationFormListSchema
>;

export const commentSchema = z.object({
  content: z.string(),
  approval_task_id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  author: userSchema,
});

export type CommentResponse = z.infer<typeof commentSchema>;

export const applicationApprovalSchema = z.object({
  serial_number: z.string(),
  workflow_instance_id: z.string(),
  workflow_name: z.string(),
  workflow_desc: z.string().nullish(),
  application_priority: z.string(),
  application_status: z.string(),
  application_createdAt: z.string(),
  application_appliedAt: z.string(),
  application_updatedAt: z.string(),
  form_instance_id: z.string(),
  form_name: z.string(),
  form_desc: z.string().nullish(),
  form_schema: formSchemaSchema,
  form_data: z.record(z.string(), z.any()),
  workflow_node: workflowNodeSchema.extend({
    subflow_instance: workflowInstanceSchema.nullish(),
  }),
  approval_task: approvalSchema,
  comments: z.array(commentSchema),
});
export type ApplicationApprovalResponse = z.infer<
  typeof applicationApprovalSchema
>;
