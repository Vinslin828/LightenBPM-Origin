import { Schema } from "@coltorapps/builder";
import { basicFormBuilder } from "@/components/form/builder/definition";
import { FormSetting, FormStatus } from "./form-builder";
import { WorkflowNode } from "./flow";
import { Edge } from "@xyflow/react";

// ========================================
// API Response Types
// ========================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedApiResponse<T = any> {
  success: boolean;
  data?: PaginatedData<T>;
  error?: string;
  message?: string;
}

export type Filter<T = any> = Partial<T>;
export type Sorter<T = any> = {
  [key in keyof T]?: "asc" | "desc";
};

export interface Options<T = unknown> {
  filter?: Filter<T>;
  sorter?: Sorter<T>;
  pageSize?: number;
  page?: number;
}

export interface FormListFilter {
  name?: string;
  tagIds?: number[];
}

export interface FormListSorter {
  createdAt?: "asc" | "desc";
}

export interface FormListOptions {
  page?: number;
  limit?: number;
  filter?: FormListFilter;
  sorter?: FormListSorter;
}

export interface WorkflowListFilter {
  name?: string;
  tagIds?: number[];
}

export interface WorkflowListSorter {
  createdAt?: "asc" | "desc";
}

export interface WorkflowListOptions {
  page?: number;
  limit?: number;
  filter?: WorkflowListFilter;
  sorter?: WorkflowListSorter;
}

// ========================================
// Form Definition Types
// ========================================

// This is the single source of truth for the schema's type, imported from the library.
export type FormSchema = Schema<typeof basicFormBuilder>;

export interface ExportPayload {
  protocol_version: string;
  exported_at: string;
  exported_by: string;
  type: "FORM" | "WORKFLOW";
  payload: Record<string, unknown>;
}

export type ImportDependencyStatus = "EXISTS" | "MISSING" | "IN_BUNDLE";
export type ImportDependencySeverity = "INFO" | "WARNING" | "BLOCKING";

export interface ImportDependencyItem {
  name?: string;
  code?: string;
  public_id?: string;
  status: ImportDependencyStatus;
  severity: ImportDependencySeverity;
}

export interface ImportCheckResponse {
  can_proceed: boolean;
  summary: {
    entity_exists: boolean;
    action: string;
    revision_diff: boolean;
  };
  dependencies_check: {
    validations: ImportDependencyItem[];
    org_units: ImportDependencyItem[];
    users: ImportDependencyItem[];
    related_form?: ImportDependencyItem;
  };
  original_payload: ExportPayload;
}

export interface FormDefinition {
  id: string;
  revisionId: string;
  name: string;
  description: string;
  schema: FormSchema;
  version: number;
  createdAt: string;
  updatedAt: string;
  publishStatus: FormStatus;
  tags: Tag[];
  validation: FormSetting["validation"];
  applicantSource?: "selection" | "submitter";
  defaultLang?: string;
  translationLangs?: string[];
  labelTranslations?: Record<string, Record<string, string>>;
}

export interface ResolvedFormDefinition {
  id: string;
  revisionId: string;
  name: string;
  description: string;
  formSchema: {
    root?: string[];
    entities?: Record<string, unknown>;
  };
  options: {
    canWithdraw: boolean;
    canCopy: boolean;
    canDraft: boolean;
    canDelegate: boolean;
  };
  applicantSource?: "selection" | "submitter";
}

export interface FlowDefinition {
  id: string;
  revisionId: string;
  name: string;
  description: string;
  tags: Tag[];
  version: number;
  nodes: WorkflowNode[];
  edges: Edge[];
  createdAt: string;
  updatedAt: string;
  publishStatus: FormStatus;
  serialPrefix?: string;
}

export interface FlowInstance extends FlowDefinition {
  status: "draft" | "published";
  // TODO:
}

// ========================================
// Department Types
// ========================================

export interface Tag {
  id: string;
  name: string;
  description: string;
  abbrev: string;
  color?: string;
  createdAt: string;
  createdBy: string;
}

export interface User {
  id: string;
  code: string;
  name: string;
  email: string;
  jobGrade: number;
  tags?: Tag[];
  roles?: Role[];
  defaultOrgId: string;
  defaultOrgCode: string;
  isAdmin: boolean;
  lang?: string;
}

export interface OrgHead {
  id: string;
  userId: string;
  orgUnitId: string;
  startDate: string;
  endDate?: string;
  user: User;
  isActive: boolean;
}

export interface Unit {
  id: string;
  name: string;
  defaultName?: string;
  nameTranslations?: Record<string, string>;
  members: User[];
  code: string;
  type?: "ORG_UNIT" | "ROLE";
  parent?: Unit;
  children?: Array<Unit | string>;
  heads?: OrgHead[];
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  members: User[];
  code: string;
  parent?: Unit;
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  expression: string;
  next: string;
}

export interface OptionType {
  label: string;
  value: string;
  key: string;
}
