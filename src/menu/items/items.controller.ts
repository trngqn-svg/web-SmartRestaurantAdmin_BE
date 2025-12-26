import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ItemsService } from './items.service';
import { CreateMenuItemDto, UpdateMenuItemDto } from './dto/item.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('/api/admin/menu/items')
export class ItemsController {
  constructor(private readonly service: ItemsService) {}

  @Post()
  create(@Body() dto: CreateMenuItemDto) {
    return this.service.create(dto);
  }

  @Get()
  list(@Query() q: any) {
    return this.service.listAdmin(q);
  }

  @Get(':id')
  details(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMenuItemDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.softDelete(id);
  }

  @Post(':id/modifier-groups')
  setModifierGroups(@Param('id') id: string, @Body() body: { groupIds: string[] }) {
    return this.service.setModifierGroups(id, body.groupIds ?? []);
  }
}