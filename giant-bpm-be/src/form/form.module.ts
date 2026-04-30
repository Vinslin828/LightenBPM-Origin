import { Module, forwardRef } from '@nestjs/common';
import { FormController } from './form.controller';
import { FormService } from './form.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UserModule } from '../user/user.module';
import { FormWorkflowBindingModule } from '../form-workflow-binding/form-workflow-binding.module';
import { FormRepository } from './repositories/form.repository';
import { FlowEngineModule } from '../flow-engine/flow-engine.module';
import { PermissionModule } from '../common/permission/permission.module';
import { MigrationModule } from '../migration/migration.module';
import { FeatureFlagModule } from '../common/feature-flag/feature-flag.module';

@Module({
  imports: [
    PrismaModule,
    UserModule,
    FormWorkflowBindingModule,
    forwardRef(() => FlowEngineModule),
    PermissionModule,
    forwardRef(() => MigrationModule),
    FeatureFlagModule,
  ],
  controllers: [FormController], //, FormLabelsController],
  providers: [FormService, FormRepository],
  exports: [FormService, FormRepository],
})
export class FormModule {}
