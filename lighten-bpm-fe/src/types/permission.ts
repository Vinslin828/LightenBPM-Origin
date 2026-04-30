export enum PermissionGranteeType {
  USER = "USER",
  ORG = "ORG",
  JOB_GRADE = "JOB_GRADE",
  ROLE = "ROLE",
  EVERYONE = "EVERYONE",
}

export enum PermissionAction {
  VIEW = "view",
  USE = "use",
  MANAGE = "manage",
}

export enum PermissionScope {
  ADMIN = "admin",
  EVERYONE = "everyone",
  INVITED = "invited",
}

export enum PermissionTabKey {
  ALL = "all",
  USER = "user",
  ROLE = "role",
  ORG = "org",
}

export type Permission = {
  scope: PermissionScope;
  permissions: AllPermissionData;
};

export type WorkflowPermission = {
  id: number;
  workflow_id: number;
  grantee_type: PermissionGranteeType;
  grantee_value: string;
  actions: PermissionAction[];
};

export type FormPermission = {
  id: number;
  form_id: number;
  grantee_type: PermissionGranteeType;
  grantee_value: string;
  actions: PermissionAction[];
};

export type ApplicationShare = {
  id: number;
  user_id: number;
  reason: string;
  workflow_instance_id: number;
  created_by: number;
  created_at: string;
};

export type ApplicationShareInput = {
  user_id: number;
  reason: string;
};

export type ApplicationShareDeleteQuery = {
  user_id: string;
};

export type PermissionItem = {
  granteeType: PermissionGranteeType;
  value: string; // user id, org id, role id,
  actions: PermissionAction[];
};
export type AllPermissionData = {
  user: PermissionItem[];
  role: PermissionItem[];
  org: PermissionItem[];
};
