import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { AccountsService } from '../accounts/accounts.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(username: string, password: string) {
    const exists = await this.accountsService.findByUsername(username);
    if (exists) throw new BadRequestException('Username already exists');
    
    const admin = await this.accountsService.create({
      username,
      password,
      role: 'SUPER_ADMIN',
    });

    const payload = {
      sub: (admin as any)._id?.toString?.() ?? (admin as any).id,
      username: admin.username,
      role: (admin as any).role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get('ACCESS_TOKEN_EXPIRE'),
    });

    const refreshToken = this.jwtService.sign(
      { sub: payload.sub },
      {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('REFRESH_TOKEN_EXPIRE'),
      },
    );

    return { accessToken, refreshToken };
  }

  async login(username: string, password: string) {
    const acc = await this.accountsService.findByUsername(username);
    if (!acc) throw new BadRequestException('Invalid credentials');
    if ((acc as any).status === 'DISABLED') {
      throw new UnauthorizedException('Account disabled');
    }

    if ((acc as any).role !== 'ADMIN' && (acc as any).role !== 'SUPER_ADMIN') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const match = await bcrypt.compare(password, (acc as any).password);
    if (!match) throw new BadRequestException('Invalid credentials');

    const payload = {
      sub: (acc as any)._id.toString(),
      username: (acc as any).username,
      role: (acc as any).role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get('ACCESS_TOKEN_EXPIRE'),
    });

    const refreshToken = this.jwtService.sign(
      { sub: payload.sub },
      {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('REFRESH_TOKEN_EXPIRE'),
      },
    );

    return { accessToken, refreshToken };
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(
        refreshToken,
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        },
      );

      const acc = await this.accountsService.findById(payload.sub);
      if (!acc) throw new UnauthorizedException('Unauthorized');
      if ((acc as any).status === 'DISABLED') {
        throw new UnauthorizedException('Account disabled');
      }

      const accessToken = this.jwtService.sign(
        {
          sub: payload.sub,
          username: (acc as any).username,
          role: (acc as any).role,
        },
        {
          secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
          expiresIn: this.configService.get('ACCESS_TOKEN_EXPIRE'),
        },
      );

      return { accessToken };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
