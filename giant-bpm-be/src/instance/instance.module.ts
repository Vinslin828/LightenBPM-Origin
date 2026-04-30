import { Module, forwardRef } from '@nestjs/common';
import { ApplicationController } from './application.controller';
import { ApplicationService } from './application.service';
import { WorkflowNodeRepository } from './repositories/workflow-node.repository';
import { WorkflowInstanceRepository } from './repositories/workflow-instance.repository';
import { FormInstanceRepository } from './repositories/form-instance.repository';
import { ApprovalTaskRepository } from './repositories/approval-task.repository';
import { WorkflowCommentRepository } from './repositories/workflow-comment.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { FlowEngineModule } from '../flow-engine/flow-engine.module';
import { ApplicationRepository } from './repositories/application.repository';
import { FormWorkflowBindingModule } from '../form-workflow-binding/form-workflow-binding.module';
import { InstanceDataService } from './instance-data.service';
import { PermissionModule } from '../common/permission/permission.module';
import { AttachmentModule } from '../attachment/attachment.module';

import { FormInstanceDataRepository } from './repositories/form-instance-data.repository';
import { WorkflowEventRepository } from './repositories/workflow-event.repository';
import { InstanceShareRepository } from './repositories/instance-share.repository';
import { FeatureFlagModule } from '../common/feature-flag/feature-flag.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => FlowEngineModule),
    FormWorkflowBindingModule,
    PermissionModule,
    forwardRef(() => AttachmentModule),
    FeatureFlagModule,
  ],
  controllers: [ApplicationController],
  providers: [
    ApplicationService,
    InstanceDataService,
    ApplicationRepository,
    WorkflowNodeRepository,
    WorkflowInstanceRepository,
    FormInstanceRepository,
    ApprovalTaskRepository,
    WorkflowCommentRepository,
    FormInstanceDataRepository,
    WorkflowEventRepository,
    InstanceShareRepository,
  ],
  exports: [
    ApplicationService,
    InstanceDataService,
    ApplicationRepository,
    WorkflowNodeRepository,
    WorkflowInstanceRepository,
    FormInstanceRepository,
    ApprovalTaskRepository,
    WorkflowCommentRepository,
    FormInstanceDataRepository,
    WorkflowEventRepository,
    InstanceShareRepository,
  ],
})
export class InstanceModule {}
