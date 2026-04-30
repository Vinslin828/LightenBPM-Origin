import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard';
import { JwtDecoder } from './jwt-decoder';
import { PrismaModule } from '../prisma/prisma.module';
import { UserModule } from '../user/user.module';

@Global()
@Module({
  imports: [JwtModule.register({}), PrismaModule, UserModule],
  providers: [AuthGuard, JwtDecoder],
  exports: [AuthGuard, JwtDecoder],
})
export class AuthModule {}
