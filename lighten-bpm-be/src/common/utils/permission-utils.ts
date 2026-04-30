import { GranteeType } from '../types/common.types';

export interface BasePermissionRecord {
  id: number;
  grantee_type: GranteeType;
  grantee_value: string;
}

export interface AggregatedPermission<A> {
  grantee_type: GranteeType;
  grantee_value: string;
  actions: A[];
  [key: string]: any;
}

/**
 * Aggregates flat permission records into a grouped structure by grantee.
 */
export function aggregatePermissions<
  T extends BasePermissionRecord,
  A,
  R extends AggregatedPermission<A>,
>(
  permissions: T[],
  resourceIdKey: string,
  resourceIdValue: number,
  actionMapper: (p: T) => A,
): R[] {
  const grouped = permissions.reduce(
    (acc, p) => {
      const key = `${p.grantee_type}:${p.grantee_value}`;
      if (!acc[key]) {
        acc[key] = {
          grantee_type: p.grantee_type,
          grantee_value: p.grantee_value,
          [resourceIdKey]: resourceIdValue,
          actions: [],
        } as unknown as R;
      }
      acc[key].actions.push(actionMapper(p));
      return acc;
    },
    {} as Record<string, R>,
  );

  return Object.values(grouped);
}

export interface BaseShareRecord {
  id: number;
  user_id: number;
  workflow_instance_id: number;
}

export interface AggregatedShare<A> {
  user_id: number;
  workflow_instance_id: number;
  shares: A[];
}

/**
 * Aggregates flat share records into a grouped structure by user.
 */
export function aggregateShares<
  T extends BaseShareRecord,
  A,
  R extends AggregatedShare<A>,
>(shares: T[], actionMapper: (p: T) => A): R[] {
  const grouped = shares.reduce(
    (acc, s) => {
      const key = String(s.user_id);
      if (!acc[key]) {
        acc[key] = {
          user_id: s.user_id,
          workflow_instance_id: s.workflow_instance_id,
          shares: [],
        } as unknown as R;
      }
      acc[key].shares.push(actionMapper(s));
      return acc;
    },
    {} as Record<string, R>,
  );

  return Object.values(grouped);
}
