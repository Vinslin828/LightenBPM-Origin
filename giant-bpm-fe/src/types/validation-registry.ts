export interface CreateValidatorDto {
  name: string;
  description?: string;
  validationType: "CODE" | "API";
  validationCode?: string;
  apiConfig?: ApiConfigDto;
  errorMessage: string;
  isActive: boolean;
  components: string[];
}

export interface UpdateValidatorDto {
  name?: string;
  description?: string;
  validationType?: "CODE" | "API";
  validationCode?: string;
  apiConfig?: ApiConfigDto;
  errorMessage?: string;
  isActive?: boolean;
  components?: string[];
}

export interface ApiConfigDto {
  url: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  successCondition?: Record<string, unknown>;
}
