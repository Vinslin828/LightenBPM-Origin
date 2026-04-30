import { z } from "zod";
import { flowDefinitionSchema } from "./flow-definition";
import { formRevisionSchema, formSchema } from "../form/response";
import { tagSchema } from "../master-data/response";
import { createApiPaginationSchema } from "../shared";

// =================================================================
// SUB-SCHEMAS (Building blocks for the main workflow schemas)
// =================================================================

const workflowStatusSchema = z.enum([
  "DRAFT",
  "ACTIVE",
  "SCHEDULED",
  "ARCHIVED",
  "RETIRED",
]);

export const workflowRevisionSchema = z.object({
  revision_id: z.string(),
  workflow_id: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  flow_definition: flowDefinitionSchema.nullable(),
  version: z.number(),
  status: workflowStatusSchema,
  created_by: z.number(),
  created_at: z.string().datetime(),
});

export type WorkflowRevisionResponse = z.infer<typeof workflowRevisionSchema>;

// =================================================================
// MAIN SCHEMAS (For single workflow responses)
// =================================================================

export const workflowSchema = z.object({
  workflow_id: z.string(),
  is_active: z.boolean(),
  revision: workflowRevisionSchema,
  bindingForm: formSchema.optional(),
  tags: z.array(tagSchema),
  serial_prefix: z.string().optional(),
});

export type WorkflowResponse = z.infer<typeof workflowSchema>;

// =================================================================
// LIST SCHEMAS (For lists of workflows)
// =================================================================

export const workflowListItemSchema = z.object({
  workflow_id: z.string(),
  name: z.string(),
  tags: z.array(tagSchema),
  is_active: z.boolean(),
  created_at: z.iso.datetime(),
  revisionId: z.string(),
  description: z.string(),
});

export type WorkflowListItemResponse = z.infer<typeof workflowListItemSchema>;

export const workflowListSchema = createApiPaginationSchema(
  workflowListItemSchema,
);

export type WorkflowListResponse = z.infer<typeof workflowListSchema>;

export const bindFormSchema = z.object({
  id: z.number(),
  form_id: z.string(),
  workflow_id: z.string(),
  formRevision: formRevisionSchema,
});
export type BindFormResponse = z.infer<typeof bindFormSchema>;
