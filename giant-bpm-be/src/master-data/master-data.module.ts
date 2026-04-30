import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ScriptExecutionModule } from '../script-execution/script-execution.module';
import { MasterDataController } from './master-data.controller';
import { MasterDataSchemaService } from './master-data-schema.service';
import { MasterDataRecordService } from './master-data-record.service';
import { MasterDataExternalApiService } from './master-data-external-api.service';

@Module({
  imports: [PrismaModule, AuthModule, ScriptExecutionModule],
  controllers: [MasterDataController],
  providers: [
    MasterDataSchemaService,
    MasterDataRecordService,
    MasterDataExternalApiService,
  ],
  exports: [
    MasterDataSchemaService,
    MasterDataRecordService,
    MasterDataExternalApiService,
  ],
})
export class MasterDataModule {}
