import { Controller, Get, Query } from '@nestjs/common';
import { AdminOrdersService } from './admin-orders.service';
import { AdminListOrdersQueryDto } from './dto/admin-list-orders.dto';
import { RESTAURANT_ID } from '../config/restaurant.config';

@Controller('/api/admin/orders')
export class AdminOrdersController {
  constructor(private readonly svc: AdminOrdersService) {}

  @Get()
  async list(@Query() q: AdminListOrdersQueryDto) {
    return this.svc.list({
      restaurantId: RESTAURANT_ID,
      status: q.status || undefined,
      tableId: q.tableId || undefined,
      date: q.date || 'today',
      q: q.q || undefined,
      page: q.page ?? 1,
      pageSize: q.pageSize ?? 10,
    });
  }
}
