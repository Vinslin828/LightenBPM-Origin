import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { SqsService } from './sqs.service';

@Module({
  imports: [ConfigModule],
  providers: [NotificationService, SqsService],
  exports: [NotificationService],
})
export class NotificationModule {}
