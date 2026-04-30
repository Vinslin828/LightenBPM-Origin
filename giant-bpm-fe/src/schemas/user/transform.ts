import { OrgMembership } from "@/types/user-management";
import { OrgMembershipResponse } from "./response";
import {
  CreateMembershipRequest,
  UpdateMembershipRequest,
} from "./request";

const INDEFINITE_END_DATE = "2999-12-31T23:59:59Z";

/**
 * Checks if a membership is expired based on its endDate
 */
function isMembershipExpired(endDate?: string | null): boolean {
  if (!endDate) return false;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return false;
  if (end.getFullYear() >= 2999) return false;
  return new Date() > end;
}

/**
 * Checks if a membership has an indefinite end date
 */
function isIndefiniteDate(endDate?: string | null): boolean {
  if (!endDate) return true;
  const end = new Date(endDate);
  return end.getFullYear() >= 2999;
}

/**
 * Transform: OrgMembershipResponse (OrgMemberDto) → OrgMembership
 *
 * Backend OrgMemberDto has:
 * - orgUnitCode (string) — no orgUnitId or orgUnitName
 * - user (nested UserDto) — provides userId
 * - assignType, startDate, endDate
 *
 * orgUnitName must be resolved by the UI using the org units list.
 */
export function tOrgMembership(
  response: OrgMembershipResponse,
): OrgMembership {
  const endDate = response.endDate ?? undefined;

  return {
    id: response.id.toString(),
    orgUnitId: "", // Not available in OrgMemberDto — resolved by UI
    orgUnitCode: response.orgUnitCode,
    orgUnitName: response.orgUnitCode, // Fallback to code; UI resolves to name
    userId: response.user.id.toString(),
    startDate: response.startDate,
    endDate: isIndefiniteDate(endDate) ? undefined : (endDate ?? undefined),
    isIndefinite: isIndefiniteDate(endDate),
    assignType: response.assignType,
    isExpired: isMembershipExpired(endDate),
  };
}

/**
 * Transform: OrgMembershipResponse[] → OrgMembership[]
 */
export function tOrgMembershipList(
  responses: OrgMembershipResponse[],
): OrgMembership[] {
  return responses.map(tOrgMembership);
}

/**
 * Parser: frontend create membership data → CreateMembershipRequest
 */
export function parseCreateMembership(data: {
  orgUnitCode: string;
  userId: string;
  startDate: string;
  endDate?: string;
  isIndefinite?: boolean;
  note?: string;
}): CreateMembershipRequest {
  return {
    orgUnitCode: data.orgUnitCode,
    userId: Number(data.userId),
    assignType: "USER",
    startDate: data.startDate,
    endDate: data.isIndefinite ? INDEFINITE_END_DATE : data.endDate,
    isIndefinite: data.isIndefinite,
    note: data.note,
  };
}

/**
 * Parser: frontend update membership data → UpdateMembershipRequest
 */
export function parseUpdateMembership(data: {
  startDate?: string;
  endDate?: string;
  isIndefinite?: boolean;
  note?: string;
}): UpdateMembershipRequest {
  return {
    startDate: data.startDate,
    endDate: data.isIndefinite ? INDEFINITE_END_DATE : data.endDate,
    isIndefinite: data.isIndefinite,
    note: data.note,
  };
}
