// src/modules/reports/reports.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Bill, BillDocument } from '../bills/bill.schema'; // chỉnh path theo project bạn
import { Order, OrderDocument } from '../orders/order.schema'; // chỉnh path theo project bạn
import { DateTime } from 'luxon';
import { TZ, getRange, daysBetweenInclusive, isoWeeksInMonth } from './utils/report-time.util';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Bill.name) private readonly billModel: Model<BillDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
  ) {}

  async overview(args: { restaurantId: string; range: 'week' | 'month'; anchorDate?: string }) {
    const { restaurantId, range, anchorDate } = args;
    const r = getRange(range, anchorDate);

    const from = r.from;
    const to = r.to;

    // Run aggregates in parallel
    const [
      revenueTotal,
      revenueSeries,
      ordersAgg,
      prepAgg,
      peakHoursAgg,
      topItemsAgg,
    ] = await Promise.all([
      this.totalRevenueByBills({ restaurantId, from, to }),
      range === 'week'
        ? this.revenueByDayOfWeek({ restaurantId, from, to, isoStart: (r as any).isoStart, isoEndExclusive: (r as any).isoEndExclusive })
        : this.revenueByIsoWeekInMonth({ restaurantId, from, to, monthStart: (r as any).monthStart }),
      this.ordersAndAov({ restaurantId, from, to }),
      this.avgPrepTime({ restaurantId, from, to }),
      this.peakHours({ restaurantId, from, to }),
      this.topItems({ restaurantId, from, to }),
    ]);

    const totals = {
      revenueCents: revenueTotal,
      ordersServed: ordersAgg.ordersServed,
      avgOrderValueCents: ordersAgg.avgOrderValueCents,
      avgPrepTimeSeconds: prepAgg.avgPrepTimeSeconds,
      avgPrepSampleSize: prepAgg.sampleSize,
    };

    return {
      range,
      from,
      to,
      totals,
      revenueSeries,
      peakHours: peakHoursAgg,
      topItems: topItemsAgg,
    };
  }

  private async totalRevenueByBills(args: { restaurantId: string; from: Date; to: Date }) {
    const { restaurantId, from, to } = args;
    const res = await this.billModel.aggregate([
      {
        $match: {
          restaurantId,
          status: 'PAID',
          paidAt: { $gte: from, $lt: to },
        },
      },
      { $group: { _id: null, revenueCents: { $sum: '$totalCents' } } },
    ]);
    return res?.[0]?.revenueCents ?? 0;
  }

  // WEEK: group by date (YYYY-MM-DD) within week (Mon..Sun)
  private async revenueByDayOfWeek(args: {
    restaurantId: string;
    from: Date;
    to: Date;
    isoStart: DateTime;
    isoEndExclusive: DateTime;
  }) {
    const { restaurantId, from, to, isoStart, isoEndExclusive } = args;

    const raw = await this.billModel.aggregate([
      {
        $match: {
          restaurantId,
          status: 'PAID',
          paidAt: { $gte: from, $lt: to },
        },
      },
      {
        $project: {
          amount: '$totalCents',
          day: {
            $dateToString: {
              date: '$paidAt',
              format: '%Y-%m-%d',
              timezone: TZ,
            },
          },
        },
      },
      { $group: { _id: '$day', revenueCents: { $sum: '$amount' } } },
      { $sort: { _id: 1 } },
    ]);

    // fill missing days (7)
    const keys = daysBetweenInclusive(isoStart, isoEndExclusive);
    const map = new Map<string, number>();
    raw.forEach((x: any) => map.set(x._id, x.revenueCents));

    return keys.map((k) => ({ key: k, revenueCents: map.get(k) ?? 0 }));
  }

  // MONTH: group by ISO week buckets that intersect month
  private async revenueByIsoWeekInMonth(args: {
    restaurantId: string;
    from: Date;
    to: Date;
    monthStart: DateTime;
  }) {
    const { restaurantId, from, to, monthStart } = args;

    const raw = await this.billModel.aggregate([
      {
        $match: {
          restaurantId,
          status: 'PAID',
          paidAt: { $gte: from, $lt: to },
        },
      },
      {
        $project: {
          amount: '$totalCents',
          isoYear: { $isoWeekYear: '$paidAt' },
          isoWeek: { $isoWeek: '$paidAt' },
        },
      },
      {
        $group: {
          _id: { year: '$isoYear', week: '$isoWeek' },
          revenueCents: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } },
    ]);

    const weeks = isoWeeksInMonth(monthStart);
    const map = new Map<string, number>();
    raw.forEach((x: any) => map.set(`${x._id.year}-W${x._id.week}`, x.revenueCents));

    // Return as "YYYY-W##" keys (FE có thể label "Week 1..n" nếu muốn)
    return weeks.map((w) => {
      const key = `${w.year}-W${w.week}`;
      return { key, revenueCents: map.get(key) ?? 0 };
    });
  }

  private async ordersAndAov(args: { restaurantId: string; from: Date; to: Date }) {
    const { restaurantId, from, to } = args;

    const res = await this.orderModel.aggregate([
      {
        $match: {
          restaurantId,
          status: 'served',
          submittedAt: { $gte: from, $lt: to },
        },
      },
      {
        $group: {
          _id: null,
          ordersServed: { $sum: 1 },
          sumCents: { $sum: '$totalCents' },
        },
      },
      {
        $project: {
          ordersServed: 1,
          avgOrderValueCents: {
            $cond: [
              { $eq: ['$ordersServed', 0] },
              0,
              { $divide: ['$sumCents', '$ordersServed'] },
            ],
          },
        },
      },
    ]);

    return {
      ordersServed: res?.[0]?.ordersServed ?? 0,
      avgOrderValueCents: Math.round(res?.[0]?.avgOrderValueCents ?? 0),
    };
  }

  private async avgPrepTime(args: { restaurantId: string; from: Date; to: Date }) {
    const { restaurantId, from, to } = args;

    // prep(order) = max(readyAt-startedAt per line) OR if you want full span:
    // max(readyAt) - min(startedAt)
    // Bạn chọn Option 1; mình dùng "full span" (max ready - min started) chuẩn hơn.
    const res = await this.orderModel.aggregate([
      {
        $match: {
          restaurantId,
          status: 'served',
          submittedAt: { $gte: from, $lt: to },
        },
      },
      {
        $project: {
          validLines: {
            $filter: {
              input: '$items',
              as: 'i',
              cond: {
                $and: [
                  { $ne: ['$$i.status', 'cancelled'] },
                  { $ne: ['$$i.startedAt', null] },
                  { $ne: ['$$i.readyAt', null] },
                ],
              },
            },
          },
        },
      },
      {
        $project: {
          minStarted: { $min: '$validLines.startedAt' },
          maxReady: { $max: '$validLines.readyAt' },
        },
      },
      {
        $project: {
          prepMs: {
            $cond: [
              {
                $and: [
                  { $ne: ['$minStarted', null] },
                  { $ne: ['$maxReady', null] },
                ],
              },
              { $subtract: ['$maxReady', '$minStarted'] },
              null,
            ],
          },
        },
      },
      { $match: { prepMs: { $ne: null } } },
      {
        $group: {
          _id: null,
          avgPrepMs: { $avg: '$prepMs' },
          sampleSize: { $sum: 1 },
        },
      },
    ]);

    const avgPrepMs = res?.[0]?.avgPrepMs ?? null;
    const sampleSize = res?.[0]?.sampleSize ?? 0;

    return {
      avgPrepTimeSeconds: avgPrepMs == null ? null : avgPrepMs / 1000,
      sampleSize,
    };
  }

  private async peakHours(args: { restaurantId: string; from: Date; to: Date }) {
    const { restaurantId, from, to } = args;

    const raw = await this.orderModel.aggregate([
      {
        $match: {
          restaurantId,
          status: 'served',
          submittedAt: { $gte: from, $lt: to },
        },
      },
      {
        $project: {
          hour: {
            $hour: { date: '$submittedAt', timezone: TZ },
          },
        },
      },
      { $group: { _id: '$hour', orders: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    // fill 0..23
    const map = new Map<number, number>();
    raw.forEach((x: any) => map.set(x._id, x.orders));
    const out: Array<{ hour: number; orders: number }> = [];
    for (let h = 0; h < 24; h++) out.push({ hour: h, orders: map.get(h) ?? 0 });
    return out;
  }

  private async topItems(args: { restaurantId: string; from: Date; to: Date }) {
    const { restaurantId, from, to } = args;

    const raw = await this.orderModel.aggregate([
      {
        $match: {
          restaurantId,
          status: 'served',
          submittedAt: { $gte: from, $lt: to },
        },
      },
      { $unwind: '$items' },
      { $match: { 'items.status': { $ne: 'cancelled' } } },
      {
        $group: {
          _id: '$items.itemId',
          name: { $first: '$items.nameSnapshot' },
          totalQty: { $sum: '$items.qty' },
        },
      },
      { $sort: { totalQty: -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 0,
          itemId: { $toString: '$_id' },
          name: 1,
          totalQty: 1,
        },
      },
    ]);

    return raw;
  }
}
