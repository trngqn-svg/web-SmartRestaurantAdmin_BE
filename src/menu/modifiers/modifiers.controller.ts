import { Body, Controller, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ModifiersService } from './modifiers.service';
import { CreateModifierGroupDto, CreateModifierOptionDto } from './dto/modifiers.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('/api/admin/menu')
export class ModifiersController {
  constructor(private readonly service: ModifiersService) {}

  @Post('modifier-groups')
  createGroup(@Body() dto: CreateModifierGroupDto) {
    return this.service.createGroup(dto);
  }

  @Put('modifier-groups/:id')
  updateGroup(@Param('id') id: string, @Body() dto: Partial<CreateModifierGroupDto>) {
    return this.service.updateGroup(id, dto);
  }

  @Post('modifier-groups/:id/options')
  createOption(@Param('id') groupId: string, @Body() dto: Omit<CreateModifierOptionDto, 'groupId'>) {
    return this.service.createOption({ ...dto, groupId });
  }

  @Put('modifier-options/:id')
  updateOption(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateOption(id, dto);
  }
}