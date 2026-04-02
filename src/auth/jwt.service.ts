import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { sign, verify } from 'jsonwebtoken';

import { AdminUser } from '../entities/admin-user.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
}

@Injectable()
export class JwtService {
  private readonly logger = new Logger(JwtService.name);

  constructor(
    @InjectRepository(AdminUser)
    private adminUserRepository: Repository<AdminUser>,
    private configService: ConfigService,
  ) {}

  async validateAdmin(email: string, password: string): Promise<AdminUser | null> {
    const admin = await this.adminUserRepository.findOne({
      where: { email, is_active: true },
    });

    if (!admin) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
    if (!isPasswordValid) {
      return null;
    }

    await this.adminUserRepository.update(admin.user_id, {
      last_login_at: new Date(),
    });

    return admin;
  }

  generateToken(admin: AdminUser): string {
    const payload: JwtPayload = {
      sub: admin.user_id,
      email: admin.email,
      role: admin.role,
      iat: Math.floor(Date.now() / 1000),
    };

    const secret = this.configService.get<string>('JWT_SECRET');
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '1h') as any;

    return sign(payload, secret, { expiresIn });
  }

  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      const payload = verify(token, secret) as JwtPayload;

      const admin = await this.adminUserRepository.findOne({
        where: { user_id: payload.sub, is_active: true },
      });

      if (!admin) {
        throw new UnauthorizedException('Invalid token');
      }

      return payload;
    } catch (error) {
      this.logger.error(`JWT verification failed: ${error.message}`);
      throw new UnauthorizedException('Invalid token');
    }
  }

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }
}
