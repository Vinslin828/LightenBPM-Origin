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
  ExportPayload,
  ImportCheckResponse,
} from "@/types/domain";
import {
  Validator,
  ValidatorListOptions,
  ValidatorType,
} from "@/types/validator";
import {
  CreateValidatorDto,
  UpdateValidatorDto,
} from "@/types/validation-registry";
import {
  DatasetDefinition,
  CreateDatasetDto,
  UpdateDatasetSchemaDto,
  DatasetRecord,
  ExternalApiRequestConfig,
  ExternalApiFieldMappingsDto,
} from "@/types/master-data-dataset";
import {
  ApplicationShare,
  ApplicationShareDeleteQuery,
  ApplicationShareInput,
  Permission,
  PermissionAction,
  PermissionScope,
} from "@/types/permission";
import {
  mockApplications,
  mockTags,
  mockForms,
  mockFlows,
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
import apiCaller from "@/utils/api-caller";
import {
  formListSchema,
  formRevisionSchema,
  formSchema,
  resolvedFormSchema,
} from "@/schemas/form/response";
import {
  tFormListSchema,
  tFormRevisionSchema,
  tFormSchema,
  tResolvedFormSchema,
  tResolvedToFormDefinition,
} from "@/schemas/form/transform";
import {
  CreateFormRequest,
  PatchFormRequest,
  UpdateFormRequest,
} from "@/schemas/form/request";
import qs from "qs";
import z from "zod";
import { parseFormSchema } from "@/utils/parser";
import { isAxiosError } from "axios";

import { FormStatus } from "@/types/form-builder";
import {
  bindFormSchema,
  workflowListSchema,
  workflowSchema,
} from "@/schemas/workflow/response";
import {
  parseFlow,
  tBindFormSchema,
  tWorkflowList,
  tWorkflowSchema,
} from "@/schemas/workflow/transform";
import {
  orgUnitSchema,
  tagSchema,
  userSchema,
} from "@/schemas/master-data/response";
import { tOrgUnit, tTag, tUser } from "@/schemas/master-data/transform";
import { OrgMembershipListSchema } from "@/schemas/user/response";
import {
  tOrgMembershipList,
  parseCreateMembership,
  parseUpdateMembership,
} from "@/schemas/user/transform";
import {
  applicationApprovalSchema,
  applicationFormListSchema,
  applicationListSchema,
  applicationSchema,
  bindingSchema,
  commentSchema,
} from "@/schemas/application/response";
import {
  tApplicationApprovalSchema,
  tApplicationFormListShcema,
  tApplicationListItemSchema,
  tApplicationSchema,
  tCommentSchema,
  tOverallStatus,
} from "@/schemas/application/transform";
import { transformPaginatedResponse } from "@/schemas/shared";
import { tApplicationProgress } from "@/schemas/application/routing-transform";
import {
  tValidator,
  tValidatorList,
  validatorResponseSchema,
} from "@/schemas/validator/response";
import {
  ValidateFieldsRequest,
  ValidateFieldsResponse,
  validateFieldsRequestSchema,
  validateFieldsResponseSchema,
} from "@/schemas/validator/validate-fields";
import {
  formPermissionsSchema,
  workflowPermissionsSchema,
  BackendFormPermissionDeleteQuery,
  BackendFormPermissionInput,
  BackendWorkflowPermissionDeleteQuery,
  BackendWorkflowPermissionInput,
} from "@/schemas/permission/response";
import {
  tFormPermissions,
  tWorkflowPermissions,
} from "@/schemas/permission/transform";

const toBackendPermissionAction = (
  action: PermissionAction,
): "VIEW" | "USE" | "MANAGE" => {
  if (action === PermissionAction.VIEW) return "VIEW";
  if (action === PermissionAction.USE) return "USE";
  return "MANAGE";
};

const toBackendPermissionGranteeType = (
  granteeType: Permission["permissions"]["user"][number]["granteeType"],
): BackendWorkflowPermissionInput["grantee_type"] =>
  granteeType === "ORG" ? "ORG_UNIT" : granteeType;

const permissionActionOrder: PermissionAction[] = [
  PermissionAction.VIEW,
  PermissionAction.USE,
  PermissionAction.MANAGE,
];

const toBackendPermissionInputs = (
  permission: Permission,
): BackendWorkflowPermissionInput[] => {
  return [
    ...permission.permissions.user,
    ...permission.permissions.role,
    ...permission.permissions.org,
  ].flatMap((entry) => {
    const uniqueActions = Array.from(new Set(entry.actions)).sort(
      (a, b) =>
        permissionActionOrder.indexOf(a) - permissionActionOrder.indexOf(b),
    );

    return uniqueActions.map((action) => ({
      grantee_type: toBackendPermissionGranteeType(entry.granteeType),
      grantee_value: entry.value,
      action: toBackendPermissionAction(action),
    }));
  });
};

@injectable()
export class DomainService implements IDomainService {
  private forms: FormDefinition[] = [];
  private workflows: FlowDefinition[] = [];
  private workflowInstances: FlowInstance[] = [];
  private tags: Tag[] = [];
  private applications: Application[] = [];

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData() {
    this.tags = mockTags;
    this.forms = mockForms;
    this.workflows = mockFlows;
    this.applications = mockApplications;
    console.log(
      `[MockDomainService] Initialized with ${this.applications.length} applications.`,
    );
  }

  async getMe(): Promise<ApiResponse<User>> {
    const result = await apiCaller.get("/users/me");
    const parsedResult = userSchema.transform(tUser).parse(result.data);
    return {
      success: true,
      data: parsedResult,
    };
  }

  //--- Form Management
  async getForms(
    options?: FormListOptions,
  ): Promise<PaginatedApiResponse<FormDefinition>> {
    try {
      const page = options?.page ?? 1;
      const limit = options?.limit ?? 10;
      const sortOrder = options?.sorter?.createdAt ?? "desc";
      const normalizedName = options?.filter?.name?.trim();

      const normalizeTagIds = (tagIds?: number[]) => {
        if (!tagIds?.length) return undefined;
        const normalized = tagIds
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id));
        return normalized.length ? normalized : undefined;
      };

      const params = {
        page,
        limit,
        name: normalizedName || undefined,
        tagIds: normalizeTagIds(options?.filter?.tagIds),
        sortOrder,
      };

      const queryString = qs.stringify(params, {
        arrayFormat: "repeat",
        skipNulls: true,
      });

      const url = queryString ? `/form/list?${queryString}` : `/form/list`;
      const result = await apiCaller.get(url);
      const parsedResult = formListSchema
        .transform(tFormListSchema)
        .parse(result.data);

      return {
        success: true,
        data: parsedResult,
      };
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async getForm(formId: string): Promise<ApiResponse<FormDefinition>> {
    const result = await apiCaller.get(`/form/${formId}`);
    const form = formSchema.transform(tFormSchema).parse(result.data);
    return {
      success: !!form,
      data: form,
      error: form ? undefined : "Form not found",
    };
  }

  async getResolvedForm(
    formId: string,
  ): Promise<ApiResponse<ResolvedFormDefinition>> {
    const result = await apiCaller.get(`/form/${formId}/resolved`);
    const form = resolvedFormSchema
      .transform(tResolvedFormSchema)
      .parse(result.data);
    return {
      success: !!form,
      data: form,
      error: form ? undefined : "Form not found",
    };
  }

  async createForm(
    form: Omit<FormDefinition, "revisionId" | "id" | "createdAt" | "updatedAt">,
  ): Promise<ApiResponse<FormDefinition>> {
    // create
    const createPayload = {
      name: form.name,
      description: form.description,
      is_template: false,
      tags: form.tags.map((tag) => Number(tag.id)),
      validation: form.validation,
    } satisfies CreateFormRequest;
    const createResult = await apiCaller.post("/form", createPayload);
    const parsedCreateResult = formSchema
      .omit({ id: true })
      .extend({ form_id: z.string() })
      .parse(createResult.data);

    const patchPayload = {
      name: form.name,
      description: form.description,
      form_schema: parseFormSchema(form.schema),
      status: "ACTIVE",
      options: {
        can_withdraw: true,
        can_copy: true,
        can_draft: true,
        can_delegate: true,
      },
    } satisfies PatchFormRequest;
    // patch
    const patchResult = await apiCaller.patch(
      `/form/revisions/${parsedCreateResult.revision.revision_id}`,
      patchPayload,
    );
    const parsedPatchResult = formRevisionSchema
      .transform(tFormRevisionSchema)
      .parse(patchResult.data);

    return {
      success: true,
      data: parsedPatchResult,
    };
  }

  async updateForm(form: FormDefinition): Promise<ApiResponse<FormDefinition>> {
    const data = {
      name: form.name,
      form_schema: parseFormSchema(form.schema),
      description: form.description,
      status: "ACTIVE",
      tags: form.tags.map((tag) => Number(tag.id)),
      validation: form.validation,
    } satisfies UpdateFormRequest;

    const result = await apiCaller.post(`/form/${form.id}/revisions`, data);

    return {
      success: true,
      data: form,
    };
  }

  async deleteForm(id: string): Promise<ApiResponse<void>> {
    const params = {
      tags: [],
      is_active: false,
    };
    const result = await apiCaller.put(`/form/${id}`, params);
    return {
      success: true,
      data: result.data,
    };
  }

  async exportForm(id: string): Promise<ApiResponse<ExportPayload>> {
    const result = await apiCaller.get(`/form/${id}/export`);
    return {
      success: true,
      data: result.data,
    };
  }

  async importCheck(
    payload: ExportPayload,
  ): Promise<ApiResponse<ImportCheckResponse>> {
    const result = await apiCaller.post("/import/check", payload);
    return {
      success: true,
      data: result.data,
    };
  }

  async importExecute(
    checkResult: ImportCheckResponse,
  ): Promise<ApiResponse<{ id: string }>> {
    const result = await apiCaller.post("/import/execute", checkResult);
    return {
      success: true,
      data: result.data,
    };
  }

  //--- Workflow Management
  async getWorkflows(
    options?: WorkflowListOptions,
  ): Promise<PaginatedApiResponse<FlowDefinition>> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 10;
    const sortOrder = options?.sorter?.createdAt ?? "desc";
    const normalizedName = options?.filter?.name?.trim();

    const normalizeTagIds = (tagIds?: number[]) => {
      if (!tagIds?.length) return undefined;
      const normalized = tagIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id));
      return normalized.length ? normalized : undefined;
    };

    const params = {
      page,
      limit,
      name: normalizedName || undefined,
      tagIds: normalizeTagIds(options?.filter?.tagIds),
      sortOrder,
    };

    const queryString = qs.stringify(params, {
      arrayFormat: "repeat",
      skipNulls: true,
    });

    const url = queryString
      ? `/workflow/list?${queryString}`
      : `/workflow/list`;
    const result = await apiCaller.get(url);
    const parsedResult = workflowListSchema
      .transform(tWorkflowList)
      .parse(result.data);

    this.workflows = parsedResult.items;

    return {
      success: true,
      data: parsedResult,
    };
  }

  async getWorkflow(id: string): Promise<ApiResponse<FlowDefinition>> {
    // const result = await apiCaller.get(`/workflow/revisions/${id}`);
    // const parsedResult = workflowRevisionSchema
    //   .transform(tWorkflowRevisionSchema)
    //   .parse(result.data);
    const result = await apiCaller.get(`/workflow/${id}`);
    const parsedResult = workflowSchema
      .omit({ workflow_id: true })
      .extend({ id: z.string() })
      .transform((data) => tWorkflowSchema({ ...data, workflow_id: data.id }))
      .parse(result.data);

    // console.debug({ parsedResult });
    return {
      success: !!parsedResult,
      data: parsedResult,
      error: parsedResult ? undefined : "Workflow not found",
    };
  }

  async createWorkflow(
    workflow: Omit<FlowDefinition, "id" | "created_at" | "updated_at">,
  ): Promise<ApiResponse<FlowDefinition>> {
    const params = {
      name: workflow.name,
      description: workflow.description,
      tags: workflow.tags.map((tag) => Number(tag.id)),
    };
    const createResult = await apiCaller.post("/workflow", params);
    const parsedCreateResult = workflowSchema
      .transform(tWorkflowSchema)
      .parse(createResult.data);

    return {
      success: true,
      data: parsedCreateResult,
    };
  }

  async updateWorkflow(
    id: string,
    workflow: Partial<FlowDefinition>,
  ): Promise<ApiResponse<FlowDefinition>> {
    console.debug({ workflow });
    if (workflow.publishStatus === FormStatus.Draft) {
      console.debug("patch revision");
      const patchParams = {
        status: "ACTIVE",
        flow_definition: {
          version: workflow.version,
          nodes: parseFlow(workflow.nodes ?? [], workflow.edges ?? []).nodes,
        },
        tags: workflow.tags?.map((tag) => Number(tag.id)) || [],
      };

      const patchResult = await apiCaller.patch(
        `/workflow/revisions/${workflow.revisionId}`,
        patchParams,
      );
      return {
        success: true,
        data: patchResult.data,
      };
    } else {
      console.debug("create revision");
      const params = {
        name: workflow.name,
        description: workflow.description,
        status:
          workflow.publishStatus === FormStatus.Published ? "ACTIVE" : "DRAFT",
        flow_definition: parseFlow(workflow.nodes ?? [], workflow.edges ?? []),
        tags: workflow.tags?.map((tag) => Number(tag.id)) || [],
      };
      const result = await apiCaller.post(
        `/workflow/${workflow.id}/revisions`,
        params,
      );
      return {
        success: true,
        data: result.data,
      };
    }
  }

  async updateWorkflowSerialPrefix(
    id: string,
    serialPrefix: string,
  ): Promise<ApiResponse<FlowDefinition>> {
    const result = await apiCaller.put(`/workflow/${id}`, {
      serial_prefix: serialPrefix,
    });
    const parsedResult = workflowSchema
      .omit({ workflow_id: true })
      .extend({ id: z.string() })
      .transform((data) => tWorkflowSchema({ ...data, workflow_id: data.id }))
      .parse(result.data);

    return {
      success: true,
      data: parsedResult,
    };
  }

  async bindFormToWorkflow(
    formId: string,
    workflowId: string,
  ): Promise<ApiResponse<FormDefinition>> {
    const params = {
      form_id: formId,
      workflow_id: workflowId,
    };
    console.debug("binding");
    const result = await apiCaller.post("/bindings", params);
    const parsedResult = bindFormSchema
      .transform(tBindFormSchema)
      .parse(result.data);
    return {
      success: true,
      data: parsedResult,
    };
  }

  async deleteWorkflow(id: string): Promise<ApiResponse<void>> {
    const params = {
      tags: [],
      is_active: false,
    };
    const result = apiCaller.put(`/workflow/${id}`, params);
    return {
      success: true,
      data: (await result).data,
    };
  }

  async exportWorkflow(id: string): Promise<ApiResponse<ExportPayload>> {
    const result = await apiCaller.get(`/workflow/${id}/export`);
    return {
      success: true,
      data: result.data,
    };
  }

  async importWorkflowCheck(
    payload: ExportPayload,
  ): Promise<ApiResponse<ImportCheckResponse>> {
    const result = await apiCaller.post("/import/check", payload);
    return {
      success: true,
      data: result.data,
    };
  }

  async importWorkflowExecute(
    checkResult: ImportCheckResponse,
  ): Promise<ApiResponse<{ public_id: string }>> {
    const result = await apiCaller.post("/import/execute", checkResult);
    return {
      success: true,
      data: result.data,
    };
  }

  //--- Workflow Permissions
  async getWorkflowPermissions(
    workflowId: string,
  ): Promise<ApiResponse<Permission>> {
    const result = await apiCaller.get(`/workflow/${workflowId}/permissions`);
    const parsedResult = workflowPermissionsSchema
      .transform(tWorkflowPermissions)
      .parse(result.data);
    return {
      success: true,
      data: parsedResult,
    };
  }

  async addWorkflowPermissions(
    workflowId: string,
    permission: Permission,
  ): Promise<ApiResponse<Permission>> {
    const params = toBackendPermissionInputs(permission);
    const result = await apiCaller.post(
      `/workflow/${workflowId}/permissions`,
      params,
    );
    const parsedResult = workflowPermissionsSchema
      .transform(tWorkflowPermissions)
      .parse(result.data);
    return {
      success: true,
      data: parsedResult,
    };
  }

  async updateWorkflowPermissions(
    workflowId: string,
    permission: Permission,
  ): Promise<ApiResponse<Permission>> {
    const everyonePermissions: BackendWorkflowPermissionInput[] = [
      {
        grantee_type: "EVERYONE",
        grantee_value: "",
        action: "VIEW",
      },
      {
        grantee_type: "EVERYONE",
        grantee_value: "",
        action: "USE",
      },
    ];
    const params = toBackendPermissionInputs(permission);
    const result = await apiCaller.put(
      `/workflow/${workflowId}/permissions`,
      permission.scope === PermissionScope.EVERYONE
        ? everyonePermissions
        : params,
    );
    const parsedResult = workflowPermissionsSchema
      .transform(tWorkflowPermissions)
      .parse(result.data);
    return {
      success: true,
      data: parsedResult,
    };
  }

  async deleteWorkflowPermissions(
    workflowId: string,
    query?: BackendWorkflowPermissionDeleteQuery,
  ): Promise<ApiResponse<void>> {
    const queryString = qs.stringify(query ?? {}, { skipNulls: true });
    const url = queryString
      ? `/workflow/${workflowId}/permissions?${queryString}`
      : `/workflow/${workflowId}/permissions`;
    await apiCaller.delete(url);
    return { success: true };
  }

  async deleteWorkflowPermission(id: number): Promise<ApiResponse<void>> {
    await apiCaller.delete(`/workflow/permissions/${id}`);
    return { success: true };
  }

  //--- Form Permissions
  async getFormPermissions(formId: string): Promise<ApiResponse<Permission>> {
    const result = await apiCaller.get(`/form/${formId}/permissions`);
    const parsedResult = formPermissionsSchema
      .transform(tFormPermissions)
      .parse(result.data);
    return {
      success: true,
      data: parsedResult,
    };
  }

  async addFormPermissions(
    formId: string,
    permission: Permission,
  ): Promise<ApiResponse<Permission>> {
    const params: BackendFormPermissionInput[] =
      toBackendPermissionInputs(permission);
    const result = await apiCaller.post(`/form/${formId}/permissions`, params);
    const parsedResult = formPermissionsSchema
      .transform(tFormPermissions)
      .parse(result.data);
    return {
      success: true,
      data: parsedResult,
    };
  }

  async updateFormPermissions(
    formId: string,
    permission: Permission,
  ): Promise<ApiResponse<Permission>> {
    const params: BackendFormPermissionInput[] =
      toBackendPermissionInputs(permission);
    const result = await apiCaller.put(`/form/${formId}/permissions`, params);
    const parsedResult = formPermissionsSchema
      .transform(tFormPermissions)
      .parse(result.data);
    return {
      success: true,
      data: parsedResult,
    };
  }

  async deleteFormPermissions(
    formId: string,
    query?: BackendFormPermissionDeleteQuery,
  ): Promise<ApiResponse<void>> {
    const queryString = qs.stringify(query ?? {}, { skipNulls: true });
    const url = queryString
      ? `/form/${formId}/permissions?${queryString}`
      : `/form/${formId}/permissions`;
    await apiCaller.delete(url);
    return { success: true };
  }

  async deleteFormPermission(id: number): Promise<ApiResponse<void>> {
    await apiCaller.delete(`/form/permissions/${id}`);
    return { success: true };
  }

  //--- Application Shares
  async getApplicationShares(
    serialNumber: string,
  ): Promise<ApiResponse<ApplicationShare[]>> {
    const result = await apiCaller.get(`/applications/${serialNumber}/shares`);
    return {
      success: true,
      data: result.data,
    };
  }

  async addApplicationShares(
    serialNumber: string,
    shares: ApplicationShareInput[],
  ): Promise<ApiResponse<ApplicationShare[]>> {
    const result = await apiCaller.post(
      `/applications/${serialNumber}/shares`,
      shares,
    );
    return {
      success: true,
      data: result.data,
    };
  }

  async updateApplicationShares(
    serialNumber: string,
    shares: ApplicationShareInput[],
  ): Promise<ApiResponse<ApplicationShare[]>> {
    const result = await apiCaller.put(
      `/applications/${serialNumber}/shares`,
      shares,
    );
    return {
      success: true,
      data: result.data,
    };
  }

  async deleteApplicationShares(
    serialNumber: string,
    query: ApplicationShareDeleteQuery,
  ): Promise<ApiResponse<void>> {
    const queryString = qs.stringify(query ?? {}, { skipNulls: true });
    const url = queryString
      ? `/applications/${serialNumber}/shares?${queryString}`
      : `/applications/${serialNumber}/shares`;
    await apiCaller.delete(url);
    return { success: true };
  }

  async deleteApplicationShare(id: number): Promise<ApiResponse<void>> {
    await apiCaller.delete(`/applications/shares/${id}`);
    return { success: true };
  }

  //--- Master Data
  async getTags(): Promise<ApiResponse<Tag[]>> {
    const result = await apiCaller.get("/tags");
    const tags = z.array(tagSchema.transform(tTag)).parse(result.data);
    this.tags = tags;
    return {
      success: true,
      data: [...this.tags],
    };
  }

  async getUsers(params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedApiResponse<User>> {
    const normalizedSearch = params?.search?.trim();
    const queryParams = {
      search: normalizedSearch || undefined,
      page: params?.page,
      limit: params?.limit,
    };
    const queryString = qs.stringify(queryParams, { skipNulls: true });
    const url = queryString ? `/users?${queryString}` : "/users";
    const result = await apiCaller.get(url);
    const data = result.data;
    const items = z
      .array(userSchema.transform(tUser))
      .parse(data.items ?? data);
    return {
      success: true,
      data: {
        items,
        total: data.total ?? (Array.isArray(data) ? data.length : items.length),
        page: data.page ?? params?.page ?? 1,
        limit: data.limit ?? params?.limit ?? 50,
        totalPages: data.totalPages ?? 1,
      },
    };
  }

  async getOrgUnits(name?: string): Promise<ApiResponse<Unit[]>> {
    const normalizedName = name?.trim();
    const queryString = qs.stringify(
      {
        filter: "ORG_UNIT",
        name: normalizedName || undefined,
      },
      { skipNulls: true },
    );
    const url = queryString ? `/org-units?${queryString}` : "/org-units";
    const result = await apiCaller.get(url);
    const parsedResult = z.array(orgUnitSchema).parse(result.data);
    const filteredResult = parsedResult.map(tOrgUnit);
    return {
      success: true,
      data: filteredResult,
    };
  }
  async getOrgUnitById(id: string): Promise<ApiResponse<Unit>> {
    const result = await apiCaller.get(`/org-units/${id}`);
    const parsedResult = orgUnitSchema.parse(result.data);

    // Log raw API response before transformation
    // console.log("[getOrgUnitById] RAW API Response:", {
    //   orgId: id,
    //   responseOrgId: parsedResult.id,
    //   responseOrgName: parsedResult.name,
    //   responseMembersCount: parsedResult.members?.length || 0,
    //   responseMembers:
    //     parsedResult.members?.map((m) => ({
    //       id: m.id,
    //       idType: typeof m.id,
    //       name: m.name,
    //     })) || [],
    // });

    const transformed = tOrgUnit(parsedResult);

    // Log after transformation
    // console.log("[getOrgUnitById] AFTER Transform:", {
    //   orgId: transformed.id,
    //   orgName: transformed.name,
    //   membersCount: transformed.members?.length || 0,
    //   members:
    //     transformed.members?.map((m) => ({
    //       id: m.id,
    //       idType: typeof m.id,
    //       name: m.name,
    //     })) || [],
    // });

    return {
      success: true,
      data: transformed,
    };
  }
  async getOrgUnitMembers(orgUnitId: string): Promise<ApiResponse<User[]>> {
    const result = await apiCaller.get(`/org-units/${orgUnitId}/users`);

    const items = Array.isArray(result.data) ? result.data : [];

    const toUser = (raw: any): User | null => {
      if (!raw) return null;

      const parsed = userSchema.safeParse(raw);
      if (parsed.success) {
        return tUser(parsed.data);
      }

      const fallbackId = raw.id ?? raw.userId;
      if (fallbackId === undefined || fallbackId === null) {
        return null;
      }

      return {
        id: String(fallbackId),
        code: raw.code ?? "",
        name: raw.name ?? raw.userName ?? "",
        email: raw.email ?? raw.userEmail ?? "",
        jobGrade: raw.jobGrade ?? 0,
        tags: [],
        roles: [],
        defaultOrgId: raw.defaultOrgId ? String(raw.defaultOrgId) : "",
        defaultOrgCode: raw.defaultOrgCode ? String(raw.defaultOrgCode) : "",
        isAdmin: Boolean(raw.isAdmin),
      };
    };

    const members = items
      .map((item) => toUser(item?.user ?? item))
      .filter((user): user is User => Boolean(user));

    return {
      success: true,
      data: members,
    };
  }
  async getOrgUnitByCode(code: string): Promise<ApiResponse<Unit>> {
    const result = await apiCaller.get(`/org-units/code/${code}`);
    const parsedResult = orgUnitSchema.parse(result.data);
    return {
      success: true,
      data: tOrgUnit(parsedResult),
    };
  }
  async getOrgRoles(name?: string): Promise<ApiResponse<Role[]>> {
    const normalizedName = name?.trim();
    const queryString = qs.stringify(
      {
        filter: "ROLE",
        name: normalizedName || undefined,
      },
      { skipNulls: true },
    );
    const url = queryString ? `/org-units?${queryString}` : "/org-units";
    const result = await apiCaller.get(url);
    const parsedResult = z.array(orgUnitSchema).parse(result.data);
    const filteredResult = parsedResult.map(tOrgUnit);
    return {
      success: true,
      data: filteredResult,
    };
  }
  async getOrgUnitHeads(orgUnitId?: string): Promise<ApiResponse<User[]>> {
    // This method is deprecated in favor of getOrgUnitHeadsByOrgId
    // Keeping for backward compatibility
    throw Error("unimplemented error - use getOrgUnitHeadsByOrgId instead");
  }

  /**
   * Get all heads for a specific organization unit
   * Returns heads with effective date information
   */
  async getOrgUnitHeadsByOrgId(
    orgUnitId: string,
  ): Promise<ApiResponse<import("@/types/organization").OrgHead[]>> {
    const result = await apiCaller.get(`/org-units/${orgUnitId}/heads`);
    const { orgHeadListSchema } = await import(
      "@/schemas/organization/head-response"
    );
    const { tOrgHeadList } = await import(
      "@/schemas/organization/head-transform"
    );
    const payload = Array.isArray(result.data)
      ? result.data
      : Array.isArray((result.data as any)?.data)
        ? (result.data as any).data
        : result.data
          ? [result.data]
          : [];

    const parsedResult = orgHeadListSchema.parse(payload);
    const transformedHeads = tOrgHeadList(parsedResult);
    return {
      success: true,
      data: transformedHeads,
    };
  }

  /**
   * Get all organization heads across all units
   * Returns a map of orgUnitId -> active head
   */
  async getAllOrgHeads(): Promise<ApiResponse<Record<string, User | null>>> {
    const headsMap: Record<string, User | null> = {};

    // Step 1: Try bulk memberships endpoint
    try {
      const result = await apiCaller.get("/org-units/memberships");
      const now = new Date();

      const toDateValue = (value?: string | null) => {
        if (!value) return null;
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return null;
        return date;
      };

      const toUser = (raw: any): User | null => {
        if (!raw) return null;
        const parsed = userSchema.safeParse(raw);
        if (parsed.success) {
          return tUser(parsed.data);
        }

        const fallbackId = raw.id ?? raw.userId;
        if (fallbackId === undefined || fallbackId === null) {
          return null;
        }

        return {
          id: String(fallbackId),
          code: raw.code ?? "",
          name: raw.name ?? raw.userName ?? "",
          email: raw.email ?? raw.userEmail ?? "",
          jobGrade: raw.jobGrade ?? 0,
          tags: [],
          roles: [],
          defaultOrgId: raw.defaultOrgId ? String(raw.defaultOrgId) : "",
          defaultOrgCode: raw.defaultOrgCode ? String(raw.defaultOrgCode) : "",
          isAdmin: Boolean(raw.isAdmin),
        };
      };

      const memberships = Array.isArray(result.data)
        ? result.data
        : Array.isArray((result.data as any)?.data)
          ? (result.data as any).data
          : [];

      const missingUserIds = new Set<string>();
      const missingOrgCodes = new Set<string>();

      memberships.forEach((membership: any) => {
        const assignType =
          membership.assignType ??
          membership.assign_type ??
          membership.assignTYPE;
        if (String(assignType).toUpperCase() !== "HEAD") return;

        const startDate =
          toDateValue(membership.startDate ?? membership.start_date) ??
          toDateValue(membership.start_date);
        const endDate = toDateValue(membership.endDate ?? membership.end_date);

        const isActive =
          !!startDate && startDate <= now && (!endDate || endDate >= now);
        if (!isActive) return;

        const orgUnitId =
          membership.orgUnitId ??
          membership.org_unit_id ??
          membership.orgUnit?.id ??
          membership.org_unit?.id;

        const orgUnitCode =
          membership.orgUnitCode ??
          membership.org_unit_code ??
          membership.orgUnit?.code;

        if (!orgUnitId && orgUnitCode) {
          missingOrgCodes.add(String(orgUnitCode));
        }

        const user =
          toUser(membership.user) ??
          toUser(membership.userDto) ??
          toUser(membership.user_info) ??
          toUser(membership.userInfo);

        const userId =
          membership.userId ??
          membership.user_id ??
          membership.user?.id ??
          membership.userId;

        if (!user && userId !== undefined && userId !== null) {
          missingUserIds.add(String(userId));
        }

        if (orgUnitId && user) {
          headsMap[String(orgUnitId)] = user;
        }
      });

      if (missingUserIds.size > 0) {
        const usersResponse = await this.getUsers();
        const users = usersResponse.data?.items ?? [];
        const userMap = new Map(users.map((u) => [String(u.id), u]));

        memberships.forEach((membership: any) => {
          const assignType =
            membership.assignType ??
            membership.assign_type ??
            membership.assignTYPE;
          if (String(assignType).toUpperCase() !== "HEAD") return;

          const startDate = toDateValue(
            membership.startDate ?? membership.start_date,
          );
          const endDate = toDateValue(
            membership.endDate ?? membership.end_date,
          );
          const isActive =
            !!startDate && startDate <= now && (!endDate || endDate >= now);
          if (!isActive) return;

          const orgUnitId =
            membership.orgUnitId ??
            membership.org_unit_id ??
            membership.orgUnit?.id ??
            membership.org_unit?.id;

          if (!orgUnitId || headsMap[String(orgUnitId)]) return;

          const userId =
            membership.userId ??
            membership.user_id ??
            membership.user?.id ??
            membership.userId;

          if (!userId) return;

          const mappedUser = userMap.get(String(userId));
          if (mappedUser) {
            headsMap[String(orgUnitId)] = mappedUser;
          }
        });
      }

      if (missingOrgCodes.size > 0) {
        const unitsResponse = await this.getOrgUnits();
        const units = unitsResponse.data ?? [];
        const codeToId = new Map(units.map((unit) => [unit.code, unit.id]));

        memberships.forEach((membership: any) => {
          const assignType =
            membership.assignType ??
            membership.assign_type ??
            membership.assignTYPE;
          if (String(assignType).toUpperCase() !== "HEAD") return;

          const startDate = toDateValue(
            membership.startDate ?? membership.start_date,
          );
          const endDate = toDateValue(
            membership.endDate ?? membership.end_date,
          );
          const isActive =
            !!startDate && startDate <= now && (!endDate || endDate >= now);
          if (!isActive) return;

          const orgUnitId =
            membership.orgUnitId ??
            membership.org_unit_id ??
            membership.orgUnit?.id ??
            membership.org_unit?.id;

          if (orgUnitId) return;

          const orgUnitCode =
            membership.orgUnitCode ??
            membership.org_unit_code ??
            membership.orgUnit?.code;

          const mappedId = orgUnitCode
            ? codeToId.get(String(orgUnitCode))
            : undefined;
          const user =
            toUser(membership.user) ??
            toUser(membership.userDto) ??
            toUser(membership.user_info) ??
            toUser(membership.userInfo);

          if (mappedId && user && !headsMap[String(mappedId)]) {
            headsMap[String(mappedId)] = user;
          }
        });
      }
    } catch (error) {
      console.warn("[getAllOrgHeads] Memberships API not available:", error);
    }

    // Step 2: Fallback - fetch heads individually per org unit
    if (Object.keys(headsMap).length === 0) {
      try {
        const unitsResponse = await this.getOrgUnits();
        const units = unitsResponse.data ?? [];

        const headResults = await Promise.allSettled(
          units.map(async (unit) => {
            try {
              const headsResponse = await this.getOrgUnitHeadsByOrgId(unit.id);
              const heads = headsResponse.data ?? [];
              const activeHead =
                heads.find((head) => head.isActive) ?? heads[0];
              if (activeHead?.user) {
                return [unit.id, activeHead.user] as const;
              }
            } catch {
              return undefined;
            }
            return undefined;
          }),
        );

        headResults.forEach((result) => {
          if (result.status !== "fulfilled" || !result.value) return;
          const [unitId, user] = result.value;
          if (unitId && user) {
            headsMap[String(unitId)] = user;
          }
        });
      } catch (error) {
        console.warn("[getAllOrgHeads] Fallback fetch failed:", error);
      }
    }

    return {
      success: true,
      data: headsMap,
    };
  }

  /**
   * Create a new organization unit
   */
  async createOrgUnit(data: {
    code: string;
    name: string;
    parentCode?: string;
  }): Promise<ApiResponse<Unit>> {
    const result = await apiCaller.post("/org-units", {
      code: data.code,
      name: data.name,
      type: "ORG_UNIT",
      parentCode: data.parentCode,
    });
    const parsedResult = orgUnitSchema.parse(result.data);
    return {
      success: true,
      data: tOrgUnit(parsedResult),
    };
  }

  /**
   * Create a new role (org-unit with type ROLE)
   */
  async createRole(data: {
    code: string;
    name: string;
  }): Promise<ApiResponse<Unit>> {
    const result = await apiCaller.post("/org-units", {
      code: data.code,
      name: data.name,
      type: "ROLE",
    });
    const parsedResult = orgUnitSchema.parse(result.data);
    return {
      success: true,
      data: tOrgUnit(parsedResult),
    };
  }

  /**
   * Update organization unit details (name, code)
   */
  async updateOrgUnit(
    orgUnitId: string,
    data: { name?: string; code?: string; parentCode?: string | null },
  ): Promise<ApiResponse<Unit>> {
    const result = await apiCaller.patch(`/org-units/${orgUnitId}`, data);
    const parsedResult = orgUnitSchema.parse(result.data);
    return {
      success: true,
      data: tOrgUnit(parsedResult),
    };
  }

  /**
   * Delete an organization unit
   */
  async deleteOrgUnit(orgUnitId: string): Promise<ApiResponse<void>> {
    await apiCaller.delete(`/org-units/${orgUnitId}`);
    return {
      success: true,
      data: undefined,
    };
  }

  /**
   * Set a user's default organization unit
   */
  async updateUserDefaultOrg(
    userId: string,
    orgUnitId: string,
  ): Promise<ApiResponse<User>> {
    const result = await apiCaller.patch(`/users/${userId}`, {
      defaultOrgId: Number(orgUnitId),
    });
    const parsedResult = userSchema.parse(result.data);
    return {
      success: true,
      data: tUser(parsedResult),
    };
  }

  /**
   * Add a user to an organization unit
   * Uses the membership API with orgUnitCode
   */
  async addUserToOrgUnit(
    orgUnitId: string,
    userId: string,
  ): Promise<ApiResponse<Unit>> {
    try {
      console.log("[addUserToOrgUnit] Starting:", { orgUnitId, userId });

      // First, get the org unit to get its code
      const orgUnit = await this.getOrgUnitById(orgUnitId);
      if (!orgUnit.data) {
        throw new Error("Organization unit not found");
      }

      console.log("[addUserToOrgUnit] Org unit found:", {
        orgUnitId: orgUnit.data.id,
        orgUnitCode: orgUnit.data.code,
        currentMembersCount: orgUnit.data.members?.length || 0,
      });

      // Create membership with correct format
      const now = new Date().toISOString();
      const oneYearLater = new Date();
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

      const payload = {
        orgUnitCode: orgUnit.data.code,
        userId: Number(userId),
        assignType: "USER",
        startDate: now,
        endDate: oneYearLater.toISOString(),
        note: "Added via UI",
      };

      console.log("[addUserToOrgUnit] Sending API request:", payload);

      const response = await apiCaller.post("/org-units/memberships", payload);

      console.log("[addUserToOrgUnit] API response:", response);

      // Refetch the org unit to get updated members list
      const updatedOrgUnit = await this.getOrgUnitById(orgUnitId);

      console.log("[addUserToOrgUnit] After refetch:", {
        newMembersCount: updatedOrgUnit.data?.members?.length || 0,
        members: updatedOrgUnit.data?.members?.map((m) => ({
          id: m.id,
          name: m.name,
        })),
      });

      return updatedOrgUnit;
    } catch (error) {
      console.error("[addUserToOrgUnit] Error:", error);
      throw error;
    }
  }

  /**
   * Remove a user from an organization unit
   * Get membership ID from org unit's members data (raw API response)
   */
  async removeUserFromOrgUnit(
    orgUnitId: string,
    userId: string,
  ): Promise<ApiResponse<Unit>> {
    try {
      console.log("[removeUserFromOrgUnit] Starting:", {
        orgUnitId,
        userId,
        userIdType: typeof userId,
      });

      // Get org members with membership IDs using the correct API endpoint
      // API returns OrgMemberDto[] where each has { id: membershipId, user: UserDto, ... }
      const membersResponse = await apiCaller.get(
        `/org-units/${orgUnitId}/users`,
      );

      console.log("[removeUserFromOrgUnit] Members API response:", {
        membersCount: membersResponse.data?.length || 0,
        members: membersResponse.data,
      });

      if (!membersResponse.data || membersResponse.data.length === 0) {
        throw new Error("No members found in organization");
      }

      // Find the membership - match by user.id
      const userIdAsNumber = Number(userId);
      const membership = membersResponse.data.find((m: any) => {
        const memberUserId = m.user?.id;
        const match =
          memberUserId === userIdAsNumber ||
          memberUserId === userId ||
          String(memberUserId) === String(userId);

        console.log("[removeUserFromOrgUnit] Checking membership:", {
          membershipId: m.id,
          memberUserId: memberUserId,
          memberUserName: m.user?.name,
          searchUserId: userId,
          match: match,
        });

        return match;
      });

      if (!membership) {
        console.error("[removeUserFromOrgUnit] Membership not found:", {
          searchUserId: userId,
          searchUserIdAsNumber: userIdAsNumber,
          availableMemberships: membersResponse.data.map((m: any) => ({
            membershipId: m.id,
            userId: m.user?.id,
            userName: m.user?.name,
            userEmail: m.user?.email,
          })),
        });
        throw new Error("User not found in organization");
      }

      const membershipId = membership.id;

      console.log("[removeUserFromOrgUnit] Membership found, deleting:", {
        membershipId,
        userName: membership.user?.name,
        apiUrl: `/org-units/memberships/${membershipId}`,
      });

      // Delete the membership
      const deleteResponse = await apiCaller.delete(
        `/org-units/memberships/${membershipId}`,
      );

      console.log("[removeUserFromOrgUnit] Delete response:", deleteResponse);

      // Refetch the org unit to get updated members list
      const updatedOrgUnit = await this.getOrgUnitById(orgUnitId);

      console.log("[removeUserFromOrgUnit] Success - removed user:", {
        oldCount: membersResponse.data.length,
        newCount: updatedOrgUnit.data?.members?.length || 0,
        removedUserName: membership.user?.name,
      });

      return updatedOrgUnit;
    } catch (error) {
      console.error("[removeUserFromOrgUnit] Error:", error);
      throw error;
    }
  }

  /**
   * Create a head assignment for an organization unit
   */
  async createOrgHead(
    orgUnitId: string,
    userId: string,
    startDate: string,
    endDate?: string,
  ): Promise<ApiResponse<void>> {
    const orgUnit = await this.getOrgUnitById(orgUnitId);
    if (!orgUnit.data) {
      throw new Error("Organization unit not found");
    }

    const payload = {
      orgUnitCode: orgUnit.data.code,
      userId: Number(userId),
      assignType: "HEAD",
      startDate,
      endDate: endDate ?? null,
      note: "Assigned via UI",
    };

    await apiCaller.post("/org-units/memberships", payload);

    return {
      success: true,
      data: undefined,
    };
  }

  /**
   * Update a head assignment's effective dates
   */
  async updateOrgHead(
    headId: string,
    startDate: string,
    endDate?: string,
  ): Promise<ApiResponse<void>> {
    const payload = {
      startDate,
      endDate: endDate ?? null,
    };

    await apiCaller.patch(`/org-units/memberships/${headId}`, payload);

    return {
      success: true,
      data: undefined,
    };
  }

  /**
   * Delete a head assignment
   */
  async deleteOrgHead(headId: string): Promise<ApiResponse<void>> {
    await apiCaller.delete(`/org-units/memberships/${headId}`);

    return {
      success: true,
      data: undefined,
    };
  }

  private normalizeDataset(dataset: DatasetDefinition): DatasetDefinition {
    if (!dataset || !dataset.fields) return dataset as DatasetDefinition;
    const raw = dataset as unknown as Record<string, unknown>;
    return {
      ...dataset,
      primaryKey:
        dataset.primaryKey ?? (raw.primary_key as string | undefined) ?? "",
      fields: dataset.fields.map((f) => ({
        ...f,
        type: (f.type as string).toLowerCase() as any,
      })),
    } as DatasetDefinition;
  }

  //--- Dataset Management
  async getDatasets(params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedApiResponse<DatasetDefinition>> {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 10;
    const queryString = qs.stringify(
      { _page: page, _limit: limit },
      { skipNulls: true },
    );
    const result = await apiCaller.get(
      `/master-data${queryString ? `?${queryString}` : ""}`,
    );
    const data = result.data;
    // API returns pagination object { items: [], ... } but may fall back to array
    if (Array.isArray(data)) {
      const items = data.map((item: DatasetDefinition) =>
        this.normalizeDataset(item),
      );
      return {
        success: true,
        data: {
          items,
          total: items.length,
          page,
          limit,
          totalPages: 1,
        },
      };
    }

    const items: DatasetDefinition[] = (data.items ?? []).map(
      (item: DatasetDefinition) => this.normalizeDataset(item),
    );
    return {
      success: true,
      data: {
        items,
        total: data.total ?? items.length,
        page: data.page ?? page,
        limit: data.limit ?? limit,
        totalPages: data.totalPages ?? 1,
      },
    };
  }

  async getDataset(code: string): Promise<ApiResponse<DatasetDefinition>> {
    const result = await apiCaller.get(`/master-data/${code}`);
    return {
      success: true,
      data: this.normalizeDataset(result.data),
    };
  }

  async createDataset(
    dto: CreateDatasetDto,
  ): Promise<ApiResponse<DatasetDefinition>> {
    const normalizedCode = dto.name
      .toUpperCase()
      .replace(/\s+/g, "_")
      .replace(/[^A-Z0-9_]/g, "");

    if (dto.source_type === "EXTERNAL_API") {
      const payload = {
        code: normalizedCode,
        name: dto.name,
        source_type: "EXTERNAL_API" as const,
        fields: (dto.fields ?? []).map((field) => ({
          name: field.name
            .toLowerCase()
            .replace(/\s+/g, "_")
            .replace(/[^a-z0-9_]/g, ""),
          type: field.type.toUpperCase(),
          required: !field.nullable,
        })),
        api_config: dto.api_config,
        field_mappings: dto.field_mappings,
      };

      const result = await apiCaller.post("/master-data", payload);
      return {
        success: true,
        data: this.normalizeDataset(result.data),
      };
    }

    // Transform DTO to match backend requirements
    const payload = {
      code: normalizedCode,
      name: dto.name,
      fields: (dto.fields ?? []).map((field) => ({
        name: field.name
          .toLowerCase()
          .replace(/\s+/g, "_")
          .replace(/[^a-z0-9_]/g, ""),
        type: field.type.toUpperCase(),
        required: !field.nullable,
      })),
    };

    const result = await apiCaller.post("/master-data", payload);
    return {
      success: true,
      data: this.normalizeDataset(result.data),
    };
  }

  async deleteDataset(code: string): Promise<ApiResponse<void>> {
    await apiCaller.delete(`/master-data/${code}`);
    return {
      success: true,
      data: undefined,
    };
  }

  async renameDataset(
    code: string,
    name: string,
  ): Promise<ApiResponse<DatasetDefinition>> {
    const result = await apiCaller.patch(`/master-data/${code}`, { name });
    return {
      success: true,
      data: this.normalizeDataset(result.data),
    };
  }

  async updateExternalApiConfig(
    code: string,
    dto: {
      api_config?: ExternalApiRequestConfig | null;
      field_mappings?: ExternalApiFieldMappingsDto | null;
    },
  ): Promise<ApiResponse<DatasetDefinition>> {
    const result = await apiCaller.patch(
      `/master-data/${code}/external-config`,
      dto,
    );
    return {
      success: true,
      data: this.normalizeDataset(result.data),
    };
  }

  async updateDatasetSchema(
    code: string,
    dto: UpdateDatasetSchemaDto,
  ): Promise<ApiResponse<DatasetDefinition>> {
    const result = await apiCaller.put(`/master-data/${code}/schema`, dto);
    return {
      success: true,
      data: this.normalizeDataset(result.data),
    };
  }

  async getDatasetRecords(
    code: string,
    params?: { page?: number; limit?: number } & Record<string, any>,
  ): Promise<PaginatedApiResponse<DatasetRecord>> {
    const { page, limit, ...rest } = params || {};
    const queryParams = {
      ...rest,
      _page: page,
      _limit: limit,
    };
    const queryString = qs.stringify(queryParams, { skipNulls: true });
    const url = `/master-data/${code}/records${queryString ? `?${queryString}` : ""}`;
    const result = await apiCaller.get(url);
    const data = result.data;
    return {
      success: true,
      data: {
        items: data.items ?? data,
        total: data.total ?? (Array.isArray(data) ? data.length : 0),
        page: data.page ?? page ?? 1,
        limit: data.limit ?? limit ?? 50,
        totalPages: data.totalPages ?? 1,
      },
    };
  }

  async createDatasetRecords(
    code: string,
    records: DatasetRecord[],
  ): Promise<ApiResponse<DatasetRecord[]>> {
    const result = await apiCaller.post(
      `/master-data/${code}/records`,
      records,
    );
    return {
      success: true,
      data: result.data,
    };
  }

  async updateDatasetRecords(
    code: string,
    updates: { original: DatasetRecord; changes: DatasetRecord }[],
    fieldNames: string[],
  ): Promise<ApiResponse<void>> {
    await Promise.all(
      updates.map(({ original, changes }) => {
        // Build WHERE filter from all original field values
        const filterParams = fieldNames
          .map(
            (name) =>
              `${encodeURIComponent(name)}=${encodeURIComponent(String(original[name] ?? ""))}`,
          )
          .join("&");

        return apiCaller.patch(
          `/master-data/${code}/records?${filterParams}`,
          changes,
        );
      }),
    );

    return {
      success: true,
      data: undefined,
    };
  }

  async deleteDatasetRecords(
    code: string,
    records: DatasetRecord[],
    fieldNames: string[],
  ): Promise<ApiResponse<void>> {
    await Promise.all(
      records.map((record) => {
        const filterParams = fieldNames
          .map(
            (name) =>
              `${encodeURIComponent(name)}=${encodeURIComponent(String(record[name] ?? ""))}`,
          )
          .join("&");

        return apiCaller.delete(`/master-data/${code}/records?${filterParams}`);
      }),
    );

    return {
      success: true,
      data: undefined,
    };
  }

  async getBpmDatasets(params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedApiResponse<DatasetDefinition>> {
    const queryString = qs.stringify(
      {
        _page: params?.page,
        _limit: params?.limit,
      },
      { skipNulls: true },
    );
    const url = `/master-data${queryString ? `?${queryString}` : ""}`;
    const result = await apiCaller.get(url);
    const data = result.data;
    const items = (data.items ?? []).map((item: DatasetDefinition) =>
      this.normalizeDataset(item),
    );
    return {
      success: true,
      data: {
        items,
        total: data.total ?? items.length,
        page: data.page ?? params?.page ?? 1,
        limit: data.limit ?? params?.limit ?? items.length,
        totalPages: data.totalPages ?? 1,
      },
    };
  }

  async getBpmDatasetCodeByName(
    name: string,
  ): Promise<ApiResponse<{ code: string }>> {
    const normalizedName = name.trim();
    const result = await apiCaller.get(
      `/master-data/get-code/${encodeURIComponent(normalizedName)}`,
    );
    const code = (result.data?.code ?? "").toString().trim();
    if (!code) {
      throw new Error(`Dataset code not found for name "${normalizedName}"`);
    }
    return {
      success: true,
      data: {
        code,
      },
    };
  }

  async getBpmDataset(code: string): Promise<ApiResponse<DatasetDefinition>> {
    const result = await apiCaller.get(`/master-data/${code}`);
    const dataset = result.data as DatasetDefinition;
    const normalized = this.normalizeDataset(dataset);
    return {
      success: true,
      data: normalized,
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
    const { page, limit, sortBy, sortOrder, select, ...rest } = params || {};
    const queryParams = {
      ...rest,
      _page: page,
      _limit: limit,
      _sortBy: sortBy,
      _sortOrder: sortOrder,
      _select: Array.isArray(select) ? select.join(",") : select,
    };
    const queryString = qs.stringify(queryParams, { skipNulls: true });
    const url = `/master-data/${code}/records${queryString ? `?${queryString}` : ""}`;
    try {
      const result = await apiCaller.get(url);

      const data = result.data;
      return {
        success: true,
        data: {
          items: data.items ?? data,
          total: data.total ?? (Array.isArray(data) ? data.length : 0),
          page: data.page ?? page ?? 1,
          limit: data.limit ?? limit ?? 50,
          totalPages: data.totalPages ?? 1,
        },
      };
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        return {
          success: true,
          data: {
            items: [],
            total: 0,
            page: page ?? 1,
            limit: limit ?? 50,
            totalPages: 1,
          },
        };
      }
      throw error;
    }
  }

  async testExternalApi(apiConfig: {
    url: string;
    method: "GET" | "POST" | "PUT";
    headers?: Record<string, string>;
    body?: string;
  }): Promise<ApiResponse<unknown>> {
    const result = await apiCaller.post("/master-data/external-api/test", {
      api_config: apiConfig,
    });
    return {
      success: true,
      data: result.data,
    };
  }

  async importDatasetCsv(
    code: string,
    file: File,
  ): Promise<ApiResponse<{ inserted: number }>> {
    const formData = new FormData();
    formData.append("file", file);

    const result = await apiCaller.post(
      `/master-data/${code}/records/import-csv`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );

    return {
      success: true,
      data: result.data,
    };
  }

  async exportDatasetCsv(code: string): Promise<Blob> {
    const result = await apiCaller.get(
      `/master-data/${code}/records/export-csv`,
      { responseType: "blob" },
    );
    return result.data;
  }

  //--- Validator Management
  async getValidators(
    options?: ValidatorListOptions,
  ): Promise<PaginatedApiResponse<Validator>> {
    try {
      const page = options?.page ?? 1;
      const limit = options?.limit ?? 10;
      const normalizedName = options?.name?.trim();

      const params: Record<string, string | number | undefined> = {
        page,
        limit,
        name: normalizedName || undefined,
        component: options?.component,
        validationType: options?.validationType,
      };

      const queryString = qs.stringify(params, {
        arrayFormat: "repeat",
        skipNulls: true,
      });

      const url = `/validation-registry${queryString ? `?${queryString}` : ""}`;
      const result = await apiCaller.get(url);
      const parsedResult = validatorResponseSchema
        .transform(tValidatorList)
        .parse(result.data);

      return {
        success: true,
        data: parsedResult,
      };
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async getValidator(id: string): Promise<ApiResponse<Validator>> {
    const result = await apiCaller.get(`/validation-registry/${id}`);
    const item = validatorResponseSchema.shape.items.element.parse(result.data);
    return {
      success: true,
      data: tValidator(item),
    };
  }

  async createValidator(
    dto: CreateValidatorDto,
  ): Promise<ApiResponse<Validator>> {
    const result = await apiCaller.post("/validation-registry", dto);
    const item = validatorResponseSchema.shape.items.element.parse(result.data);
    return {
      success: true,
      data: tValidator(item),
    };
  }

  async updateValidator(
    id: string,
    dto: UpdateValidatorDto,
  ): Promise<ApiResponse<Validator>> {
    const result = await apiCaller.patch(`/validation-registry/${id}`, dto);
    const item = validatorResponseSchema.shape.items.element.parse(result.data);
    return {
      success: true,
      data: tValidator(item),
    };
  }

  async deleteValidator(id: string): Promise<ApiResponse<void>> {
    await apiCaller.delete(`/validation-registry/${id}`);
    return {
      success: true,
      data: undefined,
    };
  }

  async setValidatorComponents(
    id: string,
    components: string[],
  ): Promise<ApiResponse<void>> {
    await apiCaller.put(`/validation-registry/${id}/components`, {
      components,
    });
    return {
      success: true,
      data: undefined,
    };
  }

  async validateApplicationFields(
    payload: ValidateFieldsRequest,
  ): Promise<ApiResponse<ValidateFieldsResponse>> {
    const parsedPayload = validateFieldsRequestSchema.parse(payload);
    const result = await apiCaller.post(
      "/applications/validate-fields",
      parsedPayload,
    );
    const parsedResult = validateFieldsResponseSchema.parse(result.data);

    return {
      success: true,
      data: parsedResult,
    };
  }

  //--- Application Management

  async createApplication(
    payload: Omit<Application, "submittedAt" | "serialNumber" | "id"> &
      (
        | {
            serialNumber: string;
          }
        | {
            id: string;
          }
      ) & { draftId?: string | null },
  ): Promise<ApiResponse<Application>> {
    // get binding workflow id
    if ("id" in payload) {
      const params: Record<string, unknown> = {
        form_data: payload.formInstance.data,
        binding_id: Number(payload.id),
        priority: "NORMAL",
      };

      if (payload.draftId) {
        params.draft_id = payload.draftId;
      }

      if (payload.applicantId !== undefined) {
        params.applicant_id = payload.applicantId;
      }

      if (payload.overallStatus === OverallStatus.Draft) {
        // first time creating a draft application
        const result = await apiCaller.post("/applications", params);
        const parsedResult = applicationSchema
          .transform(tApplicationSchema)
          .parse(result.data);
        return {
          success: true,
          data: parsedResult,
        };
      } else {
        // first time create a published application
        const result = await apiCaller.post("/applications/submission", params);
        const parsedResult = applicationSchema
          .transform(tApplicationSchema)
          .parse(result.data);

        return {
          success: true,
          data: parsedResult,
        };
      }
    } else if ("serialNumber" in payload) {
      // if this application already existed
      const params: Record<string, unknown> = {
        form_data: payload.formInstance.data,
      };

      if (payload.draftId) {
        params.draft_id = payload.draftId;
      }

      if (payload.applicantId !== undefined) {
        params.applicant_id = payload.applicantId;
      }

      const result = await apiCaller.post(
        `/applications/${payload.serialNumber}/submission`,
        params,
      );
      const parsedResult = applicationSchema
        .transform(tApplicationSchema)
        .parse(result.data);

      return {
        success: true,
        data: parsedResult,
      };
    }

    throw Error("no binding id nor serial number");
  }

  async getApplication(
    serialNumber: string,
  ): Promise<ApiResponse<Application>> {
    try {
      const result = await apiCaller.get(`/applications/${serialNumber}`);
      const parsedResult = applicationSchema
        .transform(tApplicationSchema)
        .parse(result.data);

      return {
        success: !!parsedResult,
        data: parsedResult,
        error: parsedResult ? undefined : "Application not found",
      };
    } catch (error) {
      console.error(error);
      throw new Error("error");
    }
  }

  async getApprovalApplication(
    approvalId: string,
  ): Promise<ApiResponse<Application>> {
    try {
      const result = await apiCaller.get(
        `/applications/approval/${approvalId}`,
      );
      const parsedResult = applicationApprovalSchema
        .transform(tApplicationApprovalSchema)
        .parse(result.data);

      return {
        success: !!parsedResult,
        data: parsedResult,
        error: parsedResult ? undefined : "Application not found",
      };
    } catch (error) {
      console.error(error);
      throw new Error("error");
    }
  }

  async getApplications(
    options?: ApplicationOptions,
  ): Promise<PaginatedApiResponse<Application>> {
    try {
      const page = options?.page ?? 1;
      const limit = options?.pageSize ?? 10;
      const filter = options?.filter;
      const sorter = options?.sorter;

      const normalizeIds = (ids?: number[]) => {
        if (!ids?.length) return undefined;
        const normalized = ids
          .map((value) => Number(value))
          .filter((value) => !Number.isNaN(value));
        return normalized.length ? normalized : undefined;
      };

      const mapApprovalStatus = (status?: ReviewStatus) => {
        switch (status) {
          case ReviewStatus.Approved:
            return "APPROVED";
          case ReviewStatus.Canceled:
            return "CANCELLED";
          case ReviewStatus.NotStarted:
            return "WAITING";
          case ReviewStatus.Pending:
            return "PENDING";
          case ReviewStatus.Rejected:
            return "REJECTED";
          default:
            return undefined;
        }
      };
      const mapApprovalStatuses = (
        status?: ReviewStatus,
      ):
        | Array<"WAITING" | "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED">
        | undefined => {
        if (!status) return undefined;
        const statuses = [status];
        const mapped = statuses
          .map((value) => mapApprovalStatus(value))
          .filter(
            (
              value,
            ): value is
              | "WAITING"
              | "PENDING"
              | "APPROVED"
              | "REJECTED"
              | "CANCELLED" => Boolean(value),
          );
        return mapped.length ? Array.from(new Set(mapped)) : undefined;
      };

      const mapOverallStatus = (status?: OverallStatus) => {
        switch (status) {
          case OverallStatus.CompletedApproved:
            return "COMPLETED";
          case OverallStatus.CompletedRejected:
            return "REJECTED";
          case OverallStatus.Canceled:
            return "CANCELLED";
          case OverallStatus.Draft:
            return "DRAFT";
          case OverallStatus.InProgress:
            return "RUNNING";
          default:
            return undefined;
        }
      };

      const params = {
        page,
        limit,
        overallStatus: mapOverallStatus(filter?.overallStatus),
        approvalStatus:
          filter?.approvalStatus && filter.approvalStatus.length > 0
            ? filter.approvalStatus
            : mapApprovalStatuses(filter?.reviewStatus),
        applicantId: filter?.applicantId,
        serialNumber: filter?.serialNumber,
        formName: filter?.formName,
        workflowName: filter?.workflowName,
        formTagIds: normalizeIds(filter?.formTagIds),
        workflowTagIds: normalizeIds(filter?.workflowTagIds),
        sortBy: sorter?.sortBy ?? "applied_at",
        sortOrder: sorter?.submittedAt ?? sorter?.sortOrder,
      };

      const queryString = qs.stringify(params, {
        arrayFormat: "repeat",
        skipNulls: true,
      });

      const listFilter =
        options?.listFilter ??
        (options?.type === "approval" ? "approving" : "submitted");
      const baseUrl = `/applications?filter=${listFilter}`;
      const url = queryString ? `${baseUrl}&${queryString}` : baseUrl;

      const result = await apiCaller.get(url);
      const parsedResult = applicationListSchema
        .transform((payload) =>
          transformPaginatedResponse(payload, tApplicationListItemSchema),
        )
        .parse(result.data);

      return {
        success: true,
        data: parsedResult,
      };
    } catch (e) {
      console.error(e);
      throw Error("error");
    }
  }

  async getApplicationForms(
    options?: ApplicationFormOptions,
  ): Promise<PaginatedApiResponse<ApplicationForm>> {
    const page = options?.page ?? 1;
    const limit = options?.pageSize ?? 10;
    const filter = options?.filter;
    const sorter = options?.sorter;

    const normalizeIds = (ids?: number[]) => {
      if (!ids?.length) return undefined;
      const normalized = ids
        .map((value) => Number(value))
        .filter((value) => !Number.isNaN(value));
      return normalized.length ? normalized : undefined;
    };

    const params = {
      page,
      limit,
      formName: filter?.formName,
      workflowName: filter?.workflowName,
      formTagIds: normalizeIds(filter?.formTagIds),
      workflowTagIds: normalizeIds(filter?.workflowTagIds),
      sortOrder: sorter?.sortOrder ?? "desc",
    };

    const queryString = qs.stringify(params, {
      arrayFormat: "repeat",
      skipNulls: true,
    });

    const result = await apiCaller.get(
      `/applications/available?${queryString}`,
    );
    const parsedResult = applicationFormListSchema
      .transform(tApplicationFormListShcema)
      .parse(result.data);
    return {
      success: true,
      data: parsedResult,
    };
  }

  async getApplicationForm(
    bindingId: string,
  ): Promise<ApiResponse<FormDefinition>> {
    const bindingResult = await apiCaller.get(
      `/bindings?binding_id=${bindingId}`,
    );
    const parsedBindingResult = bindingSchema.parse(bindingResult.data);
    if (parsedBindingResult.length <= 0) {
      throw Error(
        `No binding form or workflow found by bonding_id: ${bindingId}`,
      );
    } else {
      const formId =
        parsedBindingResult.find((b) => b.id === Number(bindingId))?.form_id ??
        "";
      const result = await apiCaller.get(`/form/${formId}/resolved`);
      const form = resolvedFormSchema
        .transform(tResolvedToFormDefinition)
        .parse(result.data);
      return {
        success: !!form,
        data: form,
        error: form ? undefined : "Form not found",
      };
    }
  }

  async discardApplication(id: string): Promise<ApiResponse<void>> {
    const result = await apiCaller.delete(`/applications/${id}`);
    return {
      success: true,
      data: result.data,
    };
  }

  async approveApplication(
    serialNumber: string,
    approvalId: string,
    comment?: string,
    formData?: Record<string, string>,
  ): Promise<ApiResponse<unknown>> {
    const params = {
      approval_id: approvalId,
      approval_result: "approve",
      comment: comment,
      form_data: formData ?? {},
    };
    const result = await apiCaller.put(
      `/applications/${serialNumber}/approval`,
      params,
    );

    return {
      success: true,
      data: result.data,
    };
  }

  async rejectApplication(
    serialNumber: string,
    approvalId: string,
    comment?: string,
    formData?: Record<string, string>,
  ): Promise<ApiResponse<unknown>> {
    const params = {
      approval_id: approvalId,
      approval_result: "reject",
      comment: comment,
      form_data: formData ?? {},
    };
    const result = await apiCaller.put(
      `/applications/${serialNumber}/approval`,
      params,
    );

    return {
      success: true,
      data: result.data,
    };
  }

  async updateApplication(
    serialNumber: string,
    application: Application,
  ): Promise<ApiResponse<Application>> {
    const result = await apiCaller.put(`/applications/${serialNumber}`, {
      form_data: application.formInstance.data,
    });
    const parsedResult = applicationSchema
      .transform(tApplicationSchema)
      .parse(result.data);

    return {
      success: true,
      data: parsedResult,
    };
  }

  async getApplicationProgress(
    applicationId: string,
  ): Promise<
    ApiResponse<{ progress: Progress; overallStatus: OverallStatus }>
  > {
    try {
      const result = await apiCaller.get(`/applications/${applicationId}`);
      const parsed = applicationSchema.parse(result.data);
      const overallStatus = tOverallStatus(parsed.workflow_instance.status);
      const progress = tApplicationProgress(parsed.routing, overallStatus);

      return {
        success: true,
        data: {
          progress,
          overallStatus,
        },
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        error: "error",
      };
    }
  }

  async getComments(serialNumber: string): Promise<ApiResponse<Comment[]>> {
    const result = await apiCaller.get(
      `/applications/${serialNumber}/comments`,
    );
    const parsedResult = z
      .array(commentSchema.transform(tCommentSchema))
      .parse(result.data);
    return {
      success: true,
      data: parsedResult,
    };
  }

  // =============================================
  // User Management
  // =============================================

  async createUser(data: {
    code: string;
    name: string;
    jobGrade: number;
    defaultOrgCode?: string;
  }): Promise<ApiResponse<User>> {
    const result = await apiCaller.post("/users", {
      code: data.code,
      name: data.name,
      jobGrade: data.jobGrade,
      defaultOrgCode: data.defaultOrgCode,
    });
    const parsed = userSchema.parse(result.data);
    return { success: true, data: tUser(parsed) };
  }

  async getUserById(id: string): Promise<ApiResponse<User>> {
    const result = await apiCaller.get(`/users/${Number(id)}`);
    const parsed = userSchema.parse(result.data);
    return { success: true, data: tUser(parsed) };
  }

  async updateUser(
    id: string,
    data: { name?: string; jobGrade?: number; defaultOrgCode?: string },
  ): Promise<ApiResponse<User>> {
    const result = await apiCaller.patch(`/users/${Number(id)}`, data);
    const parsed = userSchema.parse(result.data);
    return { success: true, data: tUser(parsed) };
  }

  async deleteUser(id: string): Promise<ApiResponse<void>> {
    await apiCaller.delete(`/users/${Number(id)}`);
    return { success: true };
  }

  async getUserMemberships(
    userId: string,
  ): Promise<ApiResponse<import("@/types/user-management").OrgMembership[]>> {
    const result = await apiCaller.get(
      `/org-units/memberships/user/${Number(userId)}`,
    );
    const parsed = OrgMembershipListSchema.parse(result.data);
    return { success: true, data: tOrgMembershipList(parsed) };
  }

  async createOrgMembership(data: {
    orgUnitCode: string;
    userId: string;
    startDate: string;
    endDate?: string;
    isIndefinite?: boolean;
    note?: string;
  }): Promise<ApiResponse<import("@/types/user-management").OrgMembership>> {
    const payload = parseCreateMembership(data);
    const result = await apiCaller.post("/org-units/memberships", payload);
    // POST returns OrgMembershipDto (no user/orgUnitCode), not OrgMemberDto
    // Build a minimal OrgMembership from the request data + response id
    const raw = result.data;
    return {
      success: true,
      data: {
        id: String(raw.id ?? ""),
        orgUnitId: "",
        orgUnitCode: data.orgUnitCode,
        orgUnitName: data.orgUnitCode,
        userId: data.userId,
        startDate: data.startDate,
        endDate: data.endDate,
        isIndefinite: data.isIndefinite ?? false,
        assignType: "USER",
        isExpired: false,
      },
    };
  }

  async updateOrgMembership(
    id: string,
    data: {
      startDate?: string;
      endDate?: string;
      isIndefinite?: boolean;
      note?: string;
    },
  ): Promise<ApiResponse<import("@/types/user-management").OrgMembership>> {
    const payload = parseUpdateMembership(data);
    await apiCaller.patch(`/org-units/memberships/${Number(id)}`, payload);
    // PATCH returns OrgMembershipDto (different shape), just return success
    return {
      success: true,
      data: {
        id,
        orgUnitId: "",
        orgUnitCode: "",
        orgUnitName: "",
        userId: "",
        startDate: data.startDate ?? "",
        endDate: data.endDate,
        isIndefinite: data.isIndefinite ?? false,
        assignType: "USER",
        isExpired: false,
      },
    };
  }

  async deleteOrgMembership(id: string): Promise<ApiResponse<void>> {
    await apiCaller.delete(`/org-units/memberships/${Number(id)}`);
    return { success: true };
  }

  // Utility
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
