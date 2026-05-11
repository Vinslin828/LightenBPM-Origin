import {
  OrgMembership,
  OrgUnit,
  User,
  UserDefaultOrg,
} from '../../common/types/common.types';

export const ORG_CODE_UNASSIGNED = 'UNASSIGNED';

// User shape returned when fetched as a nested relation inside an org-unit query.
// Includes org_memberships and default_org_preference so that UserDto.fromPrisma
// can resolve defaultOrgId / defaultOrgCode without a separate lookup.
export type OrgUnitMemberUser = User & {
  org_memberships?: (OrgMembership & { org_unit: OrgUnit })[];
  default_org_preference?: (UserDefaultOrg & { org_unit: OrgUnit }) | null;
};

export type OrgUnitTranslation = {
  id: number;
  org_unit_id: number;
  lang: string;
  name: string;
  created_at?: Date;
  updated_at?: Date;
};

export type OrgUnitWithRelations = OrgUnit & {
  parent?: OrgUnitWithRelations | null;
  children?: OrgUnitWithRelations[];
  translations?: OrgUnitTranslation[];
  members?: (OrgMembership & { user: OrgUnitMemberUser })[];
};

export type OrgMember = OrgMembership & {
  user: OrgUnitMemberUser;
  org_unit?: OrgUnit | null;
};
