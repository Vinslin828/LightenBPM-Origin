import { inject, injectable } from "inversify";
import { Validator, ValidatorListOptions } from "@/types/validator";
import { ApiResponse, PaginatedApiResponse } from "@/types/domain";
import { TYPES } from "@/types/symbols";
import * as services from "../interfaces/services";
import {
  CreateValidatorDto,
  UpdateValidatorDto,
} from "@/types/validation-registry";
import {
  ValidateFieldsRequest,
  ValidateFieldsResponse,
} from "@/schemas/validator/validate-fields";

@injectable()
export class ValidatorService implements services.IValidatorService {
  constructor(
    @inject(TYPES.DomainService)
    private domainService: services.IDomainService,
  ) {}
  async getValidators(
    options?: ValidatorListOptions,
  ): Promise<PaginatedApiResponse<Validator>> {
    return this.domainService.getValidators(options);
  }
  async getValidator(id: string): Promise<ApiResponse<Validator>> {
    return this.domainService.getValidator(id);
  }
  async createValidator(
    dto: CreateValidatorDto,
  ): Promise<ApiResponse<Validator>> {
    return this.domainService.createValidator(dto);
  }
  async updateValidator(
    id: string,
    dto: UpdateValidatorDto,
  ): Promise<ApiResponse<Validator>> {
    return this.domainService.updateValidator(id, dto);
  }
  async deleteValidator(id: string): Promise<ApiResponse<void>> {
    return this.domainService.deleteValidator(id);
  }
  async setValidatorComponents(
    id: string,
    components: string[],
  ): Promise<ApiResponse<void>> {
    return this.domainService.setValidatorComponents(id, components);
  }
  async validateApplicationFields(
    payload: ValidateFieldsRequest,
  ): Promise<ApiResponse<ValidateFieldsResponse>> {
    return this.domainService.validateApplicationFields(payload);
  }
}
