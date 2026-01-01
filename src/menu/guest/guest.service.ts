import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RESTAURANT_ID } from '../../config/restaurant.config';
import { MenuCategory } from '../categories/category.schema';
import { MenuItem } from '../items/item.schema';
import { MenuItemPhoto } from '../photos/photo.schema';
import { ModifiersService } from '../modifiers/modifiers.service';
import { parsePaging } from '../../common/utils/pagination';

@Injectable()
export class GuestMenuService {
  constructor(
    @InjectModel(MenuCategory.name) private readonly catModel: Model<MenuCategory>,
    @InjectModel(MenuItem.name) private readonly itemModel: Model<MenuItem>,
    @InjectModel(MenuItemPhoto.name) private readonly photoModel: Model<MenuItemPhoto>,
    private readonly modifiers: ModifiersService,
  ) {}

  async load(q: any) {
    const { page, limit, skip } = parsePaging(q);

    const categoryFilter: any = { restaurantId: RESTAURANT_ID, isDeleted: false, status: 'active' };
    const categories = await this.catModel.find(categoryFilter).sort({ displayOrder: 1, name: 1 }).lean();
    const categoryIds = categories.map(c => c._id);

    const itemFilter: any = {
      restaurantId: RESTAURANT_ID,
      isDeleted: false,
      categoryId: { $in: categoryIds },
    };

    if (q.q) itemFilter.name = { $regex: String(q.q), $options: 'i' };
    if (q.categoryId) itemFilter.categoryId = new Types.ObjectId(String(q.categoryId));
    if (q.chefRecommended === 'true') itemFilter.isChefRecommended = true;
    itemFilter.status = { $in: ['available', 'sold_out'] };

    const sort: any =
      q.sort === 'popularity' ? { popularityCount: -1 } :
      q.sort === 'price' ? { priceCents: 1 } :
      { createdAt: -1 };

    const [items, total] = await Promise.all([
      this.itemModel.find(itemFilter).sort(sort).skip(skip).limit(limit).lean(),
      this.itemModel.countDocuments(itemFilter),
    ]);

    const itemIds = items.map(i => i._id);

    // primary photos
    const photos = await this.photoModel
      .find({ menuItemId: { $in: itemIds }, isPrimary: true })
      .lean();

    const photoMap = new Map<string, string>(photos.map(p => [String(p.menuItemId), p.url]));

    // modifiers
    const allGroupIds = Array.from(
      new Set(items.flatMap(i => (i.modifierGroupIds ?? []).map(id => String(id)))),
    ).map(id => new Types.ObjectId(id));

    const groups = await this.modifiers.getGroupsWithOptions(allGroupIds);
    const groupMap = new Map<string, any>(groups.map(g => [String(g._id), g]));

    const enrichedItems = items.map(i => {
      const mods = (i.modifierGroupIds ?? [])
        .map(id => groupMap.get(String(id)))
        .filter(Boolean);

      const canOrder = i.status === 'available';
      return {
        id: String(i._id),
        categoryId: String(i.categoryId),
        name: i.name,
        description: i.description,
        price: i.priceCents / 100,
        status: i.status,
        canOrder,
        isChefRecommended: i.isChefRecommended,
        primaryPhotoUrl: photoMap.get(String(i._id)) ?? null,
        modifierGroups: mods,
        ratingAvg: (i as any).ratingAvg ?? 0,
        ratingCount: (i as any).ratingCount ?? 0,
      };
    });

    return {
      restaurantId: RESTAURANT_ID,
      page,
      limit,
      total,
      categories: categories.map(c => ({ id: String(c._id), name: c.name, displayOrder: c.displayOrder })),
      items: enrichedItems,
    };
  }
}
