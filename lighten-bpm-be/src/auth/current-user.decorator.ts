import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserDto } from 'src/user/dto/user.dto';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserDto => {
    const request = ctx.switchToHttp().getRequest<{ user?: UserDto }>();
    return request.user as UserDto;
  },
);
