import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from './order.schema';
import { datePresetRange } from './utils/order-time.util';

function isObjectIdLike(s: string) {
  return /^[a-fA-F0-9]{24}$/.test(s);
}

function toObjectId(id: string, name: string) {
  try {
    return new Types.ObjectId(id);
  } catch {
    throw new BadRequestException(`Invalid ${name}`);
  }
}

function toPosInt(v: any, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.floor(n);
  return i > 0 ? i : fallback;
}

@Injectable()
export class AdminOrdersService {
  constructor(@InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>) {}

  async list(args: {
    restaurantId: string;
    status?: string;
    tableId?: string;
    date?: 'today' | 'yesterday' | 'this_week' | 'this_month';
    q?: string;
    page?: any;      
    pageSize?: any;  
  }) {
    const restaurantId = args.restaurantId;
    const status = args.status;
    const tableId = args.tableId;
    const date = args.date ?? 'today';
    const q = args.q;

    const page = toPosInt(args.page, 1);
    const pageSizeRaw = toPosInt(args.pageSize, 10);
    const pageSize = Math.min(100, pageSizeRaw);

    if (pageSize <= 0 || page <= 0) {
      throw new BadRequestException('Invalid page/pageSize');
    }

    const match: any = { restaurantId };

    if (status) match.status = status;

    if (tableId) match.tableId = toObjectId(tableId, 'tableId');

    // date preset filter: submittedAt fallback createdAt
    const { from, to } = datePresetRange(date);
    match.$expr = {
      $and: [
        { $gte: [{ $ifNull: ['$submittedAt', '$createdAt'] }, from] },
        { $lt: [{ $ifNull: ['$submittedAt', '$createdAt'] }, to] },
      ],
    };

    // search
    if (q && q.trim()) {
      const s = q.trim();
      if (isObjectIdLike(s)) {
        match._id = new Types.ObjectId(s);
      } else {
        match.tableNumberSnapshot = { $regex: s, $options: 'i' };
      }
    }

    const skip = (page - 1) * pageSize;

    const pipeline: any[] = [
      { $match: match },

      { $addFields: { sortTime: { $ifNull: ['$submittedAt', '$createdAt'] } } },
      { $sort: { sortTime: -1 } },

      {
        $facet: {
          items: [
            { $skip: skip },
            { $limit: pageSize }, // ✅ now guaranteed number
            {
              $project: {
                _id: 0,
                orderId: { $toString: '$_id' },
                tableId: { $toString: '$tableId' },
                tableNumber: '$tableNumberSnapshot',
                items: {
                  $map: {
                    input: { $ifNull: ['$items', []] },
                    as: 'i',
                    in: { name: '$$i.nameSnapshot', qty: '$$i.qty' },
                  },
                },
                totalCents: '$totalCents',
                status: '$status',
                submittedAt: '$submittedAt',
                createdAt: '$createdAt',
              },
            },
          ],
          meta: [{ $count: 'total' }],
        },
      },
      {
        $project: {
          items: 1,
          total: { $ifNull: [{ $arrayElemAt: ['$meta.total', 0] }, 0] },
        },
      },
    ];

    const res = await this.orderModel.aggregate(pipeline);
    const out = res?.[0] ?? { items: [], total: 0 };

    return {
      items: out.items ?? [],
      page,
      pageSize,
      total: out.total ?? 0,
    };
  }
}
