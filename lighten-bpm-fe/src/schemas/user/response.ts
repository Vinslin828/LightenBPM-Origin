import { z } from "zod";

/**
 * Nested user object in OrgMemberDto response
 */
const MemberUserSchema = z.object({
  id: z.number(),
  code: z.string().nullable().optional(),
  name: z.string(),
  email: z.string().nullable().optional(),
  jobGrade: z.number().optional(),
  defaultOrgId: z.number().optional(),
  defaultOrgCode: z.string().optional(),
  isAdmin: z.boolean().optional(),
});

/**
 * Schema for OrgMemberDto — the actual response from
 * GET /org-units/memberships/user/:userId
 *
 * Matches backend OrgMemberDto shape exactly.
 */
export const OrgMembershipSchema = z.object({
  id: z.number(),
  orgUnitCode: z.string(),
  user: MemberUserSchema,
  assignType: z.string(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  note: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().nullable().optional(),
});

export type OrgMembershipResponse = z.infer<typeof OrgMembershipSchema>;

export const OrgMembershipListSchema = z.array(OrgMembershipSchema);

export type OrgMembershipListResponse = z.infer<
  typeof OrgMembershipListSchema
>;
