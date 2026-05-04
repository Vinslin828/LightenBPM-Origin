import { OrgHead } from "@/types/domain";
import { OrgHeadResponse } from "./head-response";

/**
 * Checks if a Head is currently active based on effective dates
 * @param startDate - ISO date string for when the Head assignment starts
 * @param endDate - ISO date string for when the Head assignment ends (null = indefinite)
 * @returns true if the current date is within the effective date range
 */
export function isHeadActive(
  startDate: string,
  endDate?: string | null,
): boolean {
  const now = new Date();
  const start = new Date(startDate);

  if (Number.isNaN(start.getTime())) return false;

  // If start date is in the future, not active yet
  if (now < start) return false;

  // If no end date, active indefinitely
  if (!endDate) return true;

  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return false;
  // Check if current date is within the range (inclusive of end date)
  return now <= end;
}

const toHeadUser = (user: OrgHeadResponse["user"]) => {
  if (!user) return null;

  return {
    id: String(user.id),
    code: "",
    name: user.name,
    email: user.email ?? "",
    jobGrade: user.jobGrade ?? 0,
    tags: [],
    roles: [],
    defaultOrgId: user.defaultOrgId ? String(user.defaultOrgId) : "",
    defaultOrgCode: user.defaultOrgCode ? String(user.defaultOrgCode) : "",
    isAdmin: Boolean(user.isAdmin),
    lang: (user as any).lang ?? "en",
  };
};

/**
 * Transforms Organization Head API response to frontend type
 * Includes computed isActive field based on effective dates
 */
export function tOrgHead(head: OrgHeadResponse): OrgHead | null {
  const user = toHeadUser(head.user);
  if (!user) return null;

  const startDate = head.start_date ?? head.startDate ?? "";
  const endDate = head.end_date ?? head.endDate ?? undefined;
  const userId = head.user_id ?? head.userId ?? Number(user.id);
  const orgUnitId = head.org_unit_id ?? head.orgUnitId ?? 0;

  return {
    id: head.id.toString(),
    userId: userId ? String(userId) : "",
    orgUnitId: orgUnitId ? String(orgUnitId) : "",
    startDate,
    endDate,
    user,
    isActive: isHeadActive(startDate, endDate),
  };
}

/**
 * Transforms a list of Organization Head responses
 */
export function tOrgHeadList(heads: OrgHeadResponse[]): OrgHead[] {
  return heads.map(tOrgHead).filter((head): head is OrgHead => Boolean(head));
}

/**
 * Filters a list of heads to only active ones
 */
export function filterActiveHeads(heads: OrgHead[]): OrgHead[] {
  return heads.filter((head) => head.isActive);
}

/**
 * Gets the currently active Head from a list (should only be one)
 * Returns undefined if no active Head exists
 */
export function getActiveHead(heads: OrgHead[]): OrgHead | undefined {
  return heads.find((head) => head.isActive);
}
