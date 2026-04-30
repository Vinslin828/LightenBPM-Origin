import { z } from "zod";

export const validateFieldsCodeSchema = z.object({
  code: z.string(),
  errorMessage: z.string(),
});

export const validateFieldsFormValidatorSchema = z.object({
  code: z.string(),
  errorMessage: z.string(),
});

export const validateFieldsRequestSchema = z.object({
  codes: z.array(validateFieldsCodeSchema).optional().default([]),
  registryIds: z.array(z.string()).optional().default([]),
  currentField: z.string().optional(),
  formValidators: z
    .array(validateFieldsFormValidatorSchema)
    .optional()
    .default([]),
  formData: z.record(z.string(), z.unknown()),
});

export const validateFieldsResponseSchema = z.object({
  isValid: z.boolean(),
  message: z.string().optional(),
  errors: z
    .array(
      z.object({
        code: z.number(),
        message: z.string(),
      }),
    )
    .default([]),
});

export type ValidateFieldsRequest = z.infer<typeof validateFieldsRequestSchema>;
export type ValidateFieldsResponse = z.infer<
  typeof validateFieldsResponseSchema
>;
