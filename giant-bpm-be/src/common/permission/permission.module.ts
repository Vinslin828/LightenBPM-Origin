import { Module } from '@nestjs/common';
import { PermissionBuilderService } from './permission-builder.service';

@Module({
  providers: [PermissionBuilderService],
  exports: [PermissionBuilderService],
})
export class PermissionModule {}
