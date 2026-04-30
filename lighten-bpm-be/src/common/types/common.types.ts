export enum SORTING_DIRECTION {
  ASC = 'asc',
  DESC = 'desc',
}

// Re-export Prisma Enums to decouple application logic from ORM
export {
  InstanceStatus,
  PriorityLevel,
  RevisionState,
  ApprovalStatus,
  NodeStatus,
  NodeType,
  WorkflowAction,
  NodeResult,
  AssignType,
  OrgUnitType,
  ValidationType,
  PermissionAction,
  GranteeType,
} from '@prisma/client';

// Re-export Prisma classes
export type {
  ApprovalTask,
  ApplicationInstance,
  Tag,
  Form,
  FormInstance,
  FormInstanceData,
  FormTag,
  FormRevision,
  FormOptions,
  FormWorkflowBinding,
  OrgUnit,
  OrgMembership,
  Workflow,
  WorkflowOptions,
  WorkflowRevisions,
  WorkflowTag,
  WorkflowNode,
  WorkflowInstance,
  WorkflowEvent,
  WorkflowComment,
  UserDefaultOrg,
  InstanceShare,
  ValidationRegistry,
  ValidationComponentMapping,
  Attachment,
} from '@prisma/client';

import { User as PrismaUser, OrgUnit } from '@prisma/client';
export type User = PrismaUser & {
  default_org_id?: number | null;
  resolved_default_org?: OrgUnit;
};
