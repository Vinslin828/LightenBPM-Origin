import { DatasetFieldDto, FieldType } from './dto/create-dataset.dto';

export const SYSTEM_DATASET_USERS = 'USERS';
export const SYSTEM_DATASET_ORG_UNITS = 'ORG_UNITS';

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
    ],
  },
};
