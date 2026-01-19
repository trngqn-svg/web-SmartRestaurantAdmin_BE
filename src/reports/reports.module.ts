import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminReportsController } from './admin-reports.controller';
import { ReportsService } from './reports.service';

import { Order, OrderSchema } from '../orders/order.schema';
import { Bill, BillSchema } from '../bills/bill.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Bill.name, schema: BillSchema },
    ]),
  ],
  controllers: [AdminReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
