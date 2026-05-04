import { z } from "zod";
export const tagSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  color: z.string(),
  created_by: z.number().optional(),
  created_at: z.string().optional(),
});

export type TagResponse = z.infer<typeof tagSchema>;

export const userSchema = z.object({
  id: z.number(),
  code: z.string().nullable().optional(),
  sub: z.string().nullable().optional(),
  name: z.string(),
  email: z.string().nullable().optional(),
  jobGrade: z.number().optional(),
  defaultOrgId: z.number().optional(),
  defaultOrgCode: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().nullable().optional(),
  isAdmin: z.boolean().optional(),
  lang: z.string().optional(),
});

export type UserResponse = z.infer<typeof userSchema>;

const orgSchema = z.object({
  id: z.number(),
  code: z.string(),
  name: z.string(),
  type: z.enum(["ORG_UNIT", "ROLE"]),
  parent: z.string().optional(),
  members: z.array(userSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

interface OrgUnit {
  id: number;
  code: string;
  name: string;
  type: "ORG_UNIT" | "ROLE";
  parent?: OrgUnit;
  children?: z.infer<typeof orgSchema>[];
  members?: UserResponse[];
  heads?: UserResponse[];
  createdAt: string;
  updatedAt: string;
}

export const orgUnitSchema: z.ZodType<OrgUnit> = z.lazy(() =>
  z.object({
    id: z.number(),
    code: z.string(),
    name: z.string(),
    type: z.enum(["ORG_UNIT", "ROLE"]),
    parent: orgUnitSchema.optional(),
    children: z.array(orgSchema).optional(),
    members: z.array(userSchema).optional(),
    heads: z.array(userSchema).optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
);
export type OrgUnitResponse = z.infer<typeof orgUnitSchema>;
export const orgUnitListSchema = z.array(orgUnitSchema);
export type OrgUnitListResposne = z.infer<typeof orgUnitListSchema>;
