import { Module } from '@nestjs/common';
import { ScriptExecutionController } from './script-execution.controller';
import { ScriptExecutionService } from './script-execution.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [PrismaModule, AuthModule, UserModule],
  controllers: [ScriptExecutionController],
  providers: [ScriptExecutionService],
  exports: [ScriptExecutionService],
})
export class ScriptExecutionModule {}
