import { EntityKey } from "./form-builder";

export enum ValidatorType {
  Code = "code",
  Api = "api",
}

interface ValidatorBase {
  id: string;
  name: string;
  description?: string;
  errorMessage: string;
  createdAt: number;
  updatedAt?: number;
  components: EntityKey[];
}

interface CodeValidator extends ValidatorBase {
  type: ValidatorType.Code | ValidatorType.Api;
  data: {
    code: string;
    isApi?: boolean;
    listens: string[]; // field names to listen to
  };
}

export type Validator = CodeValidator;

export interface ValidatorListOptions {
  page?: number;
  limit?: number;
  name?: string;
  component?: string;
  validationType?: ValidatorType;
  isComplete?: boolean;
  isActive?: boolean;
}
