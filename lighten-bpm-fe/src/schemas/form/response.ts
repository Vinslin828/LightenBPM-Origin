import { z } from "zod";
import { tagSchema } from "../master-data/response";
import { createApiPaginationSchema } from "../shared";

export const formRevisionOptionsSchema = z.object({
  can_withdraw: z.boolean(),
  can_copy: z.boolean(),
  can_draft: z.boolean(),
  can_delegate: z.boolean(),
});

export type FormRevisionOptionsResponse = z.infer<
  typeof formRevisionOptionsSchema
>;

const formStatusSchema = z.enum([
  "DRAFT",
  "ACTIVE",
  "SCHEDULED",
  "ARCHIVED",
  "RETIRED",
]);

export const formSchemaSchema = z.object({
  root: z.array(z.string()).optional(),
  entities: z.record(z.string(), z.any()).optional(),
});
export const formRevisionSchema = z.object({
  revision_id: z.string(),
  form_id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  form_schema: formSchemaSchema.nullish(),
  validation: z
    .object({
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
      // Multi-language label fields — stored alongside validation in fe_validation
      defaultLang: z.string().optional(),
      translationLangs: z.array(z.string()).optional(),
      labelTranslations: z
        .record(z.string(), z.record(z.string(), z.string()))
        .optional(),
    })
    .nullable(),
  version: z.number(),
  status: formStatusSchema,
  effective_date: z.iso.datetime().optional(),
  retired_date: z.iso.datetime().optional(),
  created_by: z.number(),
  created_at: z.iso.datetime(),
  options: formRevisionOptionsSchema,
});

export type FormRevisionResponse = z.infer<typeof formRevisionSchema>;

export const formSchema = z.object({
  id: z.string(),
  is_template: z.boolean().optional(),
  is_active: z.boolean().optional(),
  revision: formRevisionSchema,
  tags: z.array(tagSchema),
});

export type FormResponse = z.infer<typeof formSchema>;

export const formListItemSchema = z.object({
  form_id: z.string(),
  form_revision_id: z.string(),
  name: z.string(),
  is_active: z.boolean(),
  // TODO: awaiting backend implementation
  form_description: z.string(),
  created_at: z.iso.datetime(),
  tags: z.array(tagSchema),
});

export type FormListItemResponse = z.infer<typeof formListItemSchema>;

export const formListSchema = createApiPaginationSchema(formListItemSchema);

export type FormListResponse = z.infer<typeof formListSchema>;

export const resolvedFormSchema = z.object({
  id: z.string(),
  revisionId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  formSchema: formSchemaSchema,
  options: z.object({
    id: z.number().optional(),
    form_revision_id: z.number().optional(),
    can_withdraw: z.boolean(),
    can_copy: z.boolean(),
    can_draft: z.boolean(),
    can_delegate: z.boolean(),
  }),
  applicantSource: z.enum(["selection", "submitter"]).optional(),
});

export type ResolvedFormResponse = z.infer<typeof resolvedFormSchema>;
