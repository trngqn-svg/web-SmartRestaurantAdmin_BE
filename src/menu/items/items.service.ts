import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RESTAURANT_ID } from '../../config/restaurant.config';
import { MenuItem } from './item.schema';
import { CreateMenuItemDto, UpdateMenuItemDto, dollarsToCents } from './dto/item.dto';
import { MenuCategory } from '../categories/category.schema';
import { parsePaging } from '../../common/utils/pagination';

@Injectable()
export class ItemsService {
  constructor(
    @InjectModel(MenuItem.name) private readonly itemModel: Model<MenuItem>,
    @InjectModel(MenuCategory.name) private readonly catModel: Model<MenuCategory>,
  ) {}

  private async ensureCategoryValid(categoryId: string) {
    const cat = await this.catModel.findOne({
      _id: categoryId,
      restaurantId: RESTAURANT_ID,
      isDeleted: false,
    });
    if (!cat) throw new BadRequestException('Category does not exist');
    return cat;
  }

  async create(dto: CreateMenuItemDto) {
    await this.ensureCategoryValid(dto.categoryId);

    const priceCents = dollarsToCents(dto.price);
    if (priceCents < 1 || priceCents > 99999900) throw new BadRequestException('Invalid price');

    return this.itemModel.create({
      restaurantId: RESTAURANT_ID,
      categoryId: new Types.ObjectId(dto.categoryId),
      name: dto.name.trim(),
      description: dto.description,
      priceCents,
      prepTimeMinutes: dto.prepTimeMinutes ?? 0,
      status: dto.status,
      isChefRecommended: dto.isChefRecommended ?? false,
      isDeleted: false,
      popularityCount: 0,
      modifierGroupIds: [],
    });
  }

  async listAdmin(q: any) {
    const { page, limit, skip } = parsePaging(q);

    const filter: any = { restaurantId: RESTAURANT_ID, isDeleted: false };

    if (q.name) filter.name = { $regex: String(q.name), $options: 'i' };
    if (q.categoryId) filter.categoryId = new Types.ObjectId(String(q.categoryId));
    if (q.status) filter.status = String(q.status);

    const sort: any =
      q.sort === 'price' ? { priceCents: q.order === 'asc' ? 1 : -1 } :
      q.sort === 'popularity' ? { popularityCount: -1 } :
      { createdAt: -1 };

    const [items, total] = await Promise.all([
      this.itemModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('categoryId', 'name status displayOrder')
        .lean(),
      this.itemModel.countDocuments(filter),
    ]);

    return {
      page,
      limit,
      total,
      items: items.map(i => ({
        ...i,
        price: (i.priceCents ?? 0) / 100,
      })),
    };
  }

  async getById(id: string) {
    const item = await this.itemModel
      .findOne({ _id: id, restaurantId: RESTAURANT_ID, isDeleted: false })
      .populate('categoryId', 'name status')
      .lean();
    if (!item) throw new NotFoundException('Item not found');
    return { ...item, price: item.priceCents / 100 };
  }

  async update(id: string, dto: UpdateMenuItemDto) {
    const item = await this.itemModel.findOne({ _id: id, restaurantId: RESTAURANT_ID, isDeleted: false });
    if (!item) throw new NotFoundException('Item not found');

    if (dto.categoryId) await this.ensureCategoryValid(dto.categoryId);

    if (dto.name !== undefined) item.name = dto.name.trim();
    if (dto.description !== undefined) item.description = dto.description;
    if (dto.categoryId !== undefined) item.categoryId = new Types.ObjectId(dto.categoryId);
    if (dto.prepTimeMinutes !== undefined) item.prepTimeMinutes = dto.prepTimeMinutes;
    if (dto.status !== undefined) item.status = dto.status;
    if (dto.isChefRecommended !== undefined) item.isChefRecommended = dto.isChefRecommended;

    if (dto.price !== undefined) {
      const cents = dollarsToCents(dto.price);
      if (cents < 1 || cents > 99999900) throw new BadRequestException('Invalid price');
      item.priceCents = cents;
    }

    await item.save();
    return { ...item.toObject(), price: item.priceCents / 100 };
  }

  async softDelete(id: string) {
    const item = await this.itemModel.findOne({ _id: id, restaurantId: RESTAURANT_ID, isDeleted: false });
    if (!item) throw new NotFoundException('Item not found');
    item.isDeleted = true;
    await item.save();
    return { success: true };
  }

  async setModifierGroups(itemId: string, groupIds: string[]) {
    const item = await this.itemModel.findOne({ _id: itemId, restaurantId: RESTAURANT_ID, isDeleted: false });
    if (!item) throw new NotFoundException('Item not found');

    item.modifierGroupIds = groupIds.map(id => new Types.ObjectId(id));
    await item.save();
    return { success: true, modifierGroupIds: item.modifierGroupIds };
  }
}
