import { injectable, inject } from "inversify";
import * as services from "../interfaces/services";
import { TYPES } from "../types/symbols";
import {
  ApiResponse,
  ExportPayload,
  ImportCheckResponse,
  type FlowDefinition,
  type PaginatedApiResponse,
  WorkflowListOptions,
} from "../types/domain";

@injectable()
export class WorkflowService implements services.IWorkflowService {
  constructor(
    @inject(TYPES.DomainService) private domainService: services.IDomainService,
  ) {}

  async getWorkflows(
    options?: WorkflowListOptions,
  ): Promise<PaginatedApiResponse<FlowDefinition>> {
    return this.domainService.getWorkflows(options);
  }

  async createWorkflow(
    workflow: Omit<FlowDefinition, "id" | "created_at" | "updated_at">,
  ): Promise<ApiResponse<FlowDefinition>> {
    return this.domainService.createWorkflow(workflow);
  }

  async getWorkflow(id: string): Promise<ApiResponse<FlowDefinition>> {
    return this.domainService.getWorkflow(id);
  }

  async updateWorkflow(
    id: string,
    workflow: Partial<FlowDefinition>,
  ): Promise<ApiResponse<FlowDefinition>> {
    return this.domainService.updateWorkflow(id, workflow);
  }

  async updateWorkflowSerialPrefix(
    id: string,
    serialPrefix: string,
  ): Promise<ApiResponse<FlowDefinition>> {
    return this.domainService.updateWorkflowSerialPrefix(id, serialPrefix);
  }

  bindFormToWorkflow(formId: string, workflowId: string) {
    return this.domainService.bindFormToWorkflow(formId, workflowId);
  }

  deleteWorkflow(id: string): Promise<ApiResponse<void>> {
    return this.domainService.deleteWorkflow(id);
  }

  async exportWorkflow(id: string): Promise<ApiResponse<ExportPayload>> {
    return this.domainService.exportWorkflow(id);
  }

  async importWorkflowCheck(
    payload: ExportPayload,
  ): Promise<ApiResponse<ImportCheckResponse>> {
    return this.domainService.importWorkflowCheck(payload);
  }

  async importWorkflowExecute(
    checkResult: ImportCheckResponse,
  ): Promise<ApiResponse<{ public_id: string }>> {
    return this.domainService.importWorkflowExecute(checkResult);
  }
}
