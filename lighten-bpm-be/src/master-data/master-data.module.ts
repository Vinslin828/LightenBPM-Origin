import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ScriptExecutionModule } from '../script-execution/script-execution.module';
import { OrgUnitModule } from '../org-unit/org-unit.module';
import { MasterDataController } from './master-data.controller';
import { MasterDataSchemaService } from './master-data-schema.service';
import { MasterDataRecordService } from './master-data-record.service';
import { MasterDataExternalApiService } from './master-data-external-api.service';
import { MasterDataMembershipService } from './master-data-membership.service';

@Module({
  imports: [PrismaModule, AuthModule, ScriptExecutionModule, forwardRef(() => OrgUnitModule)],
  controllers: [MasterDataController],
  providers: [
    MasterDataSchemaService,
    MasterDataRecordService,
    MasterDataExternalApiService,
    MasterDataMembershipService,
  ],
  exports: [
    MasterDataSchemaService,
    MasterDataRecordService,
    MasterDataExternalApiService,
    MasterDataMembershipService,
  ],
})
export class MasterDataModule {}
