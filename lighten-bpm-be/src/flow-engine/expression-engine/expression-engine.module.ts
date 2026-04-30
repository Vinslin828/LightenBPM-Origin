/**
 * Expression Engine Module
 *
 * Provides services for evaluating complex expressions and resolving form references.
 */

import { Module, forwardRef } from '@nestjs/common';
import { UserModule } from '../../user/user.module';
import { InstanceModule } from '../../instance/instance.module';
import { MasterDataModule } from '../../master-data/master-data.module';

// Executors
import { GetFormFieldExecutor } from './executors/get-form-field.executor';
import { GetApplicantProfileExecutor } from './executors/get-applicant-profile.executor';
import { GetApplicationExecutor } from './executors/get-application.executor';
import { GetMasterDataExecutor } from './executors/get-master-data.executor';
import { GetCurrentNodeExecutor } from './executors/get-current-node.executor';
import { FetchExecutor } from './executors/fetch.executor';

// Services
import { FunctionExecutorService } from './services/function-executor.service';
import { ExpressionEvaluatorService } from './services/expression-evaluator.service';
import { FormSchemaResolverService } from './services/form-schema-resolver.service';

@Module({
  imports: [UserModule, forwardRef(() => InstanceModule), MasterDataModule],
  providers: [
    // Executors
    GetFormFieldExecutor,
    GetApplicantProfileExecutor,
    GetApplicationExecutor,
    GetMasterDataExecutor,
    GetCurrentNodeExecutor,
    FetchExecutor,
    // Services
    FunctionExecutorService,
    ExpressionEvaluatorService,
    FormSchemaResolverService,
  ],
  exports: [
    // Export executors for direct use if needed
    GetFormFieldExecutor,
    GetApplicantProfileExecutor,
    GetApplicationExecutor,
    GetMasterDataExecutor,
    GetCurrentNodeExecutor,
    FetchExecutor,
    // Export services
    ExpressionEvaluatorService,
    FormSchemaResolverService,
  ],
})
export class ExpressionEngineModule {}
