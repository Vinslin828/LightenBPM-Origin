import z from "zod";

export const backendPermissionGranteeTypeSchema = z.enum([
  "USER",
  "ORG_UNIT",
  "JOB_GRADE",
  "ROLE",
  "EVERYONE",
]);

export const backendPermissionActionSchema = z.enum([
  "VIEW",
  "USE",
  "MANAGE",
]);

export const backendPermissionActionItemSchema = z.object({
  id: z.number(),
  action: backendPermissionActionSchema,
});

const workflowPermissionGroupedSchema = z.object({
  workflow_id: z.number(),
  grantee_type: backendPermissionGranteeTypeSchema,
  grantee_value: z.string(),
  actions: z.array(backendPermissionActionItemSchema),
});

const workflowPermissionLegacySchema = z.object({
  id: z.number().optional(),
  workflow_id: z.number(),
  grantee_type: backendPermissionGranteeTypeSchema,
  grantee_value: z.string(),
  action: backendPermissionActionSchema,
});

export const workflowPermissionSchema = z.preprocess((value) => {
  const parsed = workflowPermissionLegacySchema.safeParse(value);
  if (!parsed.success) return value;

  const legacy = parsed.data;
  return {
    workflow_id: legacy.workflow_id,
    grantee_type: legacy.grantee_type,
    grantee_value: legacy.grantee_value,
    actions: [
      {
        id: legacy.id ?? 0,
        action: legacy.action,
      },
    ],
  };
}, workflowPermissionGroupedSchema);

export const workflowPermissionInputSchema = z.object({
  grantee_type: backendPermissionGranteeTypeSchema,
  grantee_value: z.string(),
  action: backendPermissionActionSchema,
});

const formPermissionGroupedSchema = z.object({
  form_id: z.number(),
  grantee_type: backendPermissionGranteeTypeSchema,
  grantee_value: z.string(),
  actions: z.array(backendPermissionActionItemSchema),
});

const formPermissionLegacySchema = z.object({
  id: z.number().optional(),
  form_id: z.number(),
  grantee_type: backendPermissionGranteeTypeSchema,
  grantee_value: z.string(),
  action: backendPermissionActionSchema,
});

export const formPermissionSchema = z.preprocess((value) => {
  const parsed = formPermissionLegacySchema.safeParse(value);
  if (!parsed.success) return value;

  const legacy = parsed.data;
  return {
    form_id: legacy.form_id,
    grantee_type: legacy.grantee_type,
    grantee_value: legacy.grantee_value,
    actions: [
      {
        id: legacy.id ?? 0,
        action: legacy.action,
      },
    ],
  };
}, formPermissionGroupedSchema);

export const formPermissionInputSchema = z.object({
  grantee_type: backendPermissionGranteeTypeSchema,
  grantee_value: z.string(),
  action: backendPermissionActionSchema,
});

export const workflowPermissionsSchema = z.array(workflowPermissionSchema);
export const formPermissionsSchema = z.array(formPermissionSchema);

export type BackendPermissionGranteeType = z.infer<
  typeof backendPermissionGranteeTypeSchema
>;
export type BackendPermissionAction = z.infer<
  typeof backendPermissionActionSchema
>;
export type BackendPermissionActionItem = z.infer<
  typeof backendPermissionActionItemSchema
>;
export type BackendWorkflowPermission = z.infer<typeof workflowPermissionSchema>;
export type BackendFormPermission = z.infer<typeof formPermissionSchema>;
export type BackendWorkflowPermissionInput = z.infer<
  typeof workflowPermissionInputSchema
>;
export type BackendFormPermissionInput = z.infer<
  typeof formPermissionInputSchema
>;
export type BackendWorkflowPermissionDeleteQuery =
  Partial<BackendWorkflowPermissionInput>;
export type BackendFormPermissionDeleteQuery =
  Partial<BackendFormPermissionInput>;
