import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RESTAURANT_ID } from '../../config/restaurant.config';
import { ItemReview } from './item-review.schema';
import { MenuItem } from '../items/item.schema';
import { CreateItemReviewDto, ListItemReviewsQuery } from './dto/item-review.dto';
import { SortOrder } from 'mongoose';

@Injectable()
export class ItemReviewsService {
  constructor(
    @InjectModel(ItemReview.name) private readonly reviewModel: Model<ItemReview>,
    @InjectModel(MenuItem.name) private readonly itemModel: Model<MenuItem>,
  ) {}

  private paging(q: ListItemReviewsQuery) {
    const page = Math.max(1, Number(q.page || 1));
    const limit = Math.min(100, Math.max(1, Number(q.limit || 10)));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
  }

  async create(dto: CreateItemReviewDto, userId?: string) {
    const itemId = new Types.ObjectId(dto.itemId);

    // check item exists + belongs restaurant + not deleted
    const item = await this.itemModel.findOne({
      _id: itemId,
      restaurantId: RESTAURANT_ID,
      isDeleted: false,
    }).lean();

    if (!item) throw new NotFoundException('Item not found');

    // optional: prevent duplicate review per user per item
    if (userId) {
      const existed = await this.reviewModel.findOne({
        restaurantId: RESTAURANT_ID,
        itemId,
        userId: new Types.ObjectId(userId),
        isDeleted: false,
      }).lean();
      if (existed) throw new BadRequestException('You already reviewed this item');
    }

    const created = await this.reviewModel.create({
      restaurantId: RESTAURANT_ID,
      itemId,
      userId: userId ? new Types.ObjectId(userId) : undefined,
      orderId: dto.orderId ? new Types.ObjectId(dto.orderId) : undefined,
      rating: dto.rating,
      comment: dto.comment?.trim() || undefined,
      photoUrls: dto.photoUrls ?? [],
      status: 'published',
      isDeleted: false,
    });

    await this.applyDeltaToItemRating(itemId, +1, dto.rating);

    return {
      id: String(created._id),
      itemId: String(created.itemId),
      rating: created.rating,
      comment: created.comment ?? null,
      createdAt: (created as any).createdAt,
    };
  }

  async listByItem(itemId: string, q: ListItemReviewsQuery) {
    if (!Types.ObjectId.isValid(itemId)) {
      throw new BadRequestException("Invalid itemId");
    }
    const _itemId = new Types.ObjectId(itemId);
    const { page, limit, skip } = this.paging(q);

    const sort: Record<string, SortOrder> =
    q.sort === 'highest'
      ? { rating: -1, createdAt: -1 }
      : q.sort === 'lowest'
      ? { rating: 1, createdAt: -1 }
      : { createdAt: -1 };

    const filter = {
      restaurantId: RESTAURANT_ID,
      itemId: _itemId,
      isDeleted: false,
      status: 'published' as const,
    };

    const [rows, total] = await Promise.all([
      this.reviewModel.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      this.reviewModel.countDocuments(filter),
    ]);

    const item = await this.itemModel.findOne(
      { _id: _itemId, restaurantId: RESTAURANT_ID, isDeleted: false },
      { ratingAvg: 1, ratingCount: 1, ratingBreakdown: 1, name: 1 },
    ).lean();

    return {
      page,
      limit,
      total,
      summary: item
        ? {
            itemId,
            itemName: item.name,
            ratingAvg: item.ratingAvg ?? 0,
            ratingCount: item.ratingCount ?? 0,
            ratingBreakdown: item.ratingBreakdown ?? { 1:0,2:0,3:0,4:0,5:0 },
          }
        : null,
      reviews: rows.map((r) => ({
        id: String(r._id),
        rating: r.rating,
        comment: r.comment ?? null,
        photoUrls: r.photoUrls ?? [],
        userId: r.userId ? String(r.userId) : null,
        createdAt: (r as any).createdAt,
      })),
    };
  }

  async remove(reviewId: string, userId?: string) {
    const _id = new Types.ObjectId(reviewId);

    const review = await this.reviewModel.findOne({
      _id,
      restaurantId: RESTAURANT_ID,
      isDeleted: false,
      ...(userId ? { userId: new Types.ObjectId(userId) } : {}),
    });

    if (!review) throw new NotFoundException('Review not found');

    review.isDeleted = true;
    await review.save();

    await this.applyDeltaToItemRating(review.itemId as any, -1, review.rating);

    return { ok: true };
  }

  // ---------- helpers ----------
  private async applyDeltaToItemRating(itemId: Types.ObjectId, deltaCount: 1 | -1, rating: number) {
    // lấy ratingCount/ratingAvg hiện tại, rồi tính avg mới.
    // NOTE: để tránh race condition, bạn có thể dùng transaction hoặc dùng aggregation recompute.
    const item = await this.itemModel.findOne(
      { _id: itemId, restaurantId: RESTAURANT_ID, isDeleted: false },
      { ratingAvg: 1, ratingCount: 1, ratingBreakdown: 1 },
    );

    if (!item) return;

    const prevCount = Number(item.ratingCount || 0);
    const prevAvg = Number(item.ratingAvg || 0);

    const prevSum = prevAvg * prevCount;
    const nextCount = Math.max(0, prevCount + deltaCount);
    const nextSum = Math.max(0, prevSum + deltaCount * rating);
    const nextAvg = nextCount === 0 ? 0 : Math.round((nextSum / nextCount) * 100) / 100;

    const key = String(rating) as '1'|'2'|'3'|'4'|'5';
    const breakdown = (item.ratingBreakdown as any) ?? { 1:0,2:0,3:0,4:0,5:0 };
    const nextBreakdown = {
      ...breakdown,
      [key]: Math.max(0, Number(breakdown[key] || 0) + deltaCount),
    };

    item.ratingCount = nextCount;
    item.ratingAvg = nextAvg;
    item.ratingBreakdown = nextBreakdown as any;

    await item.save();
  }

  // dùng khi muốn “recompute chuẩn tuyệt đối”
  async recalculateItemRating(itemId: string) {
    const _itemId = new Types.ObjectId(itemId);

    const rows = await this.reviewModel.aggregate([
      {
        $match: {
          restaurantId: RESTAURANT_ID,
          itemId: _itemId,
          isDeleted: false,
          status: 'published',
        },
      },
      {
        $group: {
          _id: '$itemId',
          ratingCount: { $sum: 1 },
          ratingAvg: { $avg: '$rating' },
          b1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
          b2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          b3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          b4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          b5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
        },
      },
    ]);

    const agg = rows[0];
    const ratingCount = agg?.ratingCount ?? 0;
    const ratingAvg = agg?.ratingAvg ? Math.round(agg.ratingAvg * 100) / 100 : 0;

    await this.itemModel.updateOne(
      { _id: _itemId, restaurantId: RESTAURANT_ID },
      {
        $set: {
          ratingCount,
          ratingAvg,
          ratingBreakdown: {
            1: agg?.b1 ?? 0,
            2: agg?.b2 ?? 0,
            3: agg?.b3 ?? 0,
            4: agg?.b4 ?? 0,
            5: agg?.b5 ?? 0,
          },
        },
      },
    );

    return { ok: true, ratingCount, ratingAvg };
  }
}
