import { z } from "zod";

const orgHeadUserSchema = z.object({
  id: z.number(),
  code: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  jobGrade: z.number().nullable().optional(),
  defaultOrgId: z.number().nullable().optional(),
  defaultOrgCode: z.string().nullable().optional(),
  isAdmin: z.boolean().nullable().optional(),
  sub: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});

/**
 * Schema for Organization Unit Head API response
 * Represents a user assigned as Head of an org unit with effective dates
 */
export const orgHeadSchema = z.object({
  id: z.number(),
  user_id: z.number().optional(),
  userId: z.number().optional(),
  org_unit_id: z.number().optional(),
  orgUnitId: z.number().optional(),
  start_date: z.string().optional(), // ISO date string
  startDate: z.string().optional(),
  end_date: z.string().nullable().optional(), // null means active indefinitely
  endDate: z.string().nullable().optional(),
  user: orgHeadUserSchema.optional(), // Full or partial user object
});

export type OrgHeadResponse = z.infer<typeof orgHeadSchema>;

/**
 * Schema for list of org unit heads
 */
export const orgHeadListSchema = z.array(orgHeadSchema);

export type OrgHeadListResponse = z.infer<typeof orgHeadListSchema>;
