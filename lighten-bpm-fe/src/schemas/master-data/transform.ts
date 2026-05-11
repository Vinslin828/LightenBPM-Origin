import { OrgHead, Tag, Unit, User } from "@/types/domain";
import { OrgUnitResponse, TagResponse, UserResponse } from "./response";

export function tTag(tag: TagResponse) {
  return {
    id: tag.id.toString(),
    name: tag.name,
    description: tag.description,
    color: tag.color,
    abbrev: tag.name,
    createdAt: tag.created_at ?? "",
    createdBy: tag.created_by ? tag.created_by.toString() : "",
  } satisfies Tag;
}
export function tUser(user: UserResponse): User {
  return {
    id: user.id.toString(),
    code: user.code ?? "",
    name: user.name,
    email: user.email ?? "",
    jobGrade: user.jobGrade ?? 0,
    tags: [],
    roles: [],
    defaultOrgId: user.defaultOrgId ? user.defaultOrgId.toString() : "",
    defaultOrgCode: user.defaultOrgCode ? user.defaultOrgCode.toString() : "",
    isAdmin: user.isAdmin ?? false,
    lang: user.lang ?? "en",
  };
}
export function tOrgUnit(org: OrgUnitResponse): Unit {
  return {
    id: org.id.toString(),
    name: org.name,
    defaultName: org.name,
    nameTranslations: org.nameTranslations,
    members: org.members?.map((m) => tUser(m)) ?? [],
    code: org.code,
    parent: org.parent ? tOrgUnit(org.parent) : undefined,
    heads: org.heads?.map(
      (u): OrgHead => ({
        id: u.id.toString(),
        userId: u.id.toString(),
        orgUnitId: org.id.toString(),
        startDate: "",
        endDate: undefined,
        user: tUser(u),
        isActive: true,
      }),
    ),
    createdAt: org.createdAt ?? "",
    updatedAt: org.updatedAt ?? "",
  };
}
