import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthyController } from './healthy/healthy.controller';
import { PrismaService } from './prisma/prisma.service';
import { FormModule } from './form/form.module';
import { WorkflowModule } from './workflow/workflow.module';
import { InstanceModule } from './instance/instance.module';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { OrgUnitModule } from './org-unit/org-unit.module';
import { VersionModule } from './version/version.module';
import { TagModule } from './tag/tag.module';
import { AuthModule } from './auth/auth.module';
import { FormWorkflowBindingModule } from './form-workflow-binding/form-workflow-binding.module';
import { ValidationRegistryModule } from './validation-registry/validation-registry.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { MigrationModule } from './migration/migration.module';
import { MasterDataModule } from './master-data/master-data.module';
import { ScriptExecutionModule } from './script-execution/script-execution.module';
import { AttachmentModule } from './attachment/attachment.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TerminusModule,
    FormModule,
    WorkflowModule,
    FormWorkflowBindingModule,
    InstanceModule,
    UserModule,
    PrismaModule,
    OrgUnitModule,
    VersionModule,
    TagModule,
    AuthModule,
    ValidationRegistryModule,
    MigrationModule,
    MasterDataModule,
    ScriptExecutionModule,
    AttachmentModule,
  ],
  controllers: [AppController, HealthyController],
  providers: [AppService, PrismaService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
