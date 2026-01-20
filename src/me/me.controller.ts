import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { MeService } from './me.service';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

type AuthedRequest = Request & {
  user?: {
    id: string;
    username: string;
    role: string;
  };
};

@UseGuards(JwtAuthGuard)
@Controller('/api/me')
export class MeController {
  constructor(private readonly svc: MeService) {}

  @Get('profile')
  async get(@Req() req: AuthedRequest) {
    const accountId = req.user?.id;
    return this.svc.getMyProfile(accountId!);
  }

  @Patch('profile')
  async patch(@Req() req: AuthedRequest, @Body() dto: UpdateMyProfileDto) {
    const accountId = req.user?.id;
    return this.svc.updateMyProfile(accountId!, dto);
  }
}
