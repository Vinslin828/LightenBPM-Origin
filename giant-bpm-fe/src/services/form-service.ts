import { injectable, inject } from "inversify";
import { type IDomainService, IFormService } from "../interfaces/services";
import { TYPES } from "../types/symbols";
import {
  type FormDefinition,
  type ResolvedFormDefinition,
  type ApiResponse,
  PaginatedApiResponse,
  FormListOptions,
  ExportPayload,
  ImportCheckResponse,
} from "../types/domain";

@injectable()
export class FormService implements IFormService {
  constructor(
    @inject(TYPES.DomainService) private domainService: IDomainService,
  ) {}

  async getForm(id: string): Promise<ApiResponse<FormDefinition>> {
    return this.domainService.getForm(id);
  }

  async getResolvedForm(
    formId: string,
  ): Promise<ApiResponse<ResolvedFormDefinition>> {
    return this.domainService.getResolvedForm(formId);
  }

  async getForms(
    options?: FormListOptions,
  ): Promise<PaginatedApiResponse<FormDefinition>> {
    return this.domainService.getForms(options);
  }

  async create(
    form: Omit<
      FormDefinition,
      "revisionId" | "id" | "created_at" | "updated_at"
    >,
  ): Promise<ApiResponse<FormDefinition>> {
    return this.domainService.createForm(form);
  }

  async update(form: FormDefinition): Promise<ApiResponse<FormDefinition>> {
    return this.domainService.updateForm(form);
  }

  async deleteForm(id: string): Promise<ApiResponse<void>> {
    return this.domainService.deleteForm(id);
  }

  async exportForm(id: string): Promise<ApiResponse<ExportPayload>> {
    return this.domainService.exportForm(id);
  }

  async importCheck(
    payload: ExportPayload,
  ): Promise<ApiResponse<ImportCheckResponse>> {
    return this.domainService.importCheck(payload);
  }

  async importExecute(
    checkResult: ImportCheckResponse,
  ): Promise<ApiResponse<{ id: string }>> {
    return this.domainService.importExecute(checkResult);
  }
}
