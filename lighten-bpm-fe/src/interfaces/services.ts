import {
  ApiResponse,
  Tag,
  FlowDefinition,
  FlowInstance,
  FormDefinition,
  ResolvedFormDefinition,
  FormListOptions,
  WorkflowListOptions,
  PaginatedApiResponse,
  User,
  Unit,
  Role,
  ExportPayload,
  ImportCheckResponse,
} from "@/types/domain";
import { Validator, ValidatorListOptions } from "@/types/validator";
import {
  CreateValidatorDto,
  UpdateValidatorDto,
} from "@/types/validation-registry";
import {
  FormPermission,
  WorkflowPermission,
  Permission,
  ApplicationShare,
  ApplicationShareDeleteQuery,
  ApplicationShareInput,
} from "@/types/permission";
import {
  BackendFormPermissionDeleteQuery,
  BackendWorkflowPermissionDeleteQuery,
} from "@/schemas/permission/response";
import {
  DatasetDefinition,
  CreateDatasetDto,
  UpdateDatasetSchemaDto,
  DatasetRecord,
  ExternalApiRequestConfig,
  ExternalApiFieldMappingsDto,
} from "@/types/master-data-dataset";
import { AppSettings, CounterSettings } from "../schemas/settings";
import {
  Application,
  ApplicationForm,
  ApplicationFormOptions,
  ApplicationOptions,
  Progress,
  Comment,
  OverallStatus,
} from "@/types/application";
import {
  ValidateFieldsRequest,
  ValidateFieldsResponse,
} from "@/schemas/validator/validate-fields";

export interface IDomainService {
  getMe(): Promise<ApiResponse<User>>;
  updateMe(data: { name?: string; lang?: string }): Promise<ApiResponse<User>>;
  // Form Management
  getForms(
    options?: FormListOptions,
  ): Promise<PaginatedApiResponse<FormDefinition>>;
  getForm(id: string): Promise<ApiResponse<FormDefinition>>;
  getResolvedForm(formId: string): Promise<ApiResponse<ResolvedFormDefinition>>;
  createForm(
    form: Omit<FormDefinition, "revisionId" | "id" | "createdAt" | "updatedAt">,
  ): Promise<ApiResponse<FormDefinition>>;
  updateForm(form: FormDefinition): Promise<ApiResponse<FormDefinition>>;
  deleteForm(id: string): Promise<ApiResponse<void>>;
  exportForm(id: string): Promise<ApiResponse<ExportPayload>>;
  importCheck(
    payload: ExportPayload,
  ): Promise<ApiResponse<ImportCheckResponse>>;
  importExecute(
    checkResult: ImportCheckResponse,
  ): Promise<ApiResponse<{ id: string }>>;

  // Workflow Management
  getWorkflows(
    options?: WorkflowListOptions,
  ): Promise<PaginatedApiResponse<FlowDefinition>>;
  getWorkflow(id: string): Promise<ApiResponse<FlowDefinition>>;
  createWorkflow(
    workflow: Omit<FlowDefinition, "id" | "createdAt" | "updatedAt">,
  ): Promise<ApiResponse<FlowDefinition>>;
  updateWorkflow(
    id: string,
    workflow: Partial<FlowDefinition>,
  ): Promise<ApiResponse<FlowDefinition>>;
  updateWorkflowSerialPrefix(
    id: string,
    serialPrefix: string,
  ): Promise<ApiResponse<FlowDefinition>>;
  deleteWorkflow(id: string): Promise<ApiResponse<void>>;
  bindFormToWorkflow(
    formId: string,
    workflowId: string,
  ): Promise<ApiResponse<FormDefinition>>;
  exportWorkflow(id: string): Promise<ApiResponse<ExportPayload>>;
  importWorkflowCheck(
    payload: ExportPayload,
  ): Promise<ApiResponse<ImportCheckResponse>>;
  importWorkflowExecute(
    checkResult: ImportCheckResponse,
  ): Promise<ApiResponse<{ public_id: string }>>;

  // Workflow Permissions
  getWorkflowPermissions(workflowId: string): Promise<ApiResponse<Permission>>;
  addWorkflowPermissions(
    workflowId: string,
    permission: Permission,
  ): Promise<ApiResponse<Permission>>;
  updateWorkflowPermissions(
    workflowId: string,
    permission: Permission,
  ): Promise<ApiResponse<Permission>>;
  deleteWorkflowPermissions(
    workflowId: string,
    query?: BackendWorkflowPermissionDeleteQuery,
  ): Promise<ApiResponse<void>>;
  deleteWorkflowPermission(id: number): Promise<ApiResponse<void>>;

  // Form Permissions
  getFormPermissions(formId: string): Promise<ApiResponse<Permission>>;
  addFormPermissions(
    formId: string,
    permission: Permission,
  ): Promise<ApiResponse<Permission>>;
  updateFormPermissions(
    formId: string,
    permission: Permission,
  ): Promise<ApiResponse<Permission>>;
  deleteFormPermissions(
    formId: string,
    query?: BackendFormPermissionDeleteQuery,
  ): Promise<ApiResponse<void>>;
  deleteFormPermission(id: number): Promise<ApiResponse<void>>;

  // Application Shares
  getApplicationShares(
    serialNumber: string,
  ): Promise<ApiResponse<ApplicationShare[]>>;
  addApplicationShares(
    serialNumber: string,
    shares: ApplicationShareInput[],
  ): Promise<ApiResponse<ApplicationShare[]>>;
  updateApplicationShares(
    serialNumber: string,
    shares: ApplicationShareInput[],
  ): Promise<ApiResponse<ApplicationShare[]>>;
  deleteApplicationShares(
    serialNumber: string,
    query: ApplicationShareDeleteQuery,
  ): Promise<ApiResponse<void>>;
  deleteApplicationShare(id: number): Promise<ApiResponse<void>>;

  // Department Management
  getTags(): Promise<ApiResponse<Tag[]>>;
  getUsers(params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedApiResponse<User>>;
  getUserById(id: string): Promise<ApiResponse<User>>;
  getOrgUnits(name?: string): Promise<ApiResponse<Unit[]>>;
  getOrgUnitById(id: string): Promise<ApiResponse<Unit>>;
  getOrgUnitMembers(orgUnitId: string): Promise<ApiResponse<User[]>>;
  getOrgUnitByCode(code: string): Promise<ApiResponse<Unit>>;
  getOrgRoles(name?: string): Promise<ApiResponse<Role[]>>;
  getOrgUnitHeads(): Promise<ApiResponse<User[]>>;

  // Organization Management - New methods for Organization & User Management feature
  getOrgUnitHeadsByOrgId(
    orgUnitId: string,
  ): Promise<ApiResponse<import("@/types/organization").OrgHead[]>>;
  getAllOrgHeads(): Promise<ApiResponse<Record<string, User | null>>>;
  createOrgUnit(data: {
    code: string;
    name: string;
    parentCode?: string;
  }): Promise<ApiResponse<Unit>>;
  createRole(data: { code: string; name: string }): Promise<ApiResponse<Unit>>;
  updateOrgUnit(
    orgUnitId: string,
    data: { name?: string; code?: string; parentCode?: string | null },
  ): Promise<ApiResponse<Unit>>;
  deleteOrgUnit(orgUnitId: string): Promise<ApiResponse<void>>;
  updateUserDefaultOrg(
    userId: string,
    orgUnitId: string,
  ): Promise<ApiResponse<User>>;
  addUserToOrgUnit(
    orgUnitId: string,
    userId: string,
  ): Promise<ApiResponse<Unit>>;
  removeUserFromOrgUnit(
    orgUnitId: string,
    userId: string,
  ): Promise<ApiResponse<Unit>>;
  createOrgHead(
    orgUnitId: string,
    userId: string,
    startDate: string,
    endDate?: string,
  ): Promise<ApiResponse<void>>;
  updateOrgHead(
    headId: string,
    startDate: string,
    endDate?: string,
  ): Promise<ApiResponse<void>>;
  deleteOrgHead(headId: string): Promise<ApiResponse<void>>;

  // User Management
  createUser(data: {
    code: string;
    name: string;
    jobGrade: number;
    defaultOrgCode?: string;
  }): Promise<ApiResponse<User>>;
  getUserById(id: string): Promise<ApiResponse<User>>;
  updateUser(
    id: string,
    data: { name?: string; jobGrade?: number; defaultOrgCode?: string },
  ): Promise<ApiResponse<User>>;
  deleteUser(id: string): Promise<ApiResponse<void>>;
  getUserMemberships(
    userId: string,
  ): Promise<ApiResponse<import("@/types/user-management").OrgMembership[]>>;
  createOrgMembership(data: {
    orgUnitCode: string;
    userId: string;
    startDate: string;
    endDate?: string;
    isIndefinite?: boolean;
    note?: string;
  }): Promise<ApiResponse<import("@/types/user-management").OrgMembership>>;
  updateOrgMembership(
    id: string,
    data: {
      startDate?: string;
      endDate?: string;
      isIndefinite?: boolean;
      note?: string;
    },
  ): Promise<ApiResponse<import("@/types/user-management").OrgMembership>>;
  deleteOrgMembership(id: string): Promise<ApiResponse<void>>;

  // Dataset Management
  getDatasets(params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedApiResponse<DatasetDefinition>>;
  getDataset(code: string): Promise<ApiResponse<DatasetDefinition>>;
  createDataset(dto: CreateDatasetDto): Promise<ApiResponse<DatasetDefinition>>;
  deleteDataset(code: string): Promise<ApiResponse<void>>;
  renameDataset(
    code: string,
    name: string,
  ): Promise<ApiResponse<DatasetDefinition>>;
  updateExternalApiConfig(
    code: string,
    dto: {
      api_config?: ExternalApiRequestConfig | null;
      field_mappings?: ExternalApiFieldMappingsDto | null;
    },
  ): Promise<ApiResponse<DatasetDefinition>>;
  updateDatasetSchema(
    code: string,
    dto: UpdateDatasetSchemaDto,
  ): Promise<ApiResponse<DatasetDefinition>>;
  getDatasetRecords(
    code: string,
    params?: { page?: number; limit?: number } & Record<string, any>,
  ): Promise<PaginatedApiResponse<DatasetRecord>>;
  createDatasetRecords(
    code: string,
    records: DatasetRecord[],
  ): Promise<ApiResponse<DatasetRecord[]>>;
  updateDatasetRecords(
    code: string,
    updates: { original: DatasetRecord; changes: DatasetRecord }[],
    fieldNames: string[],
  ): Promise<ApiResponse<void>>;
  deleteDatasetRecords(
    code: string,
    records: DatasetRecord[],
    fieldNames: string[],
  ): Promise<ApiResponse<void>>;
  getBpmDatasets(params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedApiResponse<DatasetDefinition>>;
  getBpmDatasetCodeByName(name: string): Promise<ApiResponse<{ code: string }>>;
  getBpmDataset(code: string): Promise<ApiResponse<DatasetDefinition>>;
  getBpmDatasetRecords(
    code: string,
    params?: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
      select?: string | string[];
    } & Record<string, any>,
  ): Promise<PaginatedApiResponse<DatasetRecord>>;
  testExternalApi(apiConfig: {
    url: string;
    method: "GET" | "POST" | "PUT";
    headers?: Record<string, string>;
    body?: string;
  }): Promise<ApiResponse<unknown>>;
  callExternalApiProxy(config: {
    url: string;
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    params?: Record<string, string>;
    headers?: Record<string, string>;
    body?: unknown;
  }): Promise<unknown>;
  importDatasetCsv(
    code: string,
    file: File,
  ): Promise<ApiResponse<{ inserted: number }>>;
  exportDatasetCsv(code: string): Promise<Blob>;

  // Validator Management
  getValidators(
    options?: ValidatorListOptions,
  ): Promise<PaginatedApiResponse<Validator>>;
  getValidator(id: string): Promise<ApiResponse<Validator>>;
  createValidator(dto: CreateValidatorDto): Promise<ApiResponse<Validator>>;
  updateValidator(
    id: string,
    dto: UpdateValidatorDto,
  ): Promise<ApiResponse<Validator>>;
  deleteValidator(id: string): Promise<ApiResponse<void>>;
  setValidatorComponents(
    id: string,
    components: string[],
  ): Promise<ApiResponse<void>>;
  validateApplicationFields(
    payload: ValidateFieldsRequest,
  ): Promise<ApiResponse<ValidateFieldsResponse>>;

  // Application Management
  createApplication(
    payload: Omit<
      Application,
      "submittedAt" | "id" | "serialNumber" | "approvalId"
    > & { draftId?: string | null },
  ): Promise<ApiResponse<Application>>;
  getApplication(id: string): Promise<ApiResponse<Application>>;
  getApprovalApplication(approvalId: string): Promise<ApiResponse<Application>>;
  getApplications(
    options?: ApplicationOptions,
  ): Promise<PaginatedApiResponse<Application>>;
  getApplicationForms(
    options?: ApplicationFormOptions,
  ): Promise<PaginatedApiResponse<ApplicationForm>>;
  getApplicationForm(bindingId: string): Promise<ApiResponse<FormDefinition>>;
  updateApplication(
    id: string,
    application: Partial<Application>,
  ): Promise<ApiResponse<Application>>;
  discardApplication(id: string): Promise<ApiResponse<void>>;
  approveApplication(
    serialNumber: string,
    approvalId: string,
    comment?: string,
    formData?: Record<string, string>,
  ): Promise<ApiResponse<unknown>>;
  rejectApplication(
    serialNumber: string,
    approvalId: string,
    comment?: string,
    formData?: Record<string, string>,
  ): Promise<ApiResponse<unknown>>;
  getApplicationProgress(
    applicationId: string,
  ): Promise<ApiResponse<{ progress: Progress; overallStatus: OverallStatus }>>;
  getComments(serialNumber: string): Promise<ApiResponse<Comment[]>>;
}

export interface IApplicationService {
  createApplication(
    payload: Omit<
      Application,
      "submittedAt" | "id" | "serialNumber" | "approvalId"
    > & { draftId?: string | null },
  ): Promise<ApiResponse<Application>>;
  getApplication(id: string): Promise<ApiResponse<Application>>;
  getApprovalApplication(approvalId: string): Promise<ApiResponse<Application>>;
  getApplications(
    options?: ApplicationOptions,
  ): Promise<PaginatedApiResponse<Application>>;
  getApplicationForms(
    options?: ApplicationFormOptions,
  ): Promise<PaginatedApiResponse<ApplicationForm>>;
  getApplicationForm(bindingId: string): Promise<ApiResponse<FormDefinition>>;
  updateApplication(
    id: string,
    application: Partial<Application>,
  ): Promise<ApiResponse<Application>>;
  discardApplication(id: string): Promise<ApiResponse<void>>;
  approveApplication(
    serialNumber: string,
    approvalId: string,
    comment?: string,
    formData?: Record<string, string>,
  ): Promise<ApiResponse<unknown>>;
  rejectApplication(
    serialNumber: string,
    approvalId: string,
    comment?: string,
    formData?: Record<string, string>,
  ): Promise<ApiResponse<unknown>>;
  getApplicationProgress(
    applicationId: string,
  ): Promise<ApiResponse<{ progress: Progress; overallStatus: OverallStatus }>>;
  getComments(serialNumber: string): Promise<ApiResponse<Comment[]>>;
}

export interface IWorkflowService {
  getWorkflows(
    options?: WorkflowListOptions,
  ): Promise<PaginatedApiResponse<FlowDefinition>>;
  createWorkflow(
    workflow: Omit<FlowDefinition, "id" | "createdAt" | "updatedAt">,
  ): Promise<ApiResponse<FlowDefinition>>;
  getWorkflow(id: string): Promise<ApiResponse<FlowDefinition>>;
  updateWorkflow(
    id: string,
    workflow: Partial<FlowDefinition>,
  ): Promise<ApiResponse<FlowDefinition>>;
  updateWorkflowSerialPrefix(
    id: string,
    serialPrefix: string,
  ): Promise<ApiResponse<FlowDefinition>>;
  bindFormToWorkflow(
    formId: string,
    workflowId: string,
  ): Promise<ApiResponse<FormDefinition>>;
  deleteWorkflow(id: string): Promise<ApiResponse<void>>;
  exportWorkflow(id: string): Promise<ApiResponse<ExportPayload>>;
  importWorkflowCheck(
    payload: ExportPayload,
  ): Promise<ApiResponse<ImportCheckResponse>>;
  importWorkflowExecute(
    checkResult: ImportCheckResponse,
  ): Promise<ApiResponse<{ public_id: string }>>;
}

export interface IPermissionService {
  getWorkflowPermissions(workflowId: string): Promise<ApiResponse<Permission>>;
  addWorkflowPermissions(
    workflowId: string,
    permission: Permission,
  ): Promise<ApiResponse<Permission>>;
  updateWorkflowPermissions(
    workflowId: string,
    permission: Permission,
  ): Promise<ApiResponse<Permission>>;
  deleteWorkflowPermissions(
    workflowId: string,
    query?: BackendWorkflowPermissionDeleteQuery,
  ): Promise<ApiResponse<void>>;
  deleteWorkflowPermission(id: number): Promise<ApiResponse<void>>;

  getFormPermissions(formId: string): Promise<ApiResponse<Permission>>;
  addFormPermissions(
    formId: string,
    permission: Permission,
  ): Promise<ApiResponse<Permission>>;
  updateFormPermissions(
    formId: string,
    permission: Permission,
  ): Promise<ApiResponse<Permission>>;
  deleteFormPermissions(
    formId: string,
    query?: BackendFormPermissionDeleteQuery,
  ): Promise<ApiResponse<void>>;
  deleteFormPermission(id: number): Promise<ApiResponse<void>>;

  getApplicationShares(
    serialNumber: string,
  ): Promise<ApiResponse<ApplicationShare[]>>;
  addApplicationShares(
    serialNumber: string,
    shares: ApplicationShareInput[],
  ): Promise<ApiResponse<ApplicationShare[]>>;
  updateApplicationShares(
    serialNumber: string,
    shares: ApplicationShareInput[],
  ): Promise<ApiResponse<ApplicationShare[]>>;
  deleteApplicationShares(
    serialNumber: string,
    query: ApplicationShareDeleteQuery,
  ): Promise<ApiResponse<void>>;
  deleteApplicationShare(id: number): Promise<ApiResponse<void>>;
}

export interface IFormService {
  getForm(id: string): Promise<ApiResponse<FormDefinition>>;
  getResolvedForm(formId: string): Promise<ApiResponse<ResolvedFormDefinition>>;
  getForms(
    options?: FormListOptions,
  ): Promise<PaginatedApiResponse<FormDefinition>>;
  create(
    form: Omit<FormDefinition, "revisionId" | "id" | "createdAt" | "updatedAt">,
  ): Promise<ApiResponse<FormDefinition>>;
  update(form: FormDefinition): Promise<ApiResponse<FormDefinition>>;
  deleteForm(id: string): Promise<ApiResponse<void>>;
  exportForm(id: string): Promise<ApiResponse<ExportPayload>>;
  importCheck(
    payload: ExportPayload,
  ): Promise<ApiResponse<ImportCheckResponse>>;
  importExecute(
    checkResult: ImportCheckResponse,
  ): Promise<ApiResponse<{ public_id: string }>>;
}

export interface IMasterDataService {
  getTags(): Promise<ApiResponse<Tag[]>>;
  getUsers(params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedApiResponse<User>>;
  getUserById(id: string): Promise<ApiResponse<User>>;
  getOrgUnits(name?: string): Promise<ApiResponse<Unit[]>>;
  getOrgUnitById(id: string): Promise<ApiResponse<Unit>>;
  getOrgUnitByCode(code: string): Promise<ApiResponse<Unit>>;
  getOrgRoles(name?: string): Promise<ApiResponse<Role[]>>;
  getOrgUnitHeads(): Promise<ApiResponse<User[]>>;
  getBpmDatasets(params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedApiResponse<DatasetDefinition>>;
  getBpmDatasetCodeByName(name: string): Promise<ApiResponse<{ code: string }>>;
  getBpmDataset(code: string): Promise<ApiResponse<DatasetDefinition>>;
  getBpmDatasetRecords(
    code: string,
    params?: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
      select?: string | string[];
    } & Record<string, any>,
  ): Promise<PaginatedApiResponse<DatasetRecord>>;
  testExternalApi(apiConfig: {
    url: string;
    method: "GET" | "POST" | "PUT";
    headers?: Record<string, string>;
    body?: string;
  }): Promise<ApiResponse<unknown>>;
  callExternalApiProxy(config: {
    url: string;
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    params?: Record<string, string>;
    headers?: Record<string, string>;
    body?: unknown;
  }): Promise<unknown>;
}

export interface ISettingsService {
  getAppSettings(): AppSettings;
  updateAppSettings(settings: Partial<AppSettings>): void;
  getCounterSettings(): CounterSettings;
  updateCounterSettings(settings: Partial<CounterSettings>): void;
}

export interface ICounterService {
  getValue(): number;
  increment(step?: number): number;
  decrement(step?: number): number;
  reset(): number;
  setValue(value: number): number;
}

export interface IStorageService {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
  clear(): void;
}

export interface IValidationService {
  validate<T>(schema: any, data: unknown): T;
  isValid(schema: any, data: unknown): boolean;
}

export interface IValidatorService {
  getValidators(
    options?: ValidatorListOptions,
  ): Promise<PaginatedApiResponse<Validator>>;
  getValidator(id: string): Promise<ApiResponse<Validator>>;
  createValidator(dto: CreateValidatorDto): Promise<ApiResponse<Validator>>;
  updateValidator(
    id: string,
    dto: UpdateValidatorDto,
  ): Promise<ApiResponse<Validator>>;
  deleteValidator(id: string): Promise<ApiResponse<void>>;
  setValidatorComponents(
    id: string,
    components: string[],
  ): Promise<ApiResponse<void>>;
  validateApplicationFields(
    payload: ValidateFieldsRequest,
  ): Promise<ApiResponse<ValidateFieldsResponse>>;
}

export interface IAuthService {
  signInWithRedirect(): Promise<void>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<{
    user: any;
    attributes: any;
    session: any;
  } | null>;
  fetchAuthSession(): Promise<any | null>;
  handleAuthCallback(): Promise<void>;
  refreshToken(): Promise<string | null>;
}

export interface ILanguageService {
  getCurrentLanguage(): string;
  changeLanguage(language: string): Promise<void>;
  getSupportedLanguages(): Array<{
    code: string;
    name: string;
    nativeName: string;
    flag: string;
  }>;
  t(key: string, options?: any): string;
}
