import { Prisma } from '@prisma/client';

export enum ExportType {
  FORM = 'FORM',
  WORKFLOW = 'WORKFLOW',
}

export interface ExportContainer<T> {
  protocol_version: string;
  exported_at: string;
  exported_by: string;
  type: ExportType;
  payload: T;
}

export interface FormExportPayload {
  public_id: string;
  is_template: boolean;
  latest_revision: {
    public_id: string;
    name: string;
    description: string | null;
    form_schema: Prisma.InputJsonValue;
    fe_validation: Prisma.InputJsonValue | null;
    options: {
      can_withdraw: boolean;
      can_copy: boolean;
      can_draft: boolean;
      can_delegate: boolean;
    } | null;
  };
  dependencies: {
    tags: { name: string; description: string | null; color: string | null }[];
    permissions: {
      grantee_type: string;
      grantee_value: string;
      grantee_code: string | null;
      action: string;
    }[];
    validations: {
      source_id: number;
      public_id: string;
      name: string;
      validation_type: string | null;
      validation_code: string | null;
      error_message: string | null;
      components: string[];
    }[];
    master_data: {
      dataset_name: string;
    }[];
  };
}

export interface WorkflowExportPayload {
  public_id: string;
  latest_revision: {
    public_id: string;
    name: string;
    description: string | null;
    flow_definition: Prisma.InputJsonValue;
    options: {
      reuse_prior_approvals: boolean;
    } | null;
  };
  binding?: {
    target_form_public_id: string;
    bundled_form?: FormExportPayload;
  };
  dependencies: {
    tags: { name: string; description: string | null; color: string | null }[];
    permissions: {
      grantee_type: string;
      grantee_value: string;
      grantee_code: string | null;
      action: string;
    }[];
    org_units: {
      source_id: number;
      code: string;
      name: string;
      type: string;
    }[];
    users: {
      source_id: number;
      code: string;
      name: string;
      email: string | null;
    }[];
  };
}

export enum ImportStatus {
  EXISTS = 'EXISTS',
  MISSING = 'MISSING',
  IN_BUNDLE = 'IN_BUNDLE',
}

export enum ImportSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  BLOCKING = 'BLOCKING',
}

export enum ImportAction {
  CREATE = 'CREATE',
  UPDATE_REVISION = 'UPDATE_REVISION',
  NO_CHANGE = 'NO_CHANGE',
}

export interface ImportCheckResponse {
  can_proceed: boolean;
  summary: {
    entity_exists: boolean;
    action: ImportAction;
    revision_diff: boolean;
    error?: string;
  };
  dependencies_check: {
    tags: { name: string; status: ImportStatus; severity: ImportSeverity }[];
    validations: {
      name: string;
      status: ImportStatus;
      severity: ImportSeverity;
      source: {
        public_id: string;
        validation_type: string | null;
        validation_code: string | null;
        error_message: string | null;
      };
      target: {
        public_id: string;
        validation_type: string | null;
        validation_code: string | null;
        error_message: string | null;
      } | null;
    }[];
    master_data: {
      dataset_name: string;
      status: ImportStatus;
      severity: ImportSeverity;
    }[];
    org_units: {
      code: string;
      status: ImportStatus;
      severity: ImportSeverity;
    }[];
    users: { code: string; status: ImportStatus; severity: ImportSeverity }[];
    permissions: {
      grantee_type: string;
      grantee_code: string | null;
      action: string;
      status: ImportStatus;
      severity: ImportSeverity;
    }[];
    related_form?: {
      public_id: string;
      status: ImportStatus;
      severity: ImportSeverity;
    };
  };
  original_payload: ExportContainer<FormExportPayload | WorkflowExportPayload>;
}

export interface ImportExecuteResponse {
  type: ExportType;
  public_id: string; // The public ID of the imported form or workflow
  latest_revision_public_id: string; // The public ID of the latest revision
}
