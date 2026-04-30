import { FlowDefinition, FormDefinition, Options, User } from "./domain";

export interface Application {
  id: string;
  overallStatus: OverallStatus;
  reviewStatus: ReviewStatus | null;
  serialNumber: string;
  submittedAt: string;
  submittedBy: string;
  assigneeId: string;
  formInstance: {
    form: FormDefinition;
    data: Record<string, any>;
  };
  workflowInstance: {
    workflow: FlowDefinition;
    data: Record<string, any>;
  };
  applicantId: number;
  submitterId: number;
  submitter?: User;
  applicant?: User;
  // temporary field for mock data
  comment?: string;
  approvalId: string;
}

export interface ApplicationForm {
  bindingId: string;
  form: {
    id: string;
    name: string;
    revisionId: string;
    description: string;
  };
  workflow: {
    id: string;
    name: string;
    revisionId: string;
    description: string;
  };
}

export enum OverallStatus {
  InProgress = "In Progress",
  Draft = "Draft",
  CompletedApproved = "Completed(Approved)",
  CompletedRejected = "Completed(Rejected)",
  Canceled = "Canceled",
}

export enum ReviewStatus {
  Approved = "Approved",
  Rejected = "Rejected",
  Pending = "Pending",
  NotStarted = "NotStrated",
  Canceled = "Canceled",
  Skipped = "Skipped",
}

// --- Query Option Types ---

export type ApplicationFilter = {
  overallStatus?: OverallStatus;
  reviewStatus?: ReviewStatus;
  approvalStatus?: (
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "WAITING"
    | "CANCELLED"
  )[];
  serialNumber?: string;
  applicantId?: number;
  assigneeId?: string;
  formName?: string;
  workflowName?: string;
  formTagIds?: number[];
  workflowTagIds?: number[];
};

export type ApplicationSorter = {
  submittedAt?: "asc" | "desc";
  sortOrder?: "asc" | "desc";
  sortBy?: "created_at" | "applied_at" | "updated_at";
};

export type ApplicationListContextFilter =
  | "submitted"
  | "approving"
  | "shared"
  | "all"
  | "visible";

export interface ApplicationOptions extends Options<Application> {
  type: "application" | "approval";
  listFilter?: ApplicationListContextFilter;
  filter?: ApplicationFilter;
  sorter?: ApplicationSorter;
}

export interface ApplicationFormFilter {
  formName?: string;
  workflowName?: string;
  formTagIds?: number[];
  workflowTagIds?: number[];
}

export interface ApplicationFormSorter {
  sortOrder?: "asc" | "desc";
}

export interface ApplicationFormOptions {
  filter?: ApplicationFormFilter;
  sorter?: ApplicationFormSorter;
  pageSize?: number;
  page?: number;
}

// --- Progress Types ---

export enum ProgressStatus {
  Approved = "approved",
  Pending = "pending",
  NotStarted = "not-started",
  Rejected = "rejected",
  Canceled = "canceled",
}

export enum ProgressType {
  Review = "review",
  Group = "group",
  Condition = "condition",
  End = "end",
}

export type ReviewerData = {
  id: string;
  title?: string;
  type: "user" | "department";
  assigneeName: string;
  status: ReviewStatus | null;
  comment?: string;
  timestamp?: string;
};

export interface StepBase {
  id: string;
  title: string;
  status: ProgressStatus;
}

export interface ReviewStep extends StepBase {
  type: ProgressType.Review;
  children: ReviewerData[];
  isReportingLine: boolean;
}

export interface GroupStep extends StepBase {
  type: ProgressType.Group;
  method: "AND" | "OR";
  children: {
    title?: string;
    data: ReviewerData[];
    isReportingLine: boolean;
  }[];
}

export interface ConditionStep extends StepBase {
  type: ProgressType.Condition;
  children: Progress[];
}

export interface EndStep extends StepBase {
  type: ProgressType.End;
  title: "Completed";
  children: null;
}

export type Progress = (GroupStep | ReviewStep | ConditionStep | EndStep)[];

export interface Comment {
  approvalId: string;
  author: User;
  content: string;
  createdAt: string;
  updatedAt: string;
}
