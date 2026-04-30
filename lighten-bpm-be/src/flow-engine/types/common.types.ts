export interface UserInfo {
  userId: number;
  name: string;
}

export enum NodeType {
  START = 'start',
  APPROVAL = 'approval',
  CONDITION = 'condition',
  SUBFLOW = 'subflow',
  END = 'end',
}

export enum ApprovalMethod {
  SINGLE = 'single',
  PARALLEL = 'parallel',
}

export enum ApprovalLogic {
  AND = 'AND',
  OR = 'OR',
}

export enum ApproverType {
  APPLICANT = 'applicant',
  APPLICANT_REPORTING_LINE = 'applicant_reporting_line',
  SPECIFIC_USER_REPORTING_LINE = 'specific_user_reporting_line',
  DEPARTMENT_HEAD = 'department_head',
  ROLE = 'role',
  SPECIFIC_USERS = 'specific_users',
}

export enum ReportingLineMethod {
  TO_JOB_GRADE = 'to_job_grade',
  TO_LEVEL = 'to_level',
}

export enum SourceType {
  MANUAL = 'manual',
  FORM_FIELD = 'form_field',
  EXPRESSION = 'expression',
}

export enum ComparisonOperator {
  GREATER_THAN = '>',
  LESS_THAN = '<',
  GREATER_EQUAL = '>=',
  LESS_EQUAL = '<=',
  EQUAL = '==',
  NOT_EQUAL = '!=',
  STRING_EQUAL = 'equals',
  STRING_NOT_EQUAL = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
}

export enum LogicOperator {
  AND = 'AND',
  OR = 'OR',
}

// Operator classifications for type validation
export const NUMERIC_OPERATORS: ComparisonOperator[] = [
  ComparisonOperator.GREATER_THAN,
  ComparisonOperator.LESS_THAN,
  ComparisonOperator.GREATER_EQUAL,
  ComparisonOperator.LESS_EQUAL,
  ComparisonOperator.EQUAL,
  ComparisonOperator.NOT_EQUAL,
];

export const STRING_OPERATORS: ComparisonOperator[] = [
  ComparisonOperator.STRING_EQUAL,
  ComparisonOperator.STRING_NOT_EQUAL,
  ComparisonOperator.CONTAINS,
  ComparisonOperator.NOT_CONTAINS,
];
