import { ApproverType, ReportingLineMethod, SourceType } from './common.types';
import { ComponentRule } from './component-rule.types';

export interface ApproverConfigBase {
  type: ApproverType;
  reuse_prior_approvals?: boolean;
  description?: string;
  component_rules?: ComponentRule[];
}

export interface ApplicantConfig extends ApproverConfigBase {
  type: ApproverType.APPLICANT;
}

export interface ApplicantReportingLineConfig extends ApproverConfigBase {
  type: ApproverType.APPLICANT_REPORTING_LINE;
  config: {
    method: ReportingLineMethod;
    job_grade?: number;
    level?: number;
    org_reference_field?: string;
  };
}

export interface SpecificUserReportingLineConfig extends ApproverConfigBase {
  type: ApproverType.SPECIFIC_USER_REPORTING_LINE;
  config: {
    source: SourceType;
    user_id?: number;
    form_field?: string;
    method: ReportingLineMethod;
    job_grade?: number;
    level?: number;
    org_reference_field?: string;
  };
}

export interface DepartmentHeadConfig extends ApproverConfigBase {
  type: ApproverType.DEPARTMENT_HEAD;
  config: {
    source: SourceType;
    org_unit_id?: number;
    form_field?: string;
  };
}

export interface RoleConfig extends ApproverConfigBase {
  type: ApproverType.ROLE;
  config: {
    role_id: number;
  };
}

export interface SpecificUsersConfig extends ApproverConfigBase {
  type: ApproverType.SPECIFIC_USERS;
  config:
    | { user_ids: number[] }
    | { source: SourceType.MANUAL; user_ids: number[] }
    | { source: SourceType.EXPRESSION; expression: string };
}

export type ApproverConfig =
  | ApplicantConfig
  | ApplicantReportingLineConfig
  | SpecificUserReportingLineConfig
  | DepartmentHeadConfig
  | RoleConfig
  | SpecificUsersConfig;
