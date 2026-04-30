import { injectable, inject } from "inversify";
import {
  type IDomainService,
  IMasterDataService,
} from "../interfaces/services";
import { TYPES } from "../types/symbols";
import {
  Tag,
  ApiResponse,
  User,
  Unit,
  Role,
  PaginatedApiResponse,
} from "../types/domain";
import { DatasetDefinition, DatasetRecord } from "../types/master-data-dataset";

@injectable()
export class MasterDataService implements IMasterDataService {
  constructor(
    @inject(TYPES.DomainService) private domainService: IDomainService,
  ) {}

  async getTags(): Promise<ApiResponse<Tag[]>> {
    return this.domainService.getTags();
  }
  async getUsers(params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedApiResponse<User>> {
    return this.domainService.getUsers(params);
  }
  async getUserById(id: string): Promise<ApiResponse<User>> {
    return this.domainService.getUserById(id);
  }
  async getOrgUnits(name?: string): Promise<ApiResponse<Unit[]>> {
    return this.domainService.getOrgUnits(name);
  }
  async getOrgUnitById(id: string): Promise<ApiResponse<Unit>> {
    return this.domainService.getOrgUnitById(id);
  }
  async getOrgUnitByCode(code: string): Promise<ApiResponse<Unit>> {
    return this.domainService.getOrgUnitByCode(code);
  }
  async getOrgRoles(name?: string): Promise<ApiResponse<Role[]>> {
    return this.domainService.getOrgRoles(name);
  }
  async getOrgUnitHeads(): Promise<ApiResponse<User[]>> {
    throw Error("Unimplemented Error");
  }
  async getBpmDatasets(params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedApiResponse<DatasetDefinition>> {
    return this.domainService.getBpmDatasets(params);
  }
  async getBpmDatasetCodeByName(
    name: string,
  ): Promise<ApiResponse<{ code: string }>> {
    return this.domainService.getBpmDatasetCodeByName(name);
  }
  async getBpmDataset(code: string): Promise<ApiResponse<DatasetDefinition>> {
    return this.domainService.getBpmDataset(code);
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
    return this.domainService.getBpmDatasetRecords(code, params);
  }

  async testExternalApi(apiConfig: {
    url: string;
    method: "GET" | "POST" | "PUT";
    headers?: Record<string, string>;
    body?: string;
  }): Promise<ApiResponse<unknown>> {
    return this.domainService.testExternalApi(apiConfig);
  }
}
