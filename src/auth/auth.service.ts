import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AdminsService } from '../admins/admins.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly adminsService: AdminsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(username: string, password: string) {
    const exists = await this.adminsService.findByUsername(username);
    if (exists) {
      throw new BadRequestException('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await this.adminsService.create({
      username,
      password: hashedPassword,
      role: 'ADMIN',
    });

    const payload = {
      sub: admin._id.toString(),
      role: admin.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get('ACCESS_TOKEN_EXPIRE'),
    });

    const refreshToken = this.jwtService.sign(
      { sub: admin._id.toString() },
      {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('REFRESH_TOKEN_EXPIRE'),
      },
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  async login(username: string, password: string) {
    const admin = await this.adminsService.findByUsername(username);
    if (!admin) throw new BadRequestException('Invalid credentials');

    const match = await bcrypt.compare(password, admin.password);
    if (!match) throw new BadRequestException('Invalid credentials');

    const payload = {
      sub: admin._id.toString(),
      role: admin.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get('ACCESS_TOKEN_EXPIRE'),
    });

    const refreshToken = this.jwtService.sign(
      { sub: admin._id.toString() },
      {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('REFRESH_TOKEN_EXPIRE'),
      },
    );

    return { accessToken, refreshToken };
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
      }>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const admin = await this.adminsService.findById(payload.sub);
      if (!admin) throw new UnauthorizedException('Unauthoried')

      const accessToken = this.jwtService.sign(
        { sub: payload.sub, role: admin.role },
        {
          secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
          expiresIn: this.configService.get('ACCESS_TOKEN_EXPIRE'),
        },
      );

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
