import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Bill, BillDocument } from "../bills/bill.schema";
import { Order, OrderDocument } from "../orders/order.schema";
import { TZ, getTodayRange, getThisWeekRange, daysBetweenInclusive } from "./utils/dashboard-time.util";

type RecentOrderRow = {
  orderId: string;
  tableNumber: string;
  submittedAt?: string;
  totalCents: number;
  status: string;
  itemsCount: number;
};

@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectModel(Bill.name) private readonly billModel: Model<BillDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
  ) {}

  async overview(args: { restaurantId: string }) {
    const { restaurantId } = args;

    const today = getTodayRange();
    const week = getThisWeekRange();

    const [
      todayRevenue,
      todayOrdersServed,
      todayTablesServing,
      todayAvgPrep,
      todayTopItems,
      todayRecentOrders,
      weekRevenueSeries,
    ] = await Promise.all([
      this.sumRevenuePaidBills({ restaurantId, from: today.from, to: today.to }),
      this.countOrdersServed({ restaurantId, from: today.from, to: today.to }),
      this.countTablesServing({ restaurantId }),
      this.avgPrepTimeToday({ restaurantId, from: today.from, to: today.to }),
      this.topItemsTodayByOrderCount({ restaurantId, from: today.from, to: today.to }),
      this.recentOrdersToday({ restaurantId, from: today.from, to: today.to, limit: 10 }),
      this.weekRevenueByDay({ restaurantId, from: week.from, to: week.to, fromDT: week.fromDT, toDT: week.toDT }),
    ]);

    return {
      today: {
        revenueCents: todayRevenue,
        ordersServed: todayOrdersServed,
        tablesServing: todayTablesServing,
        avgPrepTimeSeconds: todayAvgPrep.avgPrepTimeSeconds,
        avgPrepSampleSize: todayAvgPrep.sampleSize,
        topItems: todayTopItems,
        recentOrders: todayRecentOrders,
      },
      week: {
        revenueSeries: weekRevenueSeries,
      },
    };
  }

  private async sumRevenuePaidBills(args: { restaurantId: string; from: Date; to: Date }) {
    const { restaurantId, from, to } = args;
    const res = await this.billModel.aggregate([
      { $match: { restaurantId, status: "PAID", paidAt: { $gte: from, $lt: to } } },
      { $group: { _id: null, revenueCents: { $sum: "$totalCents" } } },
    ]);
    return res?.[0]?.revenueCents ?? 0;
  }

  private async countOrdersServed(args: { restaurantId: string; from: Date; to: Date }) {
    const { restaurantId, from, to } = args;
    return this.orderModel.countDocuments({
      restaurantId,
      status: "served",
      submittedAt: { $gte: from, $lt: to },
    });
  }

  private async countTablesServing(args: { restaurantId: string }) {
    const { restaurantId } = args;
    const activeStatuses = ["pending", "accepted", "preparing", "ready", "ready_to_service"];
    const res = await this.orderModel.aggregate([
      { $match: { restaurantId, status: { $in: activeStatuses } } },
      { $group: { _id: "$tableId" } },
      { $count: "tables" },
    ]);
    return res?.[0]?.tables ?? 0;
  }

  private async avgPrepTimeToday(args: { restaurantId: string; from: Date; to: Date }) {
    const { restaurantId, from, to } = args;

    const res = await this.orderModel.aggregate([
      { $match: { restaurantId, status: "served", submittedAt: { $gte: from, $lt: to } } },
      {
        $project: {
          validLines: {
            $filter: {
              input: "$items",
              as: "i",
              cond: {
                $and: [
                  { $ne: ["$$i.status", "cancelled"] },
                  { $ne: ["$$i.startedAt", null] },
                  { $ne: ["$$i.readyAt", null] },
                ],
              },
            },
          },
        },
      },
      { $project: { minStarted: { $min: "$validLines.startedAt" }, maxReady: { $max: "$validLines.readyAt" } } },
      {
        $project: {
          prepMs: {
            $cond: [
              { $and: [{ $ne: ["$minStarted", null] }, { $ne: ["$maxReady", null] }] },
              { $subtract: ["$maxReady", "$minStarted"] },
              null,
            ],
          },
        },
      },
      { $match: { prepMs: { $ne: null } } },
      { $group: { _id: null, avgPrepMs: { $avg: "$prepMs" }, sampleSize: { $sum: 1 } } },
    ]);

    const avgPrepMs = res?.[0]?.avgPrepMs ?? null;
    const sampleSize = res?.[0]?.sampleSize ?? 0;

    return {
      avgPrepTimeSeconds: avgPrepMs == null ? null : avgPrepMs / 1000,
      sampleSize,
    };
  }

  private async topItemsTodayByOrderCount(args: { restaurantId: string; from: Date; to: Date }) {
    const { restaurantId, from, to } = args;

    const raw = await this.orderModel.aggregate([
      { $match: { restaurantId, status: "served", submittedAt: { $gte: from, $lt: to } } },
      { $unwind: "$items" },
      { $match: { "items.status": { $ne: "cancelled" } } },
      {
        $group: {
          _id: "$items.itemId",
          name: { $first: "$items.nameSnapshot" },
          orderIds: { $addToSet: "$_id" },
        },
      },
      { $project: { _id: 1, name: 1, orderCount: { $size: "$orderIds" } } },
      { $sort: { orderCount: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, itemId: { $toString: "$_id" }, name: 1, orderCount: 1 } },
    ]);

    return raw as Array<{ itemId: string; name: string; orderCount: number }>;
  }

  private async recentOrdersToday(args: { restaurantId: string; from: Date; to: Date; limit: number }) {
    const { restaurantId, from, to, limit } = args;

    const xs = await this.orderModel
      .find({
        restaurantId,
        submittedAt: { $gte: from, $lt: to },
      })
      .sort({ submittedAt: -1 })
      .limit(limit)
      .lean();

    return xs.map(
      (o: any): RecentOrderRow => ({
        orderId: String(o._id),
        tableNumber: o.tableNumberSnapshot,
        submittedAt: o.submittedAt ? new Date(o.submittedAt).toISOString() : undefined,
        totalCents: o.totalCents ?? 0,
        status: o.status,
        itemsCount: (o.items ?? []).length,
      }),
    );
  }

  private async weekRevenueByDay(args: {
    restaurantId: string;
    from: Date;
    to: Date;
    fromDT: any;
    toDT: any;
  }) {
    const { restaurantId, from, to, fromDT, toDT } = args;

    const raw = await this.billModel.aggregate([
      { $match: { restaurantId, status: "PAID", paidAt: { $gte: from, $lt: to } } },
      {
        $project: {
          amount: "$totalCents",
          day: {
            $dateToString: {
              date: "$paidAt",
              format: "%Y-%m-%d",
              timezone: TZ,
            },
          },
        },
      },
      { $group: { _id: "$day", revenueCents: { $sum: "$amount" } } },
      { $sort: { _id: 1 } },
    ]);

    const keys = daysBetweenInclusive(fromDT, toDT);
    const map = new Map<string, number>();
    raw.forEach((x: any) => map.set(x._id, x.revenueCents));

    return keys.map((k) => ({ key: k, revenueCents: map.get(k) ?? 0 }));
  }
}
