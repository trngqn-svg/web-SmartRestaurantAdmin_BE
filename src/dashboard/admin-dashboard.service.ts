import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Bill, BillDocument } from "../bills/bill.schema";
import { Order, OrderDocument } from "../orders/order.schema";
import { TZ, getTodayRange, getYesterdayRange, getThisWeekRange, daysBetweenInclusive } from "./utils/dashboard-time.util";
import { Table, TableDocument } from "../tables/table.schema";

type RecentOrderRow = {
  orderId: string;
  tableNumber: string;
  submittedAt?: string;
  totalCents: number;
  status: string;
  itemsSummary: string;
};

@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectModel(Bill.name) private readonly billModel: Model<BillDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Table.name) private readonly tableModel: Model<TableDocument>,
  ) {}

  async overview(args: { restaurantId: string }) {
    const { restaurantId } = args;

    const today = getTodayRange();
    const yesterday = getYesterdayRange();
    const week = getThisWeekRange();

    const [
      totalTables,
      todayRevenue,
      yRevenue,
      todayOrdersServed,
      yOrdersServed,
      occupiedTables,
      todayAvgPrep,
      todayTopItems,
      todayRecentOrders,
      weekRevenueSeries,
    ] = await Promise.all([
      this.tableModel.countDocuments(),
      this.sumRevenuePaidBills({ restaurantId, from: today.from, to: today.to }),
      this.sumRevenuePaidBills({ restaurantId, from: yesterday.from, to: yesterday.to }),
      this.countOrdersServed({ restaurantId, from: today.from, to: today.to }),
      this.countOrdersServed({ restaurantId, from: yesterday.from, to: yesterday.to }),
      this.countTablesServing({ restaurantId }),
      this.avgPrepTimeToday({ restaurantId, from: today.from, to: today.to }),
      this.topItemsToday({ restaurantId, from: today.from, to: today.to }),
      this.recentOrdersToday({ restaurantId, from: today.from, to: today.to, limit: 10 }),
      this.weekRevenueByDay({ restaurantId, from: week.from, to: week.to, fromDT: week.fromDT, toDT: week.toDT }),
    ]);

    return {
      today: {
        revenueCents: todayRevenue,
        revenueDeltaCents: todayRevenue - yRevenue,
        ordersServed: todayOrdersServed,
        ordersServedDelta: todayOrdersServed - yOrdersServed,
        occupiedTables,
        totalTables,
        avgPrepTimeSeconds: todayAvgPrep.avgPrepTimeSeconds,
        avgPrepSampleSize: todayAvgPrep.sampleSize,
        topItems: todayTopItems,
        recentOrders: todayRecentOrders,
      },
      yesterday: {
        revenueCents: yRevenue,
        ordersServed: yOrdersServed,
      },
      week: { revenueSeries: weekRevenueSeries },
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

  private async topItemsToday(args: { restaurantId: string; from: Date; to: Date }) {
    const { restaurantId, from, to } = args;

    const raw = await this.orderModel.aggregate([
      { $match: { restaurantId, status: "served", submittedAt: { $gte: from, $lt: to } } },
      { $unwind: "$items" },
      { $match: { "items.status": { $ne: "cancelled" } } },
      {
        $addFields: {
          __qty: { $ifNull: ["$items.quantity", { $ifNull: ["$items.qty", 1] }] },
          __unit: {
            $ifNull: [
              "$items.unitPriceCentsSnapshot",
              { $ifNull: ["$items.unitPriceCents", { $ifNull: ["$items.priceCentsSnapshot", 0] }] },
            ],
          },
          __lineTotal: {
            $ifNull: [
              "$items.lineTotalCents",
              { $multiply: [
                { $ifNull: ["$items.quantity", { $ifNull: ["$items.qty", 1] }] },
                {
                  $ifNull: [
                    "$items.unitPriceCentsSnapshot",
                    { $ifNull: ["$items.unitPriceCents", { $ifNull: ["$items.priceCentsSnapshot", 0] }] },
                  ],
                },
              ]},
            ],
          },
        },
      },
      {
        $group: {
          _id: "$items.itemId",
          name: { $first: "$items.nameSnapshot" },
          orderIds: { $addToSet: "$_id" },
          qty: { $sum: "$__qty" },
          revenueCents: { $sum: "$__lineTotal" },
        },
      },
      {
        $project: {
          _id: 0,
          itemId: { $toString: "$_id" },
          name: 1,
          orderCount: { $size: "$orderIds" },
          qty: 1,
          revenueCents: 1,
        },
      },
      { $sort: { revenueCents: -1, qty: -1, orderCount: -1 } },
      { $limit: 5 },
    ]);

    return raw as Array<{ itemId: string; name: string; orderCount: number; qty: number; revenueCents: number }>;
  }

  private async recentOrdersToday(args: { restaurantId: string; from: Date; to: Date; limit: number }) {
    const { restaurantId, from, to, limit } = args;

    const xs = await this.orderModel
      .find({ restaurantId, submittedAt: { $gte: from, $lt: to } })
      .sort({ submittedAt: -1 })
      .limit(limit)
      .lean();

    return xs.map((o: any): RecentOrderRow => {
      const parts = (o.items ?? [])
        .slice(0, 4)
        .map((it: any) => {
          const qty = it.quantity ?? it.qty ?? 1;
          const name = it.nameSnapshot ?? it.name ?? "Item";
          return `${qty}x ${name}`;
        });
      const more = (o.items?.length ?? 0) > 4 ? ` +${(o.items.length - 4)} more` : "";

      return {
        orderId: String(o._id),
        tableNumber: o.tableNumberSnapshot,
        submittedAt: o.submittedAt ? new Date(o.submittedAt).toISOString() : undefined,
        totalCents: o.totalCents ?? 0,
        status: o.status,
        itemsSummary: parts.join(", ") + more,
      };
    });
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
