import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AdminDashboardController } from "./admin-dashboard.controller";
import { AdminDashboardService } from "./admin-dashboard.service";

import { Order, OrderSchema } from "../orders/order.schema";
import { Bill, BillSchema } from "../bills/bill.schema";
import { Table, TableSchema } from "../tables/table.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Bill.name, schema: BillSchema },
      { name: Table.name, schema: TableSchema },
    ]),
  ],
  controllers: [AdminDashboardController],
  providers: [AdminDashboardService],
})
export class DashboardModule {}
