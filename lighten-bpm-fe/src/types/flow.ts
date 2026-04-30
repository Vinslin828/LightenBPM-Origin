import { Node } from "@xyflow/react";
import {
  Tag,
  FlowDefinition,
  FormDefinition,
  Role,
  Unit,
  User,
} from "./domain";
import { SelectOption } from "@ui/select";

//================================================================================================
// Enums
//================================================================================================

export enum WorkflowNodeKey {
  Approval = "Approval",
  ParallelApproval = "ParallelApproval",
  Condition = "Condition",
  Subflow = "Subflow",
  Form = "Form",
  End = "End",
  Placeholder = "Placeholder",
  DummyNode = "DummyNode",
}

export enum WorkflowEdgeKey {
  Step = "Step",
  Menu = "Menu",
  Label = "Label",
}

//================================================================================================
// Base and Shared Interfaces
//================================================================================================

// Layout direction type
export type LayoutDirection = "TB" | "BT" | "LR" | "RL";

export interface LayoutOptions {
  direction?: LayoutDirection;
  nodeWidth?: number;
  nodeHeight?: number;
  nodeSpacing?: number;
  rankSpacing?: number;
}

// Base node data interface - compatible with ReactFlow's Record<string, unknown> requirement
interface BaseNodeData extends Record<string, unknown> {
  key?: string;
  label?: string;
  description?: string;
  next: string | null;
  parents: string[] | null;
}

// Lighten BPM Approver types based on schema
export enum ApproverType {
  Applicant = "applicant",
  ApplicantReportLine = "applicant-report-line",
  DepartmentSupervisor = "department-supervisor",
  UserReportLine = "user-report-line",
  Role = "role",
  User = "user",
}

type ApprovalBase = {
  approver: ApproverType;
  specificUser?: {
    type: "manual" | "reference";
    userId?: string;
    user?: User;
    reference?: string;
    userIds?: string[];
    users?: User[];
  };
  approveMethod?: {
    jobGrade?: number;
    approveLevel?: number;
  };
  advancedSetting?: string;
  departmentSupervisor?: {
    type: "manual" | "reference";
    departmentId?: string;
    department?: Unit;
    reference?: string;
  };
  specificRole?: {
    type: "manual" | "reference";
    roleId: string;
    role?: Role;
    reference?: string;
  };
  shouldSkip?: boolean;
};

interface ApplicantApproval extends ApprovalBase {
  approver: ApproverType.Applicant;
}

interface ApplicantReportLineApproval extends ApprovalBase {
  approver: ApproverType.ApplicantReportLine;
  approveMethod: ApproveMethod;
  advancedSetting: string;
}

export type ApproveMethod = JobGrade | ApproveLevel;
interface JobGrade {
  method: "to_job_grade";
  jobGrade: number;
}
interface ApproveLevel {
  method: "to_level";
  approveLevel: number;
}

interface UserReportingLineApproval extends ApprovalBase {
  approver: ApproverType.UserReportLine;
  specificUser:
    | {
        type: "manual";
        userId: string;
        user?: User;
      }
    | {
        type: "reference";
        userId: string;
        reference: string;
      };
  approveMethod: ApproveMethod;
  advancedSetting: string;
}

export interface DepartmentSupervisorApproval extends ApprovalBase {
  approver: ApproverType.DepartmentSupervisor;
  departmentSupervisor: ManualDepartment | ReferenceDepartment;
}
interface ManualDepartment {
  type: "manual";
  departmentId: string;
  department?: Unit;
}
interface ReferenceDepartment {
  type: "reference";
  reference: string;
  departmentId: string;
  department?: Unit;
}
interface RoleApproval extends ApprovalBase {
  approver: ApproverType.Role;
  specificRole:
    | {
        type: "manual";
        roleId: string;
        role?: Role;
      }
    | { type: "reference"; roleId: string };
}
interface UserApproval extends ApprovalBase {
  approver: ApproverType.User;
  specificUser:
    | {
        type: "manual";
        userIds: string[];
        users?: User[];
      }
    | {
        type: "reference";
        userId: string;
        reference: string;
      };
}

type ApprovalData =
  | ApplicantApproval
  | ApplicantReportLineApproval
  | UserReportingLineApproval
  | DepartmentSupervisorApproval
  | RoleApproval
  | UserApproval;

export interface BPMApprover {
  type: "user" | "role" | "expr";
  id: string;
}

export interface BPMApprovalType {
  mode: "single" | "all" | "count";
  require?: number;
}

export type Operator =
  | ">"
  | "<"
  | ">="
  | "<="
  | "=="
  | "!="
  | "contains"
  | "not_contains"
  | "equals"
  | "not_equals";

export const numberOperatorOptions: SelectOption<Operator>[] = [
  { label: ">", value: ">", key: ">" },
  { label: "<", value: "<", key: "<" },
  { label: ">=", value: ">=", key: ">=" },
  { label: "<=", value: "<=", key: "<=" },
  { label: "=", value: "==", key: "==" },
  { label: "!=", value: "!=", key: "!=" },
];

export const stringOperatorOptions: SelectOption<Operator>[] = [
  { label: "contains", value: "contains", key: "contains" },
  { label: "does not contain", value: "not_contains", key: "not_contains" },
  { label: "equals", value: "equals", key: "equals" },
  { label: "not equals", value: "not_equals", key: "not_equals" },
];

export interface UiExpression {
  field: string;
  operator: Operator;
  value: string | number | undefined;
}
export interface CodeExpression {
  expression: string;
}

export type BranchLogic = "AND" | "OR" | "XOR";
export type Branch = ConditionNode | UiExpression | undefined;

export interface ConditionNode {
  logic: BranchLogic;
  left: Branch;
  right: Branch;
}

export enum VisibilityAction {
  HIDE = "hide",
  EDITABLE = "editable",
  DISABLED = "disabled",
  REQUIRED = "required",
}

export interface VisibilityRule {
  componentName: string;
  actions: VisibilityAction[];
  condition?: string;
}

export type ConditionBranch =
  | {
      isExpression: false;
      name: string;
      branch: Branch;
      next: string | null;
    }
  | {
      isExpression: true;
      name: string;
      branch: CodeExpression | undefined;
      next: string | null;
    };
//================================================================================================
// Node-specific Type Definitions (Alphabetical)
//================================================================================================

// --- Approval Node ---
type ApprovalNodeData = BaseNodeData &
  ApprovalData & {
    componentRules?: VisibilityRule[];
  };
export type ApprovalNodeType = Node<ApprovalNodeData, WorkflowNodeKey.Approval>;

// --- Condition Node ---
export interface ConditionNodeData extends BaseNodeData {
  conditions: ConditionBranch[];
}
export type ConditionNodeType = Node<
  ConditionNodeData,
  WorkflowNodeKey.Condition
>;

// --- End Node ---
export interface EndNodeData extends BaseNodeData {}
export type EndNodeType = Node<EndNodeData, WorkflowNodeKey.End>;

// --- Form Node ---
export type ApplicantSource = "selection" | "submitter";

export interface FormNodeData extends BaseNodeData {
  form?: Pick<
    FormDefinition,
    "id" | "name" | "tags" | "description" | "schema" | "revisionId"
  >;
  formId?: string;
  componentRules?: VisibilityRule[];
  applicantSource?: ApplicantSource;
  serialPrefix?: string;
}
export type FormNodeType = Node<FormNodeData, WorkflowNodeKey.Form>;

// --- Parallel Approval Node ---
export interface ParallelApprovalNodeData extends BaseNodeData {
  logic: "and" | "or";
  selectedApprovalIndex: number | null;
  approvals: ApprovalNodeData[];
}
export type ParallelApprovalNodeType = Node<
  ParallelApprovalNodeData,
  WorkflowNodeKey.ParallelApproval
>;

// --- Subflow Node ---
export interface SubflowNodeData extends BaseNodeData {
  workflowId: string | null;
  workflow: FlowDefinition | null;
}
export type SubflowNodeType = Node<SubflowNodeData, WorkflowNodeKey.Subflow>;

// --- Placeholder Node ---
export interface PlaceholderNodeData extends BaseNodeData {}
export type PlaceholderNodeType = Node<
  PlaceholderNodeData,
  WorkflowNodeKey.Placeholder
>;

// --- Dummy Node ---
export interface DummyNodeData extends BaseNodeData {}
export type DummyNodeType = Node<DummyNodeData, WorkflowNodeKey.DummyNode>;

//================================================================================================
// Aggregate/Union Types
//================================================================================================

export type WorkflowNode =
  | ApprovalNodeType
  | ParallelApprovalNodeType
  | ConditionNodeType
  | SubflowNodeType
  | FormNodeType
  | EndNodeType
  | PlaceholderNodeType
  | DummyNodeType;

export type BmpNodesType = WorkflowNode[];

export interface CreateNodeOptions<T extends BaseNodeData> {
  position: { x: number; y: number };
  data: Partial<T>;
  id?: string;
}
