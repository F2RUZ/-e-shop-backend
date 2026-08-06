import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { Admin } from '../entities/admin.entity';

export interface JwtPayload {
  sub: number; // admin id
  login: string;
}

/**
 * Har bir himoyalangan so'rovda token tekshiriladi va admin bazadan olinadi.
 * Natija `request.user` ichiga tushadi (@CurrentAdmin() orqali olinadi).
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    @InjectRepository(Admin) private readonly adminRepository: Repository<Admin>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<Admin> {
    const admin = await this.adminRepository.findOne({ where: { id: payload.sub } });

    if (!admin) {
      throw new UnauthorizedException(
        'Token egasi topilmadi (admin o‘chirilgan bo‘lishi mumkin). Qaytadan tizimga kiring.',
      );
    }

    return admin;
  }
}
