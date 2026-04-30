export type ColumnType = "text" | "boolean" | "number" | "date";
export type ExternalApiMethod = "GET" | "POST" | "PUT";

export interface DatasetField {
  name: string;
  type: ColumnType;
  default_value?: string | number | boolean | Date | null;
  nullable?: boolean;
  unique?: boolean;
}

export interface DatasetDefinition {
  id?: number;
  code: string;
  name: string;
  fields: DatasetField[];
  primaryKey: string;
  created_at?: string;
  updated_at?: string;
  source_type?: "DATABASE" | "EXTERNAL_API";
  created_by?: string;
  updated_by?: string;
  api_config?: ExternalApiRequestConfig | null;
  field_mappings?: ExternalApiFieldMappingsDto | null;
}

export interface ExternalApiRequestConfig {
  url: string;
  method: ExternalApiMethod;
  headers?: Record<string, string>;
  body?: string;
}

export interface ExternalApiFieldMappingDto {
  field_name: string;
  json_path: string;
}

export interface ExternalApiFieldMappingsDto {
  records_path: string;
  mappings: ExternalApiFieldMappingDto[];
}

export interface CreateDatasetDto {
  name: string;
  fields?: DatasetField[];
  primaryKey?: string;
  source_type?: "DATABASE" | "EXTERNAL_API";
  api_config?: ExternalApiRequestConfig;
  field_mappings?: ExternalApiFieldMappingsDto;
}

export type DatasetRecord = Record<string, unknown>;

export interface DatasetExportPayload {
  definition: DatasetDefinition;
  records: DatasetRecord[];
}

export interface UpdateDatasetSchemaDto {
  fields: Array<{
    name: string;
    type: "TEXT" | "NUMBER" | "BOOLEAN" | "DATE";
    required: boolean;
    default_value?: string | number | boolean;
    unique?: boolean;
  }>;
  confirm_data_loss: true;
}
