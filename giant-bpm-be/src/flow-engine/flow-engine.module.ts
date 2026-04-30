import { Module, forwardRef } from '@nestjs/common';
import { InstanceModule } from '../instance/instance.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { OrgUnitModule } from '../org-unit/org-unit.module';
import { UserModule } from '../user/user.module';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { ValidationRegistryModule } from '../validation-registry/validation-registry.module';
import { MasterDataModule } from '../master-data/master-data.module';
import { WorkflowExecutorService } from './execution/workflow-executor.service';
import { WorkflowEngineService } from './workflow-engine.service';
import { StartNodeExecutor } from './execution/node-executors/start-node.executor';
import { ConditionNodeExecutor } from './execution/node-executors/condition-node.executor';
import { ApprovalNodeExecutor } from './execution/node-executors/approval-node.executor';
import { RoutingBuilder } from './routing-builder/routing-builder';
import { RoutingNodeBuilder } from './routing-builder/routing-node-builder';
import { FlowValidatorService } from './validation/flow-definition/flow-validator.service';
import { FormDataValidatorService } from './validation/form-data/form-data-validator.service';
import { FormReferenceValidatorService } from './validation/form-reference/form-reference-validator.service';
import { FlowAnalysisService } from './analysis/flow-analysis.service';
import {
  ExpressionEvaluatorService,
  FormSchemaResolverService,
  FunctionExecutorService,
  GetFormFieldExecutor,
  GetApplicantProfileExecutor,
  GetApplicationExecutor,
  GetMasterDataExecutor,
  GetCurrentNodeExecutor,
  FetchExecutor,
} from './expression-engine';
import { FormExpressionValidatorService } from './validation/form-expression/form-expression-validator.service';
import { ValidationExecutorService } from './expression-engine/services/validation-executor.service';
import { AutoApproveService } from './execution/auto-approve.service';
import { RejectionHandlerService } from './rejection/rejection-handler.service';
import { ApprovalNotificationService } from './notification/approval-notification.service';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => InstanceModule),
    forwardRef(() => WorkflowModule),
    OrgUnitModule,
    UserModule,
    NotificationModule,
    ValidationRegistryModule,
    MasterDataModule,
  ],
  providers: [
    // Workflow Engine
    WorkflowEngineService,
    WorkflowExecutorService,
    // Node Executors
    StartNodeExecutor,
    ConditionNodeExecutor,
    ApprovalNodeExecutor,
    // Approval Support
    AutoApproveService,
    RejectionHandlerService,
    ApprovalNotificationService,
    // Routing
    RoutingBuilder,
    RoutingNodeBuilder,
    // Validation
    FlowValidatorService,
    FormDataValidatorService,
    ValidationExecutorService,
    FormReferenceValidatorService,
    FormExpressionValidatorService,
    // Analysis
    FlowAnalysisService,
    // Expression Engine (providers directly instead of module to avoid circular deps)
    GetFormFieldExecutor,
    GetApplicantProfileExecutor,
    GetApplicationExecutor,
    GetMasterDataExecutor,
    GetCurrentNodeExecutor,
    FetchExecutor,
    FunctionExecutorService,
    ExpressionEvaluatorService,
    FormSchemaResolverService,
  ],
  exports: [
    WorkflowEngineService,
    RoutingBuilder,
    FlowValidatorService,
    FormDataValidatorService,
    ValidationExecutorService,
    FormReferenceValidatorService,
    FormExpressionValidatorService,
    FlowAnalysisService,
    ExpressionEvaluatorService,
    FormSchemaResolverService,
  ],
})
export class FlowEngineModule {}
