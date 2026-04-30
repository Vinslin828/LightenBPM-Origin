import {
  User as PrismaUser,
  OrgUnitType,
  OrgMembership,
  OrgUnit,
} from '../../common/types/common.types';

export interface AuthUser {
  id: number;
  code: string;
  sub: string;
  name: string;
  bpmRole?: string;
  email: string | null;
  jobGrade: number;
  defaultOrgCode: string;
  orgIds: number[];
  roleIds: number[];
  createAt: Date;
  updatedAt?: Date;
}

export function fromPrisma(
  user: PrismaUser & {
    default_org?: { code: string };
    org_memberships?: (OrgMembership & { org_unit: OrgUnit })[];
  },
  bpmRole?: string,
): AuthUser {
  const orgIds: number[] = [];
  const roleIds: number[] = [];

  if (user.org_memberships) {
    user.org_memberships.forEach((m) => {
      if (m.org_unit) {
        if (m.org_unit.type === OrgUnitType.ORG_UNIT) {
          orgIds.push(m.org_unit.id);
        } else if (m.org_unit.type === OrgUnitType.ROLE) {
          roleIds.push(m.org_unit.id);
        }
      }
    });
  }

  return {
    id: user.id,
    code: user.code,
    sub: user.sub!,
    name: user.name,
    bpmRole,
    email: user.email,
    jobGrade: user.job_grade,
    defaultOrgCode: user.default_org?.code || '',
    orgIds,
    roleIds,
    createAt: user.created_at,
    updatedAt: user.updated_at ?? undefined,
  };
}

export function isAdminUser(user: AuthUser): boolean {
  return user.bpmRole === 'admin';
}
