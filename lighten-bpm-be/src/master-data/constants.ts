import { DatasetFieldDto, FieldType } from './dto/create-dataset.dto';

export const SYSTEM_DATASET_USERS = 'USERS';
export const SYSTEM_DATASET_ORG_UNITS = 'ORG_UNITS';
export const SYSTEM_DATASET_ORG_UNIT_TRANSLATIONS = 'ORG_UNIT_TRANSLATIONS';
export const SYSTEM_DATASET_ORG_MEMBERSHIPS = 'ORG_MEMBERSHIPS';

export interface SystemDatasetDefinition {
  code: string;
  name: string;
  table_name: string;
  fields: DatasetFieldDto[];
}

export const SYSTEM_DATASETS: Record<string, SystemDatasetDefinition> = {
  [SYSTEM_DATASET_USERS]: {
    code: SYSTEM_DATASET_USERS,
    name: 'System Users',
    table_name: 'users',
    fields: [
      { name: 'id', type: FieldType.NUMBER, required: true },
      { name: 'code', type: FieldType.TEXT, required: true },
      { name: 'name', type: FieldType.TEXT, required: true },
      { name: 'email', type: FieldType.TEXT, required: false },
      { name: 'job_grade', type: FieldType.NUMBER, required: true },
    ],
  },
  [SYSTEM_DATASET_ORG_UNITS]: {
    code: SYSTEM_DATASET_ORG_UNITS,
    name: 'System Organization Units',
    table_name: 'org_units',
    fields: [
      { name: 'id', type: FieldType.NUMBER, required: true },
      { name: 'code', type: FieldType.TEXT, required: true },
      { name: 'name', type: FieldType.TEXT, required: true },
      { name: 'type', type: FieldType.TEXT, required: true },
      { name: 'parent_id', type: FieldType.NUMBER, required: false },
      { name: 'deleted_at', type: FieldType.DATE, required: false },
    ],
  },
  [SYSTEM_DATASET_ORG_UNIT_TRANSLATIONS]: {
    code: SYSTEM_DATASET_ORG_UNIT_TRANSLATIONS,
    name: 'System Organization Unit Translations',
    table_name: 'org_unit_translations',
    fields: [
      { name: 'org_unit_id', type: FieldType.NUMBER, required: true },
      { name: 'lang', type: FieldType.TEXT, required: true },
      { name: 'name', type: FieldType.TEXT, required: true },
    ],
  },
  [SYSTEM_DATASET_ORG_MEMBERSHIPS]: {
    code: SYSTEM_DATASET_ORG_MEMBERSHIPS,
    name: 'System Organization Memberships',
    table_name: 'org_memberships',
    fields: [
      { name: 'id', type: FieldType.NUMBER, required: true },
      { name: 'user_code', type: FieldType.TEXT, required: true },
      { name: 'org_unit_code', type: FieldType.TEXT, required: true },
      { name: 'assign_type', type: FieldType.TEXT, required: true },
      { name: 'start_date', type: FieldType.TEXT, required: true },
      { name: 'end_date', type: FieldType.TEXT, required: true },
      { name: 'note', type: FieldType.TEXT, required: false },
    ],
  },
};

export const EDITABLE_SYSTEM_DATASETS = new Set<string>([
  SYSTEM_DATASET_ORG_UNIT_TRANSLATIONS,
]);

export function isEditableSystemDataset(code: string): boolean {
  return EDITABLE_SYSTEM_DATASETS.has(code);
}
