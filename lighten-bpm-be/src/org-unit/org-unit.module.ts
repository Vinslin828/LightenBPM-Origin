import { Module, forwardRef } from '@nestjs/common';
import { OrgUnitService } from './org-unit.service';
import { OrgUnitController } from './org-unit.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UserModule } from '../user/user.module';
import { OrgUnitRepository } from './repository/org-unit.repository';
import { FeatureFlagModule } from '../common/feature-flag/feature-flag.module';

@Module({
  imports: [PrismaModule, forwardRef(() => UserModule), FeatureFlagModule],
  controllers: [OrgUnitController],
  providers: [OrgUnitService, OrgUnitRepository],
  exports: [OrgUnitService, OrgUnitRepository],
})
export class OrgUnitModule {}
