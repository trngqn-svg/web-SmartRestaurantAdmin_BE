import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, Req } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { ListAccountsDto } from './dto/list-accounts.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ForbiddenException } from '@nestjs/common';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('api/admin/accounts')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  list(@Query() q: ListAccountsDto) {
    return this.accounts.list(q);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateAccountDto) {
    const callerRole = req.user?.role as string;

    if (dto.role === 'ADMIN' || dto.role === 'SUPER_ADMIN') {
      if (callerRole !== 'SUPER_ADMIN') {
        throw new ForbiddenException('Only SUPER_ADMIN can create ADMIN accounts');
      }
    }

    return this.accounts.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAccountDto) {
    return this.accounts.update(id, dto);
  }

  @Patch('/disable/:id')
  disable(@Param('id') id: string) {
    return this.accounts.disable(id);
  }

  @Patch('/enable/:id')
  enable(@Param('id') id: string) {
    return this.accounts.enable(id);
  }
}
