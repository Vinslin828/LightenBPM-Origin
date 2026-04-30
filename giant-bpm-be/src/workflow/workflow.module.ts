import { Module, forwardRef } from '@nestjs/common';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';
import { WorkflowOptionsRepository } from './repositories/workflow-options.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { UserModule } from '../user/user.module';
import { FormWorkflowBindingModule } from '../form-workflow-binding/form-workflow-binding.module';
import { FormModule } from '../form/form.module';
import { WorkflowRepository } from './repositories/workflow.repository';
import { FlowEngineModule } from '../flow-engine/flow-engine.module';
import { PermissionModule } from '../common/permission/permission.module';
import { MigrationModule } from '../migration/migration.module';
import { FeatureFlagModule } from '../common/feature-flag/feature-flag.module';

@Module({
  imports: [
    PrismaModule,
    UserModule,
    FormWorkflowBindingModule,
    forwardRef(() => FormModule),
    forwardRef(() => FlowEngineModule),
    PermissionModule,
    forwardRef(() => MigrationModule),
    FeatureFlagModule,
  ],
  controllers: [WorkflowController],
  providers: [WorkflowService, WorkflowOptionsRepository, WorkflowRepository],
  exports: [WorkflowOptionsRepository, WorkflowRepository],
})
export class WorkflowModule {}
