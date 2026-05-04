import { injectable } from "inversify";
import { IDomainService } from "@/interfaces/services";
import type {
  ApiResponse,
  PaginatedApiResponse,
  FormDefinition,
  ResolvedFormDefinition,
  Tag,
  FlowDefinition,
  FlowInstance,
  User,
  Unit,
  Role,
  FormListOptions,
  WorkflowListOptions,
} from "@/types/domain";
import {
  APPROVED_EXPENSE_PROGRESS,
  EXPENSE_PROGRESS,
  PENDING_EXPENSE_PROGRESS,
  REJECTED_EXPENSE_PROGRESS,
} from "@/data/mock-progress";
import {
  mockApplications,
  mockTags,
  mockForms,
  mockFlows,
  mockUsers,
} from "@/data/mock-data";
import {
  Application,
  ApplicationForm,
  ApplicationFormOptions,
  ApplicationOptions,
  OverallStatus,
  Progress,
  ReviewStatus,
  Comment,
} from "@/types/application";
import { ValidatorListOptions, Validator } from "@/types/validator";
import {
  CreateValidatorDto,
  UpdateValidatorDto,
} from "@/types/validation-registry";
import {
  ValidateFieldsRequest,
  ValidateFieldsResponse,
} from "@/schemas/validator/validate-fields";
import {
  DatasetDefinition,
  CreateDatasetDto,
  DatasetRecord,
  ExternalApiRequestConfig,
  ExternalApiFieldMappingsDto,
} from "@/types/master-data-dataset";
import { Permission, WorkflowPermission } from "@/types/permission";
import {
  BackendWorkflowPermissionDeleteQuery,
  BackendFormPermissionDeleteQuery,
} from "@/schemas/permission/response";
import { FormPermission } from "@/types/permission";
import {
  ApplicationShare,
  ApplicationShareDeleteQuery,
  ApplicationShareInput,
} from "@/types/permission";
import {
  tPermissionFromFormPermissions,
  tPermissionFromWorkflowPermissions,
} from "@/schemas/permission/transform";

@injectable()
export class MockDomainService implements IDomainService {
  private forms: FormDefinition[] = [];
  private workflows: FlowDefinition[] = [];
  private workflowInstances: FlowInstance[] = [];
  private departments: Tag[] = [];
  private applications: Application[] = [];
  private workflowPermissions: Record<string, WorkflowPermission[]> = {};
  private workflowPermissionId = 1;
  private formPermissions: Record<string, FormPermission[]> = {};
  private formPermissionId = 1;
  private applicationShares: Record<string, ApplicationShare[]> = {};
  private applicationShareId = 1;

  constructor() {
    this.initializeMockData();
  }
  getValidators(
    options?: ValidatorListOptions,
  ): Promise<PaginatedApiResponse<Validator>> {
    throw new Error("Method not implemented.");
  }
  getValidator(id: string): Promise<ApiResponse<Validator>> {
    throw new Error("Method not implemented.");
  }
  createValidator(dto: CreateValidatorDto): Promise<ApiResponse<Validator>> {
    throw new Error("Method not implemented.");
  }
  updateValidator(
    id: string,
    dto: UpdateValidatorDto,
  ): Promise<ApiResponse<Validator>> {
    throw new Error("Method not implemented.");
  }
  deleteValidator(id: string): Promise<ApiResponse<void>> {
    throw new Error("Method not implemented.");
  }
  setValidatorComponents(
    id: string,
    components: string[],
  ): Promise<ApiResponse<void>> {
    throw new Error("Method not implemented.");
  }
  validateApplicationFields(
    payload: ValidateFieldsRequest,
  ): Promise<ApiResponse<ValidateFieldsResponse>> {
    throw new Error("Method not implemented.");
  }
  getApprovalApplication(
    approvalId: string,
  ): Promise<ApiResponse<Application>> {
    throw new Error("Method not implemented.");
  }

  getMe(): Promise<ApiResponse<User>> {
    throw new Error("Method not implemented.");
  }

  private initializeMockData() {
    this.departments = mockTags;
    this.forms = mockForms;
    this.workflows = mockFlows;
    this.applications = mockApplications;
    console.log(
      `[MockDomainService] Initialized with ${this.applications.length} applications.`,
    );
  }

  // Form Management
  async getForms(
    options?: FormListOptions,
  ): Promise<PaginatedApiResponse<FormDefinition>> {
    await this.delay(100);
    const page = Math.max(1, options?.page ?? 1);
    const limit = Math.max(1, options?.limit ?? 10);
    const filterName = options?.filter?.name?.toLowerCase().trim();
    const tagIds = options?.filter?.tagIds;
    const sortOrder = options?.sorter?.createdAt ?? "desc";

    let items = [...this.forms];

    if (filterName) {
      items = items.filter((form) =>
        form.name.toLowerCase().includes(filterName),
      );
    }

    if (tagIds?.length) {
      const normalizedIds = tagIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id));
      if (normalizedIds.length) {
        items = items.filter((form) =>
          form.tags.some((tag) => normalizedIds.includes(Number(tag.id))),
        );
      }
    }

    items.sort((a, b) => {
      const aDate = new Date(a.createdAt ?? "").getTime();
      const bDate = new Date(b.createdAt ?? "").getTime();
      if (sortOrder === "asc") {
        return aDate - bDate;
      }
      return bDate - aDate;
    });

    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const paginatedItems = items.slice(start, start + limit);

    return {
      success: true,
      data: {
        items: paginatedItems,
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async getForm(id: string): Promise<ApiResponse<FormDefinition>> {
    await this.delay(100);
    const form = this.forms.find((f) => f.id === id);
    return {
      success: !!form,
      data: form,
      error: form ? undefined : "Form not found",
    };
  }

  async getResolvedForm(
    formId: string,
  ): Promise<ApiResponse<ResolvedFormDefinition>> {
    await this.delay(100);
    const form = this.forms.find((f) => f.id === formId);
    return {
      success: !!form,
      data: form
        ? {
            id: form.id,
            revisionId: form.revisionId,
            name: form.name,
            description: form.description,
            formSchema: {},
            options: {
              canWithdraw: true,
              canCopy: true,
              canDraft: true,
              canDelegate: true,
            },
          }
        : undefined,
      error: form ? undefined : "Form not found",
    };
  }

  async createForm(
    form: Omit<
      FormDefinition,
      "revisionId" | "id" | "created_at" | "updated_at"
    >,
  ): Promise<ApiResponse<FormDefinition>> {
    await this.delay(200);
    const newForm: FormDefinition = {
      ...form,
      id: `form_${Date.now()}`,
      revisionId: `revision_${Date.now()}`,
      createdAt: "",
      updatedAt: "",
    };
    this.forms = [newForm, ...this.forms];
    return {
      success: true,
      data: newForm,
    };
  }

  async updateForm(form: FormDefinition): Promise<ApiResponse<FormDefinition>> {
    await this.delay(200);
    const index = this.forms.findIndex((f) => f.id === form.id);
    if (index === -1) {
      return {
        success: false,
        error: "Form not found",
      };
    }

    this.forms[index] = {
      ...this.forms[index],
      ...form,
      updatedAt: "",
    };
    return {
      success: true,
      data: this.forms[index],
    };
  }

  async deleteForm(id: string): Promise<ApiResponse<void>> {
    await this.delay(200);
    const index = this.forms.findIndex((f) => f.id === id);
    if (index === -1) {
      return {
        success: false,
        error: "Form not found",
      };
    }

    this.forms.splice(index, 1);
    return {
      success: true,
    };
  }

  async exportForm(
    id: string,
  ): Promise<ApiResponse<import("@/types/domain").ExportPayload>> {
    await this.delay(300);
    const form = this.forms.find((f) => f.id === id);
    if (!form) {
      return { success: false, error: "Form not found" };
    }
    return {
      success: true,
      data: {
        protocol_version: "1.0",
        exported_at: new Date().toISOString(),
        exported_by: "mock_user",
        type: "FORM",
        payload: {
          public_id: form.id,
          is_template: false,
          latest_revision: {
            public_id: form.revisionId,
            name: form.name,
            description: form.description,
            form_schema: form.schema,
          },
          dependencies: { tags: [], validations: [] },
        },
      },
    };
  }

  async importCheck(
    payload: import("@/types/domain").ExportPayload,
  ): Promise<ApiResponse<import("@/types/domain").ImportCheckResponse>> {
    await this.delay(500);
    return {
      success: true,
      data: {
        can_proceed: true,
        summary: {
          entity_exists: false,
          action: "CREATE",
          revision_diff: false,
        },
        dependencies_check: {
          validations: [],
          org_units: [],
          users: [],
        },
        original_payload: payload,
      },
    };
  }

  async importExecute(
    _checkResult: import("@/types/domain").ImportCheckResponse,
  ): Promise<ApiResponse<{ id: string }>> {
    await this.delay(500);
    return { success: true, data: { id: "mock-imported-form-id" } };
  }

  // Workflow Management
  async getWorkflows(
    options?: WorkflowListOptions,
  ): Promise<PaginatedApiResponse<FlowDefinition>> {
    await this.delay(100);
    const page = Math.max(1, options?.page ?? 1);
    const limit = Math.max(1, options?.limit ?? 10);
    const filterName = options?.filter?.name?.toLowerCase().trim();
    const tagIds = options?.filter?.tagIds;
    const sortOrder = options?.sorter?.createdAt ?? "desc";

    let items = [...this.workflows];

    if (filterName) {
      items = items.filter((workflow) =>
        workflow.name.toLowerCase().includes(filterName),
      );
    }

    if (tagIds?.length) {
      const normalizedIds = tagIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id));
      if (normalizedIds.length) {
        items = items.filter((workflow) =>
          workflow.tags.some((tag) => normalizedIds.includes(Number(tag.id))),
        );
      }
    }

    items.sort((a, b) => {
      const aDate = new Date(a.createdAt ?? "").getTime();
      const bDate = new Date(b.createdAt ?? "").getTime();
      if (sortOrder === "asc") {
        return aDate - bDate;
      }
      return bDate - aDate;
    });

    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const paginatedItems = items.slice(start, start + limit);

    return {
      success: true,
      data: {
        items: paginatedItems,
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async getWorkflow(id: string): Promise<ApiResponse<FlowDefinition>> {
    await this.delay(100);
    const workflow = this.workflows.find((w) => w.id === id);
    return {
      success: !!workflow,
      data: workflow,
      error: workflow ? undefined : "Workflow not found",
    };
  }

  async createWorkflow(
    workflow: Omit<FlowDefinition, "id" | "created_at" | "updated_at">,
  ): Promise<ApiResponse<FlowDefinition>> {
    await this.delay(200);
    const newWorkflow: FlowDefinition = {
      ...workflow,
      id: `workflow_${Date.now()}`,
      createdAt: new Date().toString(),
      updatedAt: new Date().toString(),
    };
    this.workflows.push(newWorkflow);
    return {
      success: true,
      data: newWorkflow,
    };
  }

  async updateWorkflow(
    id: string,
    workflow: Partial<FlowDefinition>,
  ): Promise<ApiResponse<FlowDefinition>> {
    await this.delay(200);
    const index = this.workflows.findIndex((w) => w.id === id);
    if (index === -1) {
      return {
        success: false,
        error: "Workflow not found",
      };
    }

    this.workflows[index] = {
      ...this.workflows[index],
      ...workflow,
      id, // Preserve ID
      updatedAt: new Date().toString(),
    };
    return {
      success: true,
      data: this.workflows[index],
    };
  }

  async updateWorkflowSerialPrefix(
    id: string,
    serialPrefix: string,
  ): Promise<ApiResponse<FlowDefinition>> {
    await this.delay(100);
    const index = this.workflows.findIndex((w) => w.id === id);
    if (index === -1) {
      return {
        success: false,
        error: "Workflow not found",
      };
    }
    this.workflows[index] = {
      ...this.workflows[index],
      serialPrefix,
      updatedAt: new Date().toString(),
    };
    return {
      success: true,
      data: this.workflows[index],
    };
  }

  async bindFormToWorkflow(
    formId: string,
    workflowId: string,
  ): Promise<ApiResponse<FormDefinition>> {
    return {
      success: true,
      data: this.forms.find((f) => f.id === formId),
    };
  }

  async deleteWorkflow(id: string): Promise<ApiResponse<void>> {
    await this.delay(200);
    const index = this.workflows.findIndex((w) => w.id === id);
    if (index === -1) {
      return {
        success: false,
        error: "Workflow not found",
      };
    }

    this.workflows.splice(index, 1);
    return {
      success: true,
    };
  }

  async exportWorkflow(
    id: string,
  ): Promise<ApiResponse<import("@/types/domain").ExportPayload>> {
    await this.delay(300);
    const workflow = this.workflows.find((w) => w.id === id);
    if (!workflow) {
      return { success: false, error: "Workflow not found" };
    }
    return {
      success: true,
      data: {
        protocol_version: "1.0",
        exported_at: new Date().toISOString(),
        exported_by: "mock_user",
        type: "WORKFLOW",
        payload: {
          public_id: workflow.id,
          latest_revision: {
            public_id: workflow.revisionId,
            name: workflow.name,
            description: workflow.description,
            flow_definition: {
              nodes: workflow.nodes,
              edges: workflow.edges,
            },
          },
          dependencies: { tags: [], validations: [] },
        },
      },
    };
  }

  async importWorkflowCheck(
    payload: import("@/types/domain").ExportPayload,
  ): Promise<ApiResponse<import("@/types/domain").ImportCheckResponse>> {
    await this.delay(500);
    return {
      success: true,
      data: {
        can_proceed: true,
        summary: {
          entity_exists: false,
          action: "CREATE",
          revision_diff: false,
        },
        dependencies_check: {
          validations: [],
          org_units: [],
          users: [],
        },
        original_payload: payload,
      },
    };
  }

  async importWorkflowExecute(
    _checkResult: import("@/types/domain").ImportCheckResponse,
  ): Promise<ApiResponse<{ public_id: string }>> {
    await this.delay(500);
    return { success: true, data: { public_id: "mock-imported-workflow-id" } };
  }

  async getWorkflowPermissions(
    workflowId: string,
  ): Promise<ApiResponse<Permission>> {
    const permissions = this.workflowPermissions[workflowId] ?? [];
    return {
      success: true,
      data: tPermissionFromWorkflowPermissions(permissions),
    };
  }

  async addWorkflowPermissions(
    workflowId: string,
    permission: Permission,
  ): Promise<ApiResponse<Permission>> {
    const current = this.workflowPermissions[workflowId] ?? [];
    const next = [
      ...permission.permissions.user,
      ...permission.permissions.role,
      ...permission.permissions.org,
    ].map((entry) => ({
      grantee_type: entry.granteeType,
      grantee_value: entry.value,
      actions: entry.actions,
      id: this.workflowPermissionId++,
      workflow_id: Number(workflowId) || 0,
    }));
    this.workflowPermissions[workflowId] = [...current, ...next];
    return {
      success: true,
      data: tPermissionFromWorkflowPermissions([...current, ...next]),
    };
  }

  async updateWorkflowPermissions(
    workflowId: string,
    permission: Permission,
  ): Promise<ApiResponse<Permission>> {
    const next = [
      ...permission.permissions.user,
      ...permission.permissions.role,
      ...permission.permissions.org,
    ].map((entry) => ({
      grantee_type: entry.granteeType,
      grantee_value: entry.value,
      actions: entry.actions,
      id: this.workflowPermissionId++,
      workflow_id: Number(workflowId) || 0,
    }));
    this.workflowPermissions[workflowId] = next;
    return {
      success: true,
      data: tPermissionFromWorkflowPermissions(next),
    };
  }

  async deleteWorkflowPermissions(
    workflowId: string,
    query?: BackendWorkflowPermissionDeleteQuery,
  ): Promise<ApiResponse<void>> {
    return { success: true };
  }

  async deleteWorkflowPermission(id: number): Promise<ApiResponse<void>> {
    Object.keys(this.workflowPermissions).forEach((workflowId) => {
      this.workflowPermissions[workflowId] = (
        this.workflowPermissions[workflowId] ?? []
      ).filter((permission) => permission.id !== id);
    });
    return { success: true };
  }

  async getFormPermissions(formId: string): Promise<ApiResponse<Permission>> {
    const permissions = this.formPermissions[formId] ?? [];
    return {
      success: true,
      data: tPermissionFromFormPermissions(permissions),
    };
  }

  async addFormPermissions(
    formId: string,
    permission: Permission,
  ): Promise<ApiResponse<Permission>> {
    const current = this.formPermissions[formId] ?? [];
    const next = [
      ...permission.permissions.user,
      ...permission.permissions.role,
      ...permission.permissions.org,
    ].map((entry) => ({
      grantee_type: entry.granteeType,
      grantee_value: entry.value,
      actions: entry.actions,
      id: this.formPermissionId++,
      form_id: Number(formId) || 0,
    }));
    this.formPermissions[formId] = [...current, ...next];
    return {
      success: true,
      data: tPermissionFromFormPermissions([...current, ...next]),
    };
  }

  async updateFormPermissions(
    formId: string,
    permission: Permission,
  ): Promise<ApiResponse<Permission>> {
    const next = [
      ...permission.permissions.user,
      ...permission.permissions.role,
      ...permission.permissions.org,
    ].map((entry) => ({
      grantee_type: entry.granteeType,
      grantee_value: entry.value,
      actions: entry.actions,
      id: this.formPermissionId++,
      form_id: Number(formId) || 0,
    }));
    this.formPermissions[formId] = next;
    return {
      success: true,
      data: tPermissionFromFormPermissions(next),
    };
  }

  async deleteFormPermissions(
    formId: string,
    query?: BackendFormPermissionDeleteQuery,
  ): Promise<ApiResponse<void>> {
    return { success: true };
  }

  async deleteFormPermission(id: number): Promise<ApiResponse<void>> {
    Object.keys(this.formPermissions).forEach((formId) => {
      this.formPermissions[formId] = (
        this.formPermissions[formId] ?? []
      ).filter((permission) => permission.id !== id);
    });
    return { success: true };
  }

  async getApplicationShares(
    serialNumber: string,
  ): Promise<ApiResponse<ApplicationShare[]>> {
    const shares = this.applicationShares[serialNumber] ?? [];
    return {
      success: true,
      data: shares,
    };
  }

  async addApplicationShares(
    serialNumber: string,
    shares: ApplicationShareInput[],
  ): Promise<ApiResponse<ApplicationShare[]>> {
    const current = this.applicationShares[serialNumber] ?? [];
    const next = shares.map((share) => ({
      ...share,
      id: this.applicationShareId++,
      workflow_instance_id: 0,
      created_by: 0,
      created_at: new Date().toISOString(),
    }));
    this.applicationShares[serialNumber] = [...current, ...next];
    return {
      success: true,
      data: next,
    };
  }

  async updateApplicationShares(
    serialNumber: string,
    shares: ApplicationShareInput[],
  ): Promise<ApiResponse<ApplicationShare[]>> {
    const next = shares.map((share) => ({
      ...share,
      id: this.applicationShareId++,
      workflow_instance_id: 0,
      created_by: 0,
      created_at: new Date().toISOString(),
    }));
    this.applicationShares[serialNumber] = next;
    return {
      success: true,
      data: next,
    };
  }

  async deleteApplicationShares(
    serialNumber: string,
    query: ApplicationShareDeleteQuery,
  ): Promise<ApiResponse<void>> {
    const current = this.applicationShares[serialNumber] ?? [];
    this.applicationShares[serialNumber] = current.filter(
      (share) => String(share.user_id) !== query.user_id,
    );
    return { success: true };
  }

  async deleteApplicationShare(id: number): Promise<ApiResponse<void>> {
    Object.keys(this.applicationShares).forEach((serialNumber) => {
      this.applicationShares[serialNumber] = (
        this.applicationShares[serialNumber] ?? []
      ).filter((share) => share.id !== id);
    });
    return { success: true };
  }

  // Workflow Instance Management
  async getWorkflowInstances(): Promise<PaginatedApiResponse<FlowInstance>> {
    await this.delay(100);
    return {
      success: true,
      data: {
        items: [...this.workflowInstances],
        total: this.workflowInstances.length,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
    };
  }

  async getWorkflowInstance(id: string): Promise<ApiResponse<FlowInstance>> {
    await this.delay(100);
    const instance = this.workflowInstances.find((i) => i.id === id);
    return {
      success: !!instance,
      data: instance,
      error: instance ? undefined : "Workflow instance not found",
    };
  }

  async startWorkflow(
    workflowId: string,
    formData: Record<string, any>,
  ): Promise<ApiResponse<FlowInstance>> {
    await this.delay(300);
    const workflow = this.workflows.find((w) => w.id === workflowId);
    if (!workflow) {
      return {
        success: false,
        error: "Workflow not found",
      };
    }

    const instance: FlowInstance = {
      ...workflow,
      id: `instance_${Date.now()}`,
      status: "draft",
    };

    this.workflowInstances.push(instance);
    return {
      success: true,
      data: instance,
    };
  }

  // Department Management
  async getTags(): Promise<ApiResponse<Tag[]>> {
    await this.delay(50);
    return {
      success: true,
      data: [...this.departments],
    };
  }

  async getUsers(params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedApiResponse<User>> {
    await this.delay(50);
    const normalizedSearch = params?.search?.trim().toLowerCase();
    const filteredUsers = normalizedSearch
      ? mockUsers.filter(
          (user) =>
            user.name.toLowerCase().includes(normalizedSearch) ||
            user.email.toLowerCase().includes(normalizedSearch),
        )
      : mockUsers;

    const page = params?.page ?? 1;
    const limit = params?.limit ?? 50;
    const start = (page - 1) * limit;
    const items = filteredUsers.slice(start, start + limit);

    return {
      success: true,
      data: {
        items,
        total: filteredUsers.length,
        page,
        limit,
        totalPages: Math.ceil(filteredUsers.length / limit),
      },
    };
  }
  async getOrgUnits(_name?: string): Promise<ApiResponse<Unit[]>> {
    await this.delay(100);
    return {
      success: true,
      data: [],
    };
  }
  async getOrgUnitById(id: string): Promise<ApiResponse<Unit>> {
    await this.delay(100);
    return {
      success: true,
      data: {
        id,
        name: "",
        members: [],
        code: "",
        type: "ORG_UNIT",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  }
  async getOrgUnitMembers(_: string): Promise<ApiResponse<User[]>> {
    await this.delay(100);
    return {
      success: true,
      data: [],
    };
  }
  async getOrgUnitByCode(code: string): Promise<ApiResponse<Unit>> {
    await this.delay(100);
    return {
      success: true,
      data: {
        id: "",
        name: "",
        members: [],
        code,
        type: "ORG_UNIT",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  }
  async getOrgRoles(_name?: string): Promise<ApiResponse<Role[]>> {
    await this.delay(100);
    return {
      success: true,
      data: [],
    };
  }

  async getOrgUnitHeads(): Promise<ApiResponse<User[]>> {
    await this.delay(100);
    return {
      success: true,
      data: [],
    };
  }

  async getOrgUnitHeadsByOrgId(): Promise<ApiResponse<any[]>> {
    return { success: true, data: [] };
  }

  async getAllOrgHeads(): Promise<ApiResponse<Record<string, User | null>>> {
    await this.delay(100);
    return { success: true, data: {} };
  }

  async createOrgUnit(): Promise<ApiResponse<Unit>> {
    throw new Error("Not implemented in mock service");
  }

  async createRole(): Promise<ApiResponse<Unit>> {
    throw new Error("Not implemented in mock service");
  }

  async updateOrgUnit(): Promise<ApiResponse<Unit>> {
    throw new Error("Not implemented in mock service");
  }

  async deleteOrgUnit(): Promise<ApiResponse<void>> {
    throw new Error("Not implemented in mock service");
  }

  async updateUserDefaultOrg(): Promise<ApiResponse<User>> {
    throw new Error("Not implemented in mock service");
  }

  async createOrgHead(
    _orgUnitId: string,
    _userId: string,
    _startDate: string,
    _endDate?: string,
  ): Promise<ApiResponse<void>> {
    throw new Error("Not implemented in mock service");
  }

  async updateOrgHead(
    _headId: string,
    _startDate: string,
    _endDate?: string,
  ): Promise<ApiResponse<void>> {
    throw new Error("Not implemented in mock service");
  }

  async deleteOrgHead(_headId: string): Promise<ApiResponse<void>> {
    throw new Error("Not implemented in mock service");
  }

  async addUserToOrgUnit(): Promise<ApiResponse<Unit>> {
    throw new Error("Not implemented in mock service");
  }

  async removeUserFromOrgUnit(): Promise<ApiResponse<Unit>> {
    throw new Error("Not implemented in mock service");
  }

  // Dataset Management
  async getDatasets(params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedApiResponse<DatasetDefinition>> {
    return {
      success: true,
      data: {
        items: [],
        total: 0,
        page: params?.page ?? 1,
        limit: params?.limit ?? 10,
        totalPages: 0,
      },
    };
  }
  async getDataset(code: string): Promise<ApiResponse<DatasetDefinition>> {
    return {
      success: true,
      data: { code, name: "", fields: [], primaryKey: "" },
    };
  }
  async createDataset(
    dto: CreateDatasetDto,
  ): Promise<ApiResponse<DatasetDefinition>> {
    return {
      success: true,
      data: {
        code: `ds_${Date.now()}`,
        name: dto.name,
        fields: dto.fields ?? [],
        primaryKey: dto.primaryKey ?? "id",
      },
    };
  }
  async deleteDataset(code: string): Promise<ApiResponse<void>> {
    return { success: true, data: undefined };
  }
  async updateExternalApiConfig(
    code: string,
    dto: {
      api_config?: ExternalApiRequestConfig | null;
      field_mappings?: ExternalApiFieldMappingsDto | null;
    },
  ): Promise<ApiResponse<DatasetDefinition>> {
    return {
      success: true,
      data: {
        code,
        name: code,
        fields: [],
        primaryKey: "",
        source_type: "EXTERNAL_API",
        api_config: dto.api_config ?? null,
        field_mappings: dto.field_mappings ?? null,
      },
    };
  }
  async getDatasetRecords(
    code: string,
    params?: { page?: number; limit?: number } & Record<string, any>,
  ): Promise<PaginatedApiResponse<DatasetRecord>> {
    return {
      success: true,
      data: { items: [], total: 0, page: 1, limit: 50, totalPages: 0 },
    };
  }
  async createDatasetRecords(
    code: string,
    records: DatasetRecord[],
  ): Promise<ApiResponse<DatasetRecord[]>> {
    return { success: true, data: [] };
  }
  async updateDatasetRecords(
    code: string,
    updates: { original: DatasetRecord; changes: DatasetRecord }[],
    fieldNames: string[],
  ): Promise<ApiResponse<void>> {
    return { success: true };
  }
  async deleteDatasetRecords(
    code: string,
    records: DatasetRecord[],
    fieldNames: string[],
  ): Promise<ApiResponse<void>> {
    return { success: true, data: undefined };
  }
  async getBpmDatasets(params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedApiResponse<DatasetDefinition>> {
    return {
      success: true,
      data: {
        items: [],
        total: 0,
        page: params?.page ?? 1,
        limit: params?.limit ?? 10,
        totalPages: 0,
      },
    };
  }
  async getBpmDatasetCodeByName(
    name: string,
  ): Promise<ApiResponse<{ code: string }>> {
    return {
      success: true,
      data: {
        code: name,
      },
    };
  }
  async getBpmDataset(code: string): Promise<ApiResponse<DatasetDefinition>> {
    return {
      success: true,
      data: { code, name: "", fields: [], primaryKey: "" },
    };
  }
  async getBpmDatasetRecords(
    code: string,
    params?: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
      select?: string | string[];
    } & Record<string, any>,
  ): Promise<PaginatedApiResponse<DatasetRecord>> {
    return {
      success: true,
      data: {
        items: [],
        total: 0,
        page: params?.page ?? 1,
        limit: params?.limit ?? 10,
        totalPages: 0,
      },
    };
  }
  async testExternalApi(_apiConfig: {
    url: string;
    method: "GET" | "POST" | "PUT";
    headers?: Record<string, string>;
    body?: string;
  }): Promise<ApiResponse<unknown>> {
    return {
      success: true,
      data: [
        {
          id: 1,
          name: "Leanne Graham",
          email: "leanne@example.com",
        },
        {
          id: 2,
          name: "Ervin Howell",
          email: "ervin@example.com",
        },
      ],
    };
  }

  async callExternalApiProxy(_config: {
    url: string;
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    params?: Record<string, string>;
    headers?: Record<string, string>;
    body?: unknown;
  }): Promise<unknown> {
    return null;
  }

  async importDatasetCsv(
    _code: string,
    _file: File,
  ): Promise<ApiResponse<{ inserted: number }>> {
    await this.delay(500);
    return { success: true, data: { inserted: 0 } };
  }

  async exportDatasetCsv(_code: string): Promise<Blob> {
    await this.delay(500);
    return new Blob(["mock,csv,data"], { type: "text/csv" });
  }

  // Application Management
  async createApplication(
    payload: Omit<Application, "submittedAt" | "id" | "serialNumber">,
  ): Promise<ApiResponse<Application>> {
    await this.delay(500);
    const newApplication: Application = {
      ...payload,
      id: `app_${Date.now()}`,
      serialNumber: `APP-${Date.now()}`,
      submittedAt: new Date().toISOString(),
    };

    this.applications.push(newApplication);
    console.log(
      `[MockDomainService] After create, application count is: ${this.applications.length}`,
    );

    return {
      success: true,
      data: newApplication,
    };
  }

  async getApplication(id: string): Promise<ApiResponse<Application>> {
    await this.delay(100);
    const application = this.applications.find((app) => app.id === id);
    return {
      success: !!application,
      data: application,
      error: application ? undefined : "Application not found",
    };
  }

  async getApplications(
    options?: ApplicationOptions,
  ): Promise<PaginatedApiResponse<Application>> {
    await this.delay(100);
    let filteredApplications = [...this.applications];

    // --- Filtering ---
    if (options?.filter?.overallStatus) {
      filteredApplications = filteredApplications.filter(
        (app) => app.overallStatus === options.filter?.overallStatus,
      );
    }
    if (options?.filter?.reviewStatus) {
      filteredApplications = filteredApplications.filter(
        (app) => app.reviewStatus === options.filter?.reviewStatus,
      );
    }
    if (options?.filter?.serialNumber) {
      const keyword = options.filter.serialNumber.toLowerCase();
      filteredApplications = filteredApplications.filter((app) =>
        app.serialNumber.toLowerCase().includes(keyword),
      );
    }
    if (options?.filter?.applicantId !== undefined) {
      const applicantId = String(options.filter.applicantId);
      filteredApplications = filteredApplications.filter(
        (app) => app.submittedBy === applicantId,
      );
    }
    if (options?.filter?.formName) {
      filteredApplications = filteredApplications.filter((app) =>
        app.formInstance.form.name
          .toLowerCase()
          .includes(options.filter!.formName!.toLowerCase()),
      );
    }
    const sortDirection =
      options?.sorter?.submittedAt ?? options?.sorter?.sortOrder ?? "desc";

    filteredApplications.sort((a, b) => {
      const aIsInProgress =
        a.overallStatus === OverallStatus.InProgress ||
        a.reviewStatus === ReviewStatus.Pending;
      const bIsInProgress =
        b.overallStatus === OverallStatus.InProgress ||
        b.reviewStatus === ReviewStatus.Pending;

      if (aIsInProgress && !bIsInProgress) {
        return -1;
      }
      if (!aIsInProgress && bIsInProgress) {
        return 1;
      }

      const dateA = new Date(a.submittedAt).getTime();
      const dateB = new Date(b.submittedAt).getTime();
      return sortDirection === "desc" ? dateB - dateA : dateA - dateB;
    });

    // --- Pagination ---
    const pageSize = options?.pageSize ?? filteredApplications.length;
    const totalItems = filteredApplications.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const page = options?.page ?? 1;
    const startIndex = (page - 1) * pageSize;
    const paginatedItems = filteredApplications.slice(
      startIndex,
      startIndex + pageSize,
    );

    return {
      success: true,
      data: {
        items: paginatedItems,
        total: totalItems,
        page,
        limit: pageSize, // Correctly use 'limit' in the response
        totalPages,
      },
    };
  }

  async getApplicationForms(
    options: ApplicationFormOptions = {},
  ): Promise<PaginatedApiResponse<ApplicationForm>> {
    const forms = this.applications.map(
      (a, index) =>
        ({
          bindingId: String(index + 1),
          form: {
            id: a.formInstance.form.id,
            name: a.formInstance.form.name,
            revisionId: a.formInstance.form.revisionId,
            description: a.formInstance.form.description,
          },
          workflow: {
            id: a.workflowInstance.workflow.id,
            revisionId: a.workflowInstance.workflow.revisionId,
            name: a.workflowInstance.workflow.name,
            description: a.workflowInstance.workflow.description,
          },
        }) satisfies ApplicationForm,
    );

    const formNameQuery = options.filter?.formName?.toLowerCase().trim();
    const workflowNameQuery = options.filter?.workflowName
      ?.toLowerCase()
      .trim();
    const sortOrder = options.sorter?.sortOrder ?? "desc";

    let filteredForms = forms;

    if (formNameQuery) {
      filteredForms = filteredForms.filter((item) =>
        item.form.name.toLowerCase().includes(formNameQuery),
      );
    }

    if (workflowNameQuery) {
      filteredForms = filteredForms.filter((item) =>
        item.workflow.name.toLowerCase().includes(workflowNameQuery),
      );
    }

    const sortedForms = [...filteredForms].sort((a, b) => {
      const aId = Number(a.bindingId);
      const bId = Number(b.bindingId);
      if (Number.isNaN(aId) || Number.isNaN(bId)) {
        return sortOrder === "asc"
          ? a.form.name.localeCompare(b.form.name)
          : b.form.name.localeCompare(a.form.name);
      }
      return sortOrder === "asc" ? aId - bId : bId - aId;
    });

    const page = options.page ?? 1;
    const limit = options.pageSize ?? sortedForms.length ?? 10;
    const total = sortedForms.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const startIndex = (page - 1) * limit;
    const items = sortedForms.slice(startIndex, startIndex + limit);

    return {
      success: true,
      data: {
        items,
        total,
        page,
        limit,
        totalPages,
      },
    };
  }
  async getApplicationForm(bindingId: string) {
    return {
      success: true,
      data: this.forms[0],
    };
  }

  async discardApplication(id: string): Promise<ApiResponse<void>> {
    await this.delay(300);
    const appIndex = this.applications.findIndex((app) => app.id === id);

    if (appIndex === -1) {
      return {
        success: false,
        error: "Application not found",
      };
    }

    this.applications[appIndex].overallStatus = OverallStatus.Canceled;

    return {
      success: true,
    };
  }

  async approveApplication(
    id: string,
    comment?: string,
  ): Promise<ApiResponse<Application>> {
    await this.delay(300);
    const appIndex = this.applications.findIndex((app) => app.id === id);

    if (appIndex === -1) {
      return {
        success: false,
        error: "Application not found",
      };
    }

    this.applications[appIndex].reviewStatus = ReviewStatus.Approved;
    this.applications[appIndex].overallStatus = OverallStatus.CompletedApproved;
    // this.applications[appIndex].overallStatus = ApplicationStatus.InProgress;
    this.applications[appIndex].comment = comment;

    return {
      success: true,
      data: this.applications[appIndex],
    };
  }

  async rejectApplication(
    id: string,
    comment?: string,
  ): Promise<ApiResponse<Application>> {
    await this.delay(300);
    const appIndex = this.applications.findIndex((app) => app.id === id);

    if (appIndex === -1) {
      return {
        success: false,
        error: "Application not found",
      };
    }

    this.applications[appIndex].reviewStatus = ReviewStatus.Rejected;
    this.applications[appIndex].overallStatus = OverallStatus.CompletedRejected;

    this.applications[appIndex].comment = comment;

    return {
      success: true,
      data: this.applications[appIndex],
    };
  }

  async updateApplication(
    id: string,
    payload: any,
  ): Promise<ApiResponse<Application>> {
    await this.delay(300);
    const appIndex = this.applications.findIndex((app) => app.id === id);

    if (appIndex === -1) {
      return {
        success: false,
        error: "Application not found",
      };
    }

    this.applications[appIndex] = {
      ...this.applications[appIndex],
      ...payload,
    };

    return {
      success: true,
      data: this.applications[appIndex],
    };
  }

  async getApplicationProgress(
    applicationId: string,
  ): Promise<
    ApiResponse<{ progress: Progress; overallStatus: OverallStatus }>
  > {
    await this.delay(100);
    const application = this.applications.find(
      (app) => app.id === applicationId,
    );

    // console.debug(application?.formInstance.form.id, this.forms[0].id);
    if (application?.formInstance.form.id !== this.forms[0].id) {
      switch (application?.overallStatus) {
        case OverallStatus.CompletedApproved:
          return {
            success: true,
            data: {
              progress: APPROVED_EXPENSE_PROGRESS,
              overallStatus: OverallStatus.CompletedApproved,
            },
          };
        case OverallStatus.CompletedRejected:
          return {
            success: true,
            data: {
              progress: REJECTED_EXPENSE_PROGRESS,
              overallStatus: OverallStatus.CompletedRejected,
            },
          };
        case OverallStatus.InProgress:
          return {
            success: true,
            data: {
              progress: EXPENSE_PROGRESS,
              overallStatus: OverallStatus.InProgress,
            },
          };
        default:
          return {
            success: true,
            data: undefined,
          };
      }
    }
    return {
      success: true,
      data: {
        progress: PENDING_EXPENSE_PROGRESS,
        overallStatus: OverallStatus.InProgress,
      },
    };
  }

  async getComments(serialNumber: string): Promise<ApiResponse<Comment[]>> {
    return {
      success: true,
      data: [],
    };
  }

  // User Management
  async createUser(): Promise<any> {
    return { success: true, data: {} };
  }
  async getUserById(): Promise<any> {
    return { success: true, data: {} };
  }
  async updateUser(): Promise<any> {
    return { success: true, data: {} };
  }
  async deleteUser(): Promise<any> {
    return { success: true };
  }
  async getUserMemberships(): Promise<any> {
    return { success: true, data: [] };
  }
  async createOrgMembership(): Promise<any> {
    return { success: true, data: {} };
  }
  async updateOrgMembership(): Promise<any> {
    return { success: true, data: {} };
  }
  async deleteOrgMembership(): Promise<any> {
    return { success: true };
  }

  // Utility
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
