import { injectable, inject } from "inversify";
import * as services from "../interfaces/services";
import { TYPES } from "../types/symbols";
import {
  ApiResponse,
  FormDefinition,
  PaginatedApiResponse,
} from "@/types/domain";
import {
  Application,
  ApplicationForm,
  ApplicationFormOptions,
  ApplicationListContextFilter,
  ApplicationOptions,
  Progress,
  Comment,
  OverallStatus,
} from "@/types/application";

@injectable()
export class ApplicationService implements services.IApplicationService {
  constructor(
    @inject(TYPES.DomainService) private domainService: services.IDomainService,
  ) {}

  async createApplication(
    payload: Omit<Application, "submittedAt" | "id" | "serialNumber">,
  ): Promise<ApiResponse<Application>> {
    return this.domainService.createApplication(payload);
  }

  async getApplication(id: string): Promise<ApiResponse<Application>> {
    return this.domainService.getApplication(id);
  }

  async getApplications(
    options?: ApplicationOptions,
  ): Promise<PaginatedApiResponse<Application>> {
    const normalizedOptions = normalizeApplicationOptions(options);
    return this.domainService.getApplications(normalizedOptions);
  }

  async getApplicationForms(
    options?: ApplicationFormOptions,
  ): Promise<PaginatedApiResponse<ApplicationForm>> {
    const normalizedOptions = normalizeApplicationFormOptions(options);
    return this.domainService.getApplicationForms(normalizedOptions);
  }
  async getApplicationForm(
    bindingId: string,
  ): Promise<ApiResponse<FormDefinition>> {
    return this.domainService.getApplicationForm(bindingId);
  }

  async discardApplication(id: string): Promise<ApiResponse<void>> {
    return this.domainService.discardApplication(id);
  }

  async approveApplication(
    serialNumber: string,
    approvalId: string,
    comment?: string,
    formData?: Record<string, string>,
  ): Promise<ApiResponse<unknown>> {
    return this.domainService.approveApplication(
      serialNumber,
      approvalId,
      comment,
      formData,
    );
  }

  async rejectApplication(
    serialNumber: string,
    approvalId: string,
    comment?: string,
    formData?: Record<string, string>,
  ): Promise<ApiResponse<unknown>> {
    return this.domainService.rejectApplication(
      serialNumber,
      approvalId,
      comment,
      formData,
    );
  }

  async updateApplication(
    id: string,
    payload: any,
  ): Promise<ApiResponse<Application>> {
    return this.domainService.updateApplication(id, payload);
  }

  async getApplicationProgress(
    applicationId: string,
  ): Promise<
    ApiResponse<{ progress: Progress; overallStatus: OverallStatus }>
  > {
    return this.domainService.getApplicationProgress(applicationId);
  }

  getComments(serialNumber: string): Promise<ApiResponse<Comment[]>> {
    return this.domainService.getComments(serialNumber);
  }

  getApprovalApplication(
    approvalId: string,
  ): Promise<ApiResponse<Application>> {
    return this.domainService.getApprovalApplication(approvalId);
  }
}

export function normalizeApplicationFormOptions(
  options?: ApplicationFormOptions,
): ApplicationFormOptions {
  const normalizeIds = (ids?: number[]) => {
    if (!ids?.length) return undefined;
    const normalized = ids
      .map((value) => Number(value))
      .filter((value) => !Number.isNaN(value));
    return normalized.length ? normalized : undefined;
  };

  const filter = {
    formName: options?.filter?.formName?.trim() || undefined,
    workflowName: options?.filter?.workflowName?.trim() || undefined,
    formTagIds: normalizeIds(options?.filter?.formTagIds),
    workflowTagIds: normalizeIds(options?.filter?.workflowTagIds),
  };

  const hasFilter = Object.values(filter).some((value) =>
    Array.isArray(value) ? value.length > 0 : Boolean(value),
  );

  return {
    page: options?.page ?? 1,
    pageSize: options?.pageSize ?? 10,
    ...(hasFilter ? { filter } : {}),
    sorter: {
      sortOrder: options?.sorter?.sortOrder ?? "desc",
    },
  };
}

export function normalizeApplicationOptions(
  options?: ApplicationOptions,
): ApplicationOptions {
  const normalizeIds = (ids?: number[]) => {
    if (!ids?.length) return undefined;
    const normalized = ids
      .map((value) => Number(value))
      .filter((value) => !Number.isNaN(value));
    return normalized.length ? normalized : undefined;
  };
  const normalizeApprovalStatuses = (
    statuses?: ApplicationOptions["filter"] extends infer F
      ? F extends { approvalStatus?: infer S }
        ? S
        : never
      : never,
  ) => {
    if (!statuses?.length) return undefined;
    const normalized = statuses.filter(
      (status): status is NonNullable<(typeof statuses)[number]> =>
        status !== undefined && status !== null,
    );
    return normalized.length ? Array.from(new Set(normalized)) : undefined;
  };

  const filter = options?.filter;
  const normalizedApplicantId =
    filter?.applicantId === undefined || filter?.applicantId === null
      ? undefined
      : Number(filter.applicantId);
  const normalizedFilter = filter
    ? {
        overallStatus: filter.overallStatus,
        reviewStatus: filter.reviewStatus,
        approvalStatus: normalizeApprovalStatuses(filter.approvalStatus),
        serialNumber: filter.serialNumber?.trim() || undefined,
        applicantId: Number.isNaN(normalizedApplicantId)
          ? undefined
          : normalizedApplicantId,
        assigneeId: filter.assigneeId,
        formName: filter.formName?.trim() || undefined,
        workflowName: filter.workflowName?.trim() || undefined,
        formTagIds: normalizeIds(filter.formTagIds),
        workflowTagIds: normalizeIds(filter.workflowTagIds),
      }
    : undefined;

  const hasFilter =
    normalizedFilter &&
    Object.values(normalizedFilter).some((value) =>
      Array.isArray(value) ? value.length > 0 : value !== undefined,
    );

  const sortOrder =
    options?.sorter?.sortOrder ?? options?.sorter?.submittedAt ?? "desc";
  const normalizedSorter = {
    sortOrder,
    submittedAt: options?.sorter?.submittedAt ?? sortOrder,
    sortBy: options?.sorter?.sortBy,
  };

  const type = options?.type ?? "application";
  const listFilter: ApplicationListContextFilter =
    options?.listFilter ?? (type === "approval" ? "approving" : "submitted");

  return {
    type,
    listFilter,
    page: options?.page ?? 1,
    pageSize: options?.pageSize ?? 10,
    ...(hasFilter ? { filter: normalizedFilter } : {}),
    sorter: normalizedSorter,
  };
}
