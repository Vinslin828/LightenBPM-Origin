import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtDecoder } from './jwt-decoder';
import { AuthUser, fromPrisma } from './types/auth-user';
import { ORG_CODE_UNASSIGNED } from '../org-unit/types/org-unit.types';
import { UserService } from '../user/user.service';
import { User } from '../common/types/common.types';
import { IdToken } from './types';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  private readonly userCreationLocks = new Map<string, Promise<User>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly decoder: JwtDecoder,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user?: AuthUser;
      bpmRole?: string;
    }>();
    const authHeader = request.headers['authorization'];
    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing');
    }
    try {
      const decodedToken: IdToken = this.decoder.decode(
        authHeader.replace('Bearer ', ''),
      );

      let user: User | null = await this.userService.findBySub(
        decodedToken.sub,
      );

      if (!user) {
        if (this.userCreationLocks.has(decodedToken.sub)) {
          this.logger.log(
            `User creation for ${decodedToken.sub} is already in progress, waiting...`,
          );
          user = (await this.userCreationLocks.get(decodedToken.sub)) ?? null;
        } else {
          this.logger.log('No prisma user found, creating new user');
          const userCreationPromise =
            this.createUserAndReleaseLock(decodedToken);
          this.userCreationLocks.set(decodedToken.sub, userCreationPromise);
          user = await userCreationPromise;
        }
      }

      const bpmRole = decodedToken['BPM_Role'] as string;
      if (user) {
        request.user = fromPrisma(user, bpmRole);
      } else {
        throw Error(`Failed to Create new user :${decodedToken['sub']}`);
      }

      return true;
    } catch (error) {
      this.logger.error('--- AUTH GUARD ERROR ---');
      this.logger.error(error);
      this.logger.error('--- END AUTH GUARD ERROR ---');
      throw new UnauthorizedException('Authentication failed.');
    }
  }

  private async createUserAndReleaseLock(decodedToken: IdToken): Promise<User> {
    try {
      // Double check if user was created while waiting for the lock
      const existingUser = await this.userService.findBySub(decodedToken.sub);
      if (existingUser) {
        this.logger.log(
          `User ${decodedToken.sub} was created by another request.`,
        );
        return existingUser;
      }

      const unassignedOrg = await this.prisma.orgUnit.findUnique({
        where: { code: ORG_CODE_UNASSIGNED },
        select: { code: true }, // Only select the code field for efficiency
      });

      if (!unassignedOrg) {
        this.logger.error(
          'CRITICAL ERROR: "UNASSIGNED" organization not found. Please ensure seed script has been run.',
        );
        throw new UnauthorizedException(
          'Authentication failed: Missing default organization.',
        );
      }

      const newUser = await this.userService.create(
        {
          code: decodedToken.code ?? decodedToken.sub,
          sub: decodedToken.sub,
          email: decodedToken.email,
          name: decodedToken.name,
          jobGrade: (decodedToken['Job_Grade'] as number) ?? 1,
          defaultOrgCode: unassignedOrg.code,
        },
        0,
      );
      this.logger.log(
        `AUTH: user not exist, created new user: ${JSON.stringify(newUser)}`,
      );
      return newUser;
    } finally {
      this.userCreationLocks.delete(decodedToken.sub);
    }
  }
}
