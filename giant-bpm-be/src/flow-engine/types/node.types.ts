import { NodeType, ApprovalMethod, ApprovalLogic } from './common.types';
import { ApproverConfig } from './approver-config.types';
import { RejectConfig } from './reject-config.types';
import { ConditionItem } from './condition.types';
import { ComponentRule } from './component-rule.types';

export interface NodeDefinition {
  key: string;
  type: NodeType;
  next?: string;
  description?: string;
}

export const APPLICANT_SOURCE = {
  SUBMITTER: 'submitter',
  SELECTION: 'selection',
} as const;

export type ApplicantSource =
  (typeof APPLICANT_SOURCE)[keyof typeof APPLICANT_SOURCE];

export interface StartNode extends NodeDefinition {
  type: NodeType.START;
  next: string;
  applicant_source?: ApplicantSource;
  component_rules?: ComponentRule[];
}

export interface EndNode extends NodeDefinition {
  type: NodeType.END;
}

export interface SingleApprovalNode extends NodeDefinition {
  type: NodeType.APPROVAL;
  next: string;
  approval_method: ApprovalMethod.SINGLE;
  approvers: ApproverConfig;
  reject_config?: RejectConfig;
  expression?: string;
}

export interface ParallelApprovalNode extends NodeDefinition {
  type: NodeType.APPROVAL;
  next: string;
  approval_method: ApprovalMethod.PARALLEL;
  approval_logic: ApprovalLogic;
  approvers: ApproverConfig[];
  reject_config?: RejectConfig;
  expression?: string;
}

export type ApprovalNode = SingleApprovalNode | ParallelApprovalNode;

export interface ConditionNode extends NodeDefinition {
  type: NodeType.CONDITION;
  conditions: ConditionItem[];
}

export interface SubflowNode extends NodeDefinition {
  type: NodeType.SUBFLOW;
  next: string;
  subflowId: string;
}

export type Node =
  | StartNode
  | EndNode
  | ApprovalNode
  | ConditionNode
  | SubflowNode;
