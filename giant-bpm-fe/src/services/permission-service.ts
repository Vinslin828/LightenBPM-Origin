import { inject, injectable } from "inversify";
import { TYPES } from "@/types/symbols";
import * as services from "../interfaces/services";
import { Permission } from "@/types/permission";
import {
  BackendWorkflowPermissionDeleteQuery,
  BackendFormPermissionDeleteQuery,
} from "@/schemas/permission/response";
import {
  ApplicationShare,
  ApplicationShareDeleteQuery,
  ApplicationShareInput,
} from "@/types/permission";
import { ApiResponse } from "@/types/domain";

@injectable()
export class PermissionService implements services.IPermissionService {
  constructor(
    @inject(TYPES.DomainService)
    private domainService: services.IDomainService,
  ) {}

  getWorkflowPermissions(
    workflowId: string,
  ): Promise<ApiResponse<Permission>> {
    return this.domainService.getWorkflowPermissions(workflowId);
  }

  addWorkflowPermissions(
    workflowId: string,
    permission: Permission,
  ): Promise<ApiResponse<Permission>> {
    return this.domainService.addWorkflowPermissions(workflowId, permission);
  }

  updateWorkflowPermissions(
    workflowId: string,
    permission: Permission,
  ): Promise<ApiResponse<Permission>> {
    return this.domainService.updateWorkflowPermissions(workflowId, permission);
  }

  deleteWorkflowPermissions(
    workflowId: string,
    query?: BackendWorkflowPermissionDeleteQuery,
  ): Promise<ApiResponse<void>> {
    return this.domainService.deleteWorkflowPermissions(workflowId, query);
  }

  deleteWorkflowPermission(id: number): Promise<ApiResponse<void>> {
    return this.domainService.deleteWorkflowPermission(id);
  }

  getFormPermissions(formId: string): Promise<ApiResponse<Permission>> {
    return this.domainService.getFormPermissions(formId);
  }

  addFormPermissions(
    formId: string,
    permission: Permission,
  ): Promise<ApiResponse<Permission>> {
    return this.domainService.addFormPermissions(formId, permission);
  }

  updateFormPermissions(
    formId: string,
    permission: Permission,
  ): Promise<ApiResponse<Permission>> {
    return this.domainService.updateFormPermissions(formId, permission);
  }

  deleteFormPermissions(
    formId: string,
    query?: BackendFormPermissionDeleteQuery,
  ): Promise<ApiResponse<void>> {
    return this.domainService.deleteFormPermissions(formId, query);
  }

  deleteFormPermission(id: number): Promise<ApiResponse<void>> {
    return this.domainService.deleteFormPermission(id);
  }

  getApplicationShares(
    serialNumber: string,
  ): Promise<ApiResponse<ApplicationShare[]>> {
    return this.domainService.getApplicationShares(serialNumber);
  }

  addApplicationShares(
    serialNumber: string,
    shares: ApplicationShareInput[],
  ): Promise<ApiResponse<ApplicationShare[]>> {
    return this.domainService.addApplicationShares(serialNumber, shares);
  }

  updateApplicationShares(
    serialNumber: string,
    shares: ApplicationShareInput[],
  ): Promise<ApiResponse<ApplicationShare[]>> {
    return this.domainService.updateApplicationShares(serialNumber, shares);
  }

  deleteApplicationShares(
    serialNumber: string,
    query: ApplicationShareDeleteQuery,
  ): Promise<ApiResponse<void>> {
    return this.domainService.deleteApplicationShares(serialNumber, query);
  }

  deleteApplicationShare(id: number): Promise<ApiResponse<void>> {
    return this.domainService.deleteApplicationShare(id);
  }
}
