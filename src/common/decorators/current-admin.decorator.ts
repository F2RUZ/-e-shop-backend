import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Admin } from '../../auth/entities/admin.entity';

/**
 * Tokendan aniqlangan adminni controller ichida olish uchun.
 *
 *   findMe(@CurrentAdmin() admin: Admin) { ... }
 *   changePassword(@CurrentAdmin('id') adminId: number) { ... }
 */
export const CurrentAdmin = createParamDecorator(
  (field: keyof Admin | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<{ user: Admin }>();
    return field ? request.user?.[field] : request.user;
  },
);
