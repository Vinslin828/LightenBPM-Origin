import { Module } from '@nestjs/common';
import { FormWorkflowBindingController } from './form-workflow-binding.controller';
import { FormWorkflowBindingService } from './form-workflow-binding.service';
import { FormWorkflowBindingRepository } from './repositories/form-workflow-binding.repository';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FormWorkflowBindingController],
  providers: [FormWorkflowBindingService, FormWorkflowBindingRepository],
  exports: [FormWorkflowBindingService, FormWorkflowBindingRepository],
})
export class FormWorkflowBindingModule {}
