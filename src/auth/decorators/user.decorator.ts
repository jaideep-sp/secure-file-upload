import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser as AuthUserType } from '../strategies/jwt.strategy';

export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthUserType => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthUserType; 
  },
);
