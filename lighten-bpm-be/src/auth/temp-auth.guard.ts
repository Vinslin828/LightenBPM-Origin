import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserDto } from '../user/dto/user.dto';
import { userInclude } from '../user/repository/user.repository';

/**
 * @deprecated
 * Remove Temp Auth Guard implementation, replaced by formal AuthGuard idtoken implementatino
 */
@Injectable()
export class TempAuthGuard implements CanActivate {
  private readonly logger = new Logger(TempAuthGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: { 'x-user-id'?: string | string[] };
      user?: UserDto;
    }>();
    const headerUserId = request.headers['x-user-id'];
    this.logger.debug(`Request Headers: ${JSON.stringify(request.headers)}`);

    if (!headerUserId) {
      // throw new UnauthorizedException('X-User-ID header is missing');
      return true; // Allow unauthenticated access for testing purposes
    }

    const userId = Array.isArray(headerUserId) ? headerUserId[0] : headerUserId;

    const user = await this.prisma.user.findUnique({
      where: { id: +userId },
      include: userInclude,
    });

    if (!user) {
      throw new UnauthorizedException(`User with ID ${userId} not found`);
    }

    request.user = UserDto.fromPrisma(
      user as Parameters<typeof UserDto.fromPrisma>[0],
    );
    return true;
  }
}
