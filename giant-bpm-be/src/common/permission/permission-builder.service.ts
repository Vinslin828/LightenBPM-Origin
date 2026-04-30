import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser, isAdminUser } from '../../auth/types/auth-user';
import { GranteeType, PermissionAction } from '../../common/types/common.types';

export interface ResourcePermission {
  action: PermissionAction;
  grantee_type: GranteeType;
  grantee_value: string;
}

@Injectable()
export class PermissionBuilderService {
  private readonly logger = new Logger(PermissionBuilderService.name);

  /**
   * Generates a Prisma WHERE clause for Form visibility.
   * Logic: Creator OR Admin OR (Matching Permission Record)
   */
  getFormVisibilityWhere(user: AuthUser): Prisma.FormWhereInput {
    if (isAdminUser(user)) {
      return {}; // Admins see everything
    }

    return {
      OR: [
        { created_by: user.id },
        {
          permissions: {
            some: {
              action: PermissionAction.VIEW,
              OR: this.getGranteeFilters<Prisma.FormPermissionWhereInput>(user),
            },
          },
        },
      ],
    };
  }

  /**
   * Generates a Prisma WHERE clause for Workflow visibility.
   */
  getWorkflowVisibilityWhere(user: AuthUser): Prisma.WorkflowWhereInput {
    if (isAdminUser(user)) {
      return {};
    }

    return {
      OR: [
        { created_by: user.id },
        {
          permissions: {
            some: {
              action: PermissionAction.VIEW,
              OR: this.getGranteeFilters<Prisma.WorkflowPermissionWhereInput>(
                user,
              ),
            },
          },
        },
      ],
    };
  }

  /**
   * Generates a Prisma WHERE clause for Workflow usage (Apply).
   */
  getWorkflowUsageWhere(user: AuthUser): Prisma.WorkflowWhereInput {
    if (isAdminUser(user)) {
      return {};
    }

    return {
      OR: [
        { created_by: user.id },
        {
          permissions: {
            some: {
              action: PermissionAction.USE,
              OR: this.getGranteeFilters<Prisma.WorkflowPermissionWhereInput>(
                user,
              ),
            },
          },
        },
      ],
    };
  }

  /**
   * Generates a Prisma WHERE clause for Application Instance visibility.
   * Logic: Applicant OR Shared OR Involved (Approver/CC)
   */
  getInstanceVisibilityWhere(
    user: AuthUser,
  ): Prisma.WorkflowInstanceWhereInput {
    if (isAdminUser(user)) {
      return {};
    }

    // Note: This logic will need to be refined as we integrate with other services
    return {
      OR: [
        { applicant_id: user.id },
        {
          instance_shares: {
            some: {
              user_id: user.id,
            },
          },
        },
        {
          workflow_nodes: {
            some: {
              approval_tasks: {
                some: {
                  OR: [{ assignee_id: user.id }, { escalated_to: user.id }],
                },
              },
            },
          },
        },
      ],
    };
  }

  /**
   * Individual action check (non-filtering).
   * @param user The current authenticated user
   * @param action The action being performed (VIEW, USE, MANAGE)
   * @param permissions Array of permission records for the resource
   * @param creatorId Optional ID of the resource creator
   */
  canPerformAction(
    user: AuthUser,
    action: PermissionAction,
    permissions: ResourcePermission[],
    creatorId?: number,
  ): boolean {
    if (isAdminUser(user)) return true;
    if (creatorId && user.id === creatorId) return true;

    return permissions.some((p) => {
      if (p.action !== action) return false;

      switch (p.grantee_type) {
        case GranteeType.EVERYONE:
          return true;
        case GranteeType.USER:
          return (
            String(user.id) === p.grantee_value || user.sub === p.grantee_value
          );
        case GranteeType.ORG_UNIT:
          return user.orgIds.includes(parseInt(p.grantee_value, 10));
        case GranteeType.ROLE:
          return user.roleIds.includes(parseInt(p.grantee_value, 10));
        case GranteeType.JOB_GRADE:
          // For Job Grade, we assume the value represents a minimum required grade level
          // Using the same logic as getGranteeFilters: grantee_value <= user.jobGrade
          return parseInt(p.grantee_value, 10) <= user.jobGrade;
        default:
          return false;
      }
    });
  }

  /**
   * Normalizes a set of permissions by ensuring that any grantee with
   * USE or MANAGE permission also has VIEW permission.
   *
   * @param permissions The original array of permissions
   * @returns A new array of permissions, augmented with VIEW if needed
   */
  static normalizePermissions<T extends ResourcePermission>(
    permissions: T[],
  ): T[] {
    if (!permissions || permissions.length === 0) return [];

    const normalized = [...permissions];
    const granteeActions = new Map<string, Set<PermissionAction>>();

    // Track existing actions for each grantee
    for (const p of permissions) {
      const key = `${p.grantee_type}:${p.grantee_value}`;
      if (!granteeActions.has(key)) {
        granteeActions.set(key, new Set());
      }
      granteeActions.get(key)!.add(p.action);
    }

    // Add VIEW permission for grantees that need it but don't have it
    for (const [key, actions] of granteeActions.entries()) {
      const hasView = actions.has(PermissionAction.VIEW);
      const needsView =
        actions.has(PermissionAction.USE) ||
        actions.has(PermissionAction.MANAGE);

      if (needsView && !hasView) {
        const firstColonIdx = key.indexOf(':');
        const type = key.substring(0, firstColonIdx);
        const value = key.substring(firstColonIdx + 1);

        normalized.push({
          grantee_type: type as GranteeType,
          grantee_value: value,
          action: PermissionAction.VIEW,
        } as T);
      }
    }

    return normalized;
  }

  /**
   * Builds the common Grantee Filters for USER, ORG_UNIT, ROLE, JOB_GRADE, EVERYONE.
   */
  private getGranteeFilters<T>(user: AuthUser): T[] {
    const orgIdsStrs = user.orgIds.map(String);
    const roleIdsStrs = user.roleIds.map(String);

    return [
      { grantee_type: GranteeType.EVERYONE },
      { grantee_type: GranteeType.USER, grantee_value: String(user.id) },
      {
        grantee_type: GranteeType.ORG_UNIT,
        grantee_value: { in: orgIdsStrs },
      },
      {
        grantee_type: GranteeType.ROLE,
        grantee_value: { in: roleIdsStrs },
      },
      {
        grantee_type: GranteeType.JOB_GRADE,
        grantee_value: { lte: String(user.jobGrade) },
      },
    ] as T[];
  }
}
