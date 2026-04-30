import { z } from "zod";

export const createFormRequestSchema = z.object({
  name: z.string(),
  description: z.string(),
  is_template: z.boolean(),
  tags: z.array(z.number()),
  validation: z.object({
    required: z.boolean(),
    validators: z.array(
      z.object({
        key: z.string(),
        listenFieldIds: z.array(z.string()),
        code: z.string().optional(),
        description: z.string().optional(),
        errorMessage: z.string().optional(),
        isApi: z.boolean().optional(),
      }),
    ),
  }),
});
export type CreateFormRequest = z.infer<typeof createFormRequestSchema>;

export const patchFormRequestSchema = z.object({
  name: z.string(),
  description: z.string(),
  form_schema: z.record(z.string(), z.any()),
  status: z.enum(["DRAFT", "ACTIVE", "SCHEDULED", "ARCHIVED", "RETIRED"]),
  effective_date: z.date().optional(),
  retired_date: z.date().optional(),
  options: {
    can_withdraw: z.boolean(),
    can_copy: z.boolean(),
    can_draft: z.boolean(),
    can_delegate: z.boolean(),
  },
});
export type PatchFormRequest = z.infer<typeof patchFormRequestSchema>;

export const updateFormRequestSchema = z.object({
  name: z.string(),
  form_schema: z.object({
    root: z.array(z.string()).optional(),
    entities: z.record(z.string(), z.any()).optional(),
  }),
  description: z.string(),
  status: z.enum(["DRAFT", "ACTIVE", "SCHEDULED", "ARCHIVED", "RETIRED"]),
  tags: z.array(z.number()),
  validation: z.object({
    required: z.boolean(),
    validators: z.array(
      z.object({
        key: z.string(),
        listenFieldIds: z.array(z.string()),
        code: z.string().optional(),
        description: z.string().optional(),
        errorMessage: z.string().optional(),
        isApi: z.boolean().optional(),
      }),
    ),
  }), // TODO: awaiting backend
  // tags: z.array(z.number()),
});
export type UpdateFormRequest = z.infer<typeof updateFormRequestSchema>;
