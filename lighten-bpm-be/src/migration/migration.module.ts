import { Module, forwardRef } from '@nestjs/common';
import { MigrationService } from './migration.service';
import { MigrationController } from './migration.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { FormModule } from '../form/form.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { TagModule } from '../tag/tag.module';
import { ValidationRegistryModule } from '../validation-registry/validation-registry.module';
import { UserModule } from '../user/user.module';
import { OrgUnitModule } from '../org-unit/org-unit.module';
import { FormWorkflowBindingModule } from '../form-workflow-binding/form-workflow-binding.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => FormModule),
    forwardRef(() => WorkflowModule),
    TagModule,
    ValidationRegistryModule,
    UserModule,
    OrgUnitModule,
    FormWorkflowBindingModule,
  ],
  controllers: [MigrationController],
  providers: [MigrationService],
  exports: [MigrationService],
})
export class MigrationModule {}
