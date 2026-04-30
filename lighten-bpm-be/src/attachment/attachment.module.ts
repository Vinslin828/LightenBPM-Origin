import { Module, forwardRef } from '@nestjs/common';
import { AttachmentService } from './attachment.service';
import { AttachmentController } from './attachment.controller';
import { AttachmentAdminController } from './attachment-admin.controller';
import { DraftAttachmentController } from './draft-attachment.controller';
import { S3Service } from './s3.service';
import { AttachmentRepository } from './repositories/attachment.repository';
import { InstanceModule } from '../instance/instance.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { PermissionModule } from '../common/permission/permission.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    PermissionModule,
    forwardRef(() => InstanceModule),
  ],
  controllers: [
    AttachmentController,
    AttachmentAdminController,
    DraftAttachmentController,
  ],
  providers: [AttachmentService, S3Service, AttachmentRepository],
  exports: [AttachmentService],
})
export class AttachmentModule {}
