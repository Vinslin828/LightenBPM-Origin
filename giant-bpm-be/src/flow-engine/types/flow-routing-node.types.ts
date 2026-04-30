import {
  User,
  ApprovalStatus,
  NodeResult,
} from '../../common/types/common.types';
import {
  ApprovalLogic,
  ApprovalMethod,
  NodeType,
  ReportingLineMethod,
} from '.';

export enum RoutingNodeStatus {
  'INACTIVE' = 'inactive',
  'PENDING' = 'pending',
  'COMPLETED' = 'completed',
  'FAILED' = 'failed',
}

export interface BasicNode {
  key: string;
  type: NodeType;
  status: RoutingNodeStatus; // INACTIVE, PENDING, COMPLETED, FAILED
  desc?: string;
  parent_keys: string[]; //node key array of parent nodes; Only START Node has no parent
  child_keys?: string[]; // node key array of child nodes; Only END Node has no
}

export interface ReportingLineConfig {
  type: ReportingLineMethod; //level, job_grade
  target: number; //target (level, job_grade)
}

export interface Approval {
  approvalTaskId: string;
  assignee: User;
  status: ApprovalStatus;
}

export interface ApprovalGroup {
  approvals: Approval[];
  isReportingLine: boolean;
  desc?: string;
}

export interface ApprovalRoutingNode extends BasicNode {
  type: NodeType.APPROVAL;
  result?: NodeResult; //approved, rejected, delegated, timeout
  approvalMethod: ApprovalMethod; //single, parallel
  approvalLogic?: ApprovalLogic; //AND, OR logic for PARALLEL Approvals
  reportingLineConfig?: ReportingLineConfig; //only the approvals config to reporting line need to hanlded by sequence
  approvalGroups: ApprovalGroup[];
}

export type RoutingNode = BasicNode | ApprovalRoutingNode;
