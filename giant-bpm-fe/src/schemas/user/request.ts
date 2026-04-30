import { z } from "zod";

/**
 * Schema for POST /users request
 */
export const CreateUserRequestSchema = z.object({
  code: z.string(),
  name: z.string(),
  jobGrade: z.number(),
  defaultOrgCode: z.string().optional(),
});

export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;

/**
 * Schema for PATCH /users/:id request
 */
export const UpdateUserRequestSchema = z.object({
  name: z.string().optional(),
  jobGrade: z.number().optional(),
  defaultOrgCode: z.string().optional(),
});

export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;

/**
 * Schema for POST /org-units/memberships request
 */
export const CreateMembershipRequestSchema = z.object({
  orgUnitCode: z.string(),
  userId: z.number(),
  assignType: z.string(),
  startDate: z.string(),
  endDate: z.string().optional(),
  isIndefinite: z.boolean().optional(),
  note: z.string().optional(),
});

export type CreateMembershipRequest = z.infer<
  typeof CreateMembershipRequestSchema
>;

/**
 * Schema for PATCH /org-units/memberships/:id request
 */
export const UpdateMembershipRequestSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isIndefinite: z.boolean().optional(),
  note: z.string().optional(),
});

export type UpdateMembershipRequest = z.infer<
  typeof UpdateMembershipRequestSchema
>;
