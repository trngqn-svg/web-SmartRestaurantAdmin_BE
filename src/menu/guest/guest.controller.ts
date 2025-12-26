import { Controller, Get, Query } from '@nestjs/common';
import { GuestMenuService } from './guest.service';

@Controller('/api/menu')
export class GuestMenuController {
  constructor(private readonly service: GuestMenuService) {}

  @Get()
  load(@Query() q: any) {
    return this.service.load(q);
  }
}
