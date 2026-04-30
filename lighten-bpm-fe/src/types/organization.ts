import { Unit } from "./domain";
export type { OrgHead } from "./domain";

/**
 * Extended Organization Unit with Head information
 * Used in the organization management interface
 */
export interface OrgUnitWithHeads extends Unit {
  activeHead?: import("./domain").OrgHead;
}

/**
 * Request payload for updating an organization unit
 */
export interface UpdateOrgUnitRequest {
  name?: string;
  code?: string;
  parentCode?: string | null;
}

/**
 * Request payload for setting a user's default organization
 */
export interface SetUserDefaultOrgRequest {
  defaultOrgId: string;
}
