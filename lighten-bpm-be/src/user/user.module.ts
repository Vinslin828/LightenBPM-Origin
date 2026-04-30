import { Global, Module, forwardRef } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UserRepository } from './repository/user.repository';
import { OrgUnitModule } from '../org-unit/org-unit.module';
import { FeatureFlagModule } from '../common/feature-flag/feature-flag.module';

@Global()
@Module({
  imports: [PrismaModule, forwardRef(() => OrgUnitModule), FeatureFlagModule],
  controllers: [UserController],
  providers: [UserService, UserRepository],
  exports: [UserService, UserRepository],
})
export class UserModule {}
