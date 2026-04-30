/**
 * Represents a user's membership in an organization unit
 * Transformed from OrgMembershipResponse
 */
export interface OrgMembership {
  id: string;
  orgUnitId: string;
  orgUnitCode: string;
  orgUnitName: string;
  userId: string;
  startDate: string;
  endDate?: string;
  isIndefinite: boolean;
  assignType: string;
  isExpired: boolean;
}
