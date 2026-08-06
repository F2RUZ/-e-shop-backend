import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

/**
 * Global guard: loyihadagi BARCHA endpointlar token talab qiladi.
 * Faqat @Public() bilan belgilanganlari ochiq (masalan: login).
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    return super.canActivate(context);
  }

  handleRequest<TAdmin>(err: Error | null, admin: TAdmin, info: Error | undefined): TAdmin {
    if (err) throw err;

    if (!admin) {
      throw new UnauthorizedException(this.explain(info));
    }

    return admin;
  }

  /** Xatolik sababini aniq o'zbekcha matn bilan tushuntiradi. */
  private explain(info: Error | undefined): string {
    switch (info?.name) {
      case 'TokenExpiredError':
        return 'Token muddati tugagan. /api/auth/login orqali qaytadan kiring.';
      case 'JsonWebTokenError':
        return 'Token noto‘g‘ri. Uni "Authorization: Bearer <token>" ko‘rinishida yuboring.';
      default:
        return 'Token yuborilmadi. Avval /api/auth/login orqali tizimga kiring va tokenni Swagger’dagi "Authorize" tugmasiga qo‘ying.';
    }
  }
}
