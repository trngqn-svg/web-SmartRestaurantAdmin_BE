import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, SortOrder, Types } from 'mongoose';
import { RESTAURANT_ID } from '../../config/restaurant.config';
import { ItemReview, ItemReviewDocument } from './item-review.schema';
import { MenuItem, MenuItemDocument } from '../items/item.schema';
import { ListItemReviewsQuery } from './dto/item-review.dto';
import { User, UserDocument } from '../../users/user.schema';

@Injectable()
export class ItemReviewsService {
  constructor(
    @InjectModel(ItemReview.name) private readonly reviewModel: Model<ItemReviewDocument>,
    @InjectModel(MenuItem.name) private readonly itemModel: Model<MenuItemDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  private paging(q: ListItemReviewsQuery) {
    const page = Math.max(1, Number(q.page || 1));
    const limit = Math.min(100, Math.max(1, Number(q.limit || 10)));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
  }

  async adminListByItem(itemId: string, q: ListItemReviewsQuery) {
    if (!Types.ObjectId.isValid(itemId)) throw new BadRequestException('Invalid itemId');

    const _itemId = new Types.ObjectId(itemId);
    const { page, limit, skip } = this.paging(q);

    const sort: Record<string, SortOrder> =
      q.sort === 'highest'
        ? { rating: -1, createdAt: -1 }
        : q.sort === 'lowest'
        ? { rating: 1, createdAt: -1 }
        : { createdAt: -1 };

    const item = await this.itemModel
      .findOne({ _id: _itemId, restaurantId: RESTAURANT_ID, isDeleted: false }, { name: 1, ratingAvg: 1, ratingCount: 1, ratingBreakdown: 1 })
      .lean();

    if (!item) throw new NotFoundException('Item not found');

    const filter = {
      restaurantId: RESTAURANT_ID,
      itemId: _itemId,
      isDeleted: false,
    };

    const [rows, total] = await Promise.all([
      this.reviewModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'userId',
          select: { fullName: 1, avatarUrl: 1 },
          options: { lean: true },
        })
        .lean(),
      this.reviewModel.countDocuments(filter),
    ]);

    return {
      page,
      limit,
      total,
      summary: {
        itemId,
        itemName: item.name,
        ratingAvg: item.ratingAvg ?? 0,
        ratingCount: item.ratingCount ?? 0,
        ratingBreakdown: (item as any).ratingBreakdown ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      },
      reviews: rows.map((r: any) => {
        const u = r.userId as any | null;
        const name =
          (u?.fullName as string) ??
          (u?.name as string) ??
          null;

        const avatarUrl =
          (u?.avatarUrl as string) ??
          (u?.photoUrl as string) ??
          null;

        return {
          id: String(r._id),
          rating: r.rating,
          comment: r.comment ?? null,
          photoUrls: r.photoUrls ?? [],
          createdAt: r.createdAt,
          orderId: r.orderId ? String(r.orderId) : null,
          user: u
            ? {
                id: String(u._id),
                name,
                avatarUrl,
              }
            : null,
        };
      }),
    };
  }

  async adminRemove(reviewId: string) {
    if (!Types.ObjectId.isValid(reviewId)) throw new BadRequestException('Invalid reviewId');

    const _id = new Types.ObjectId(reviewId);

    const review = await this.reviewModel.findOne({
      _id,
      restaurantId: RESTAURANT_ID,
      isDeleted: false,
    });

    if (!review) throw new NotFoundException('Review not found');

    review.isDeleted = true;
    await review.save();

    await this.applyDeltaToItemRating(review.itemId as any, -1, review.rating);

    return { ok: true };
  }

  private async applyDeltaToItemRating(itemId: Types.ObjectId, deltaCount: 1 | -1, rating: number) {
    const item = await this.itemModel.findOne(
      { _id: itemId, restaurantId: RESTAURANT_ID, isDeleted: false },
      { ratingAvg: 1, ratingCount: 1, ratingBreakdown: 1 },
    );

    if (!item) return;

    const prevCount = Number((item as any).ratingCount || 0);
    const prevAvg = Number((item as any).ratingAvg || 0);

    const prevSum = prevAvg * prevCount;
    const nextCount = Math.max(0, prevCount + deltaCount);
    const nextSum = Math.max(0, prevSum + deltaCount * rating);
    const nextAvg = nextCount === 0 ? 0 : Math.round((nextSum / nextCount) * 100) / 100;

    const key = String(rating) as '1' | '2' | '3' | '4' | '5';
    const breakdown = ((item as any).ratingBreakdown ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }) as Record<string, number>;

    const nextBreakdown = {
      ...breakdown,
      [key]: Math.max(0, Number(breakdown[key] || 0) + deltaCount),
    };

    (item as any).ratingCount = nextCount;
    (item as any).ratingAvg = nextAvg;
    (item as any).ratingBreakdown = nextBreakdown;

    await item.save();
  }
}
