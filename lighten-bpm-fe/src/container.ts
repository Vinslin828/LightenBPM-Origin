import "reflect-metadata";
import { Container } from "inversify";
import { TYPES } from "./types/symbols";
import {
  ISettingsService,
  IStorageService,
  IValidationService,
  IValidatorService,
  IAuthService,
  ILanguageService,
  IFormService,
  IDomainService,
  IMasterDataService,
  IWorkflowService,
  IPermissionService,
  IApplicationService,
} from "./interfaces/services";
import { SettingsService } from "./services/setting-service";
import { StorageService } from "./services/storage-service";
import { ValidationService } from "./services/validation-service";
import { MockAuthService } from "./services/mock/auth-service";
import { LanguageService } from "./services/language-service";
// import { MockDomainService } from "./services/mock/domain-service";
import { FormService } from "./services/form-service";
import { MasterDataService } from "./services/master-data-service";
import { WorkflowService } from "./services/workflow-service";
import { PermissionService } from "./services/permission-service";
import { AuthService } from "./services/auth-service";
import { ApplicationService } from "./services/application-service";
import { DomainService } from "./services/domain-service";
import { ValidatorService } from "./services/validator-service";

const container = new Container();

container
  .bind<IStorageService>(TYPES.StorageService)
  .to(StorageService)
  .inSingletonScope();
container
  .bind<IValidationService>(TYPES.ValidationService)
  .to(ValidationService)
  .inSingletonScope();
container
  .bind<IValidatorService>(TYPES.ValidatorService)
  .to(ValidatorService)
  .inSingletonScope();
container
  .bind<ILanguageService>(TYPES.LanguageService)
  .to(LanguageService)
  .inSingletonScope();
container
  .bind<ISettingsService>(TYPES.SettingsService)
  .to(SettingsService)
  .inSingletonScope();

// Bind IAuthService based on environment variable
if (import.meta.env.VITE_USE_MOCK_AUTH === "true") {
  container
    .bind<IAuthService>(TYPES.AuthService)
    .to(MockAuthService)
    .inSingletonScope();
} else {
  container
    .bind<IAuthService>(TYPES.AuthService)
    .to(AuthService)
    .inSingletonScope();
}

container
  .bind<IDomainService>(TYPES.DomainService)
  // .to(MockDomainService)
  .to(DomainService)
  .inSingletonScope();
container
  .bind<IFormService>(TYPES.FormService)
  .to(FormService)
  .inSingletonScope();
container
  .bind<IMasterDataService>(TYPES.MasterDataService)
  .to(MasterDataService)
  .inSingletonScope();

container
  .bind<IWorkflowService>(TYPES.WorkflowService)
  .to(WorkflowService)
  .inSingletonScope();
container
  .bind<IPermissionService>(TYPES.PermissionService)
  .to(PermissionService)
  .inSingletonScope();
container
  .bind<IApplicationService>(TYPES.ApplicationService)
  .to(ApplicationService)
  .inSingletonScope();

export { container };
