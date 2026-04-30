import {
  Permission,
  PermissionAction,
  PermissionGranteeType,
  PermissionScope,
  PermissionItem,
  AllPermissionData,
  WorkflowPermission,
  FormPermission,
} from "@/types/permission";
import {
  BackendFormPermission,
  BackendPermissionAction,
  BackendPermissionGranteeType,
  BackendWorkflowPermission,
} from "./response";

const tPermissionGranteeType = (
  value: BackendPermissionGranteeType,
): PermissionGranteeType => {
  switch (value) {
    case "ORG_UNIT":
      return PermissionGranteeType.ORG;
    case "USER":
      return PermissionGranteeType.USER;
    case "JOB_GRADE":
      return PermissionGranteeType.JOB_GRADE;
    case "ROLE":
      return PermissionGranteeType.ROLE;
    case "EVERYONE":
      return PermissionGranteeType.EVERYONE;
    default:
      return PermissionGranteeType.USER;
  }
};

const tPermissionAction = (
  value: BackendPermissionAction,
): PermissionAction => {
  switch (value) {
    case "VIEW":
      return PermissionAction.VIEW;
    case "USE":
      return PermissionAction.USE;
    case "MANAGE":
      return PermissionAction.MANAGE;
    default:
      return PermissionAction.VIEW;
  }
};

const emptyPermissionData = (): AllPermissionData => ({
  user: [],
  role: [],
  org: [],
});

const groupPermissionData = (
  entries: PermissionItem[],
): AllPermissionData => ({
  user: entries.filter(
    (entry) => entry.granteeType === PermissionGranteeType.USER,
  ),
  role: entries.filter(
    (entry) => entry.granteeType === PermissionGranteeType.ROLE,
  ),
  org: entries.filter(
    (entry) => entry.granteeType === PermissionGranteeType.ORG,
  ),
});

const permissionActionOrder: PermissionAction[] = [
  PermissionAction.VIEW,
  PermissionAction.USE,
  PermissionAction.MANAGE,
];

const sortPermissionActions = (actions: PermissionAction[]) =>
  [...actions].sort(
    (a, b) => permissionActionOrder.indexOf(a) - permissionActionOrder.indexOf(b),
  );

const mergePermissionEntries = (
  entries: Array<{
    granteeType: PermissionGranteeType;
    value: string;
    action: PermissionAction;
  }>,
): PermissionItem[] => {
  const grouped = new Map<
    string,
    { granteeType: PermissionGranteeType; value: string; actions: Set<PermissionAction> }
  >();

  entries.forEach((entry) => {
    const key = `${entry.granteeType}::${entry.value}`;
    const found = grouped.get(key);
    if (found) {
      found.actions.add(entry.action);
      return;
    }

    grouped.set(key, {
      granteeType: entry.granteeType,
      value: entry.value,
      actions: new Set([entry.action]),
    });
  });

  return Array.from(grouped.values()).map((entry) => ({
    granteeType: entry.granteeType,
    value: entry.value,
    actions: sortPermissionActions(Array.from(entry.actions)),
  }));
};

export const tWorkflowPermissions = (
  entries: BackendWorkflowPermission[],
): Permission => {
  if (!entries.length) {
    return { scope: PermissionScope.ADMIN, permissions: emptyPermissionData() };
  }

  const flattenedEntries = entries.flatMap((entry) =>
    entry.actions.map((actionItem) => ({
      granteeType: tPermissionGranteeType(entry.grantee_type),
      value: entry.grantee_value,
      action: tPermissionAction(actionItem.action),
    })),
  );
  const permissions = mergePermissionEntries(flattenedEntries);

  const scope = permissions.some(
    (entry) => entry.granteeType === PermissionGranteeType.EVERYONE,
  )
    ? PermissionScope.EVERYONE
    : PermissionScope.INVITED;

  return {
    scope,
    permissions: groupPermissionData(permissions),
  };
};

export const tFormPermissions = (
  entries: BackendFormPermission[],
): Permission => {
  if (!entries.length) {
    return { scope: PermissionScope.ADMIN, permissions: emptyPermissionData() };
  }

  const flattenedEntries = entries.flatMap((entry) =>
    entry.actions.map((actionItem) => ({
      granteeType: tPermissionGranteeType(entry.grantee_type),
      value: entry.grantee_value,
      action: tPermissionAction(actionItem.action),
    })),
  );
  const permissions = mergePermissionEntries(flattenedEntries);

  const scope = permissions.some(
    (entry) => entry.granteeType === PermissionGranteeType.EVERYONE,
  )
    ? PermissionScope.EVERYONE
    : PermissionScope.INVITED;

  return {
    scope,
    permissions: groupPermissionData(permissions),
  };
};

export const tPermissionFromWorkflowPermissions = (
  entries: WorkflowPermission[],
): Permission => {
  if (!entries.length) {
    return { scope: PermissionScope.ADMIN, permissions: emptyPermissionData() };
  }

  const scope = entries.some(
    (entry) => entry.grantee_type === PermissionGranteeType.EVERYONE,
  )
    ? PermissionScope.EVERYONE
    : PermissionScope.INVITED;

  const flattenedEntries = entries.flatMap((entry) =>
    entry.actions.map((action) => ({
      granteeType: entry.grantee_type,
      value: entry.grantee_value,
      action,
    })),
  );
  const permissions = mergePermissionEntries(flattenedEntries);

  return {
    scope,
    permissions: groupPermissionData(permissions),
  };
};

export const tPermissionFromFormPermissions = (
  entries: FormPermission[],
): Permission => {
  if (!entries.length) {
    return { scope: PermissionScope.ADMIN, permissions: emptyPermissionData() };
  }

  const scope = entries.some(
    (entry) => entry.grantee_type === PermissionGranteeType.EVERYONE,
  )
    ? PermissionScope.EVERYONE
    : PermissionScope.INVITED;

  const flattenedEntries = entries.flatMap((entry) =>
    entry.actions.map((action) => ({
      granteeType: entry.grantee_type,
      value: entry.grantee_value,
      action,
    })),
  );
  const permissions = mergePermissionEntries(flattenedEntries);

  return {
    scope,
    permissions: groupPermissionData(permissions),
  };
};
