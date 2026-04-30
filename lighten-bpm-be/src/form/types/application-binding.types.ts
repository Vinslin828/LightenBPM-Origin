import { FormWorkflowBinding as PrismaBinding } from '../../common/types/common.types';

export interface IFormWorkflowBinding {
  id: number;
  formId: number;
  workflowId: number;
  createdAt: Date;
  updatedAt: Date | null;
}

export type FormWorkflowBinding = IFormWorkflowBinding;

export function bindingFromPrisma(binding: PrismaBinding): FormWorkflowBinding {
  return {
    id: binding.id,
    formId: binding.form_id,
    workflowId: binding.workflow_id,
    createdAt: binding.created_at,
    updatedAt: binding.updated_at,
  };
}
