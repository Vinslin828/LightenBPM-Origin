/**
 * System-wide constants
 */

/**
 * Standard far-future date to represent an indefinite membership end date (no expiration).
 * Using 2999-12-31 to maintain compatibility with existing date comparison logic.
 */
export const INDEFINITE_MEMBERSHIP_END_DATE = new Date('2999-12-31T23:59:59Z');

/**
 * Controls behavior when creating a User/OrgUnit whose code belongs to a soft-deleted record.
 * false (default): throw a structured ConflictException; frontend handles restore manually.
 * true: auto-restore the deleted record in place.
 */
export const AUTO_RESTORE_ON_CREATE_CONFLICT = false;
