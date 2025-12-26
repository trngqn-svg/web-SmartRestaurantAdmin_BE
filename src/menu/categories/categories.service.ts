import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RESTAURANT_ID } from '../../config/restaurant.config';
import { MenuCategory } from './category.schema';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { MenuItem } from '../items/item.schema';
import type { SortOrder } from "mongoose";

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(MenuCategory.name) private readonly catModel: Model<MenuCategory>,
    @InjectModel(MenuItem.name) private readonly itemModel: Model<MenuItem>,
  ) {}

  async create(dto: CreateCategoryDto) {
    try {
      return await this.catModel.create({
        restaurantId: RESTAURANT_ID,
        name: dto.name.trim(),
        description: dto.description,
        displayOrder: dto.displayOrder ?? 0,
        status: dto.status ?? 'active',
        isDeleted: false,
      });
    } catch (e: any) {
      if (e?.code === 11000) throw new ConflictException('Category name already exists');
      throw e;
    }
  }

  async list(query: {
    q?: string;
    status?: "active" | "inactive" | "all";
    sortBy?: "displayOrder" | "name" | "createdAt";
    sortDir?: "asc" | "desc";
    page?: number;
    limit?: number;
  }) {
    const {
      q,
      status = "all",
      sortBy = "displayOrder",
      sortDir = "asc",
      page = 1,
      limit = 10,
    } = query;

    // Filter
    const filter: any = {
      restaurantId: RESTAURANT_ID,
      isDeleted: false,
    };

    if (q?.trim()) {
      filter.name = { $regex: q.trim(), $options: "i" };
    }

    if (status !== "all") {
      filter.status = status;
    }

    // Sort (FIXED typings)
    const dir: SortOrder = sortDir === "desc" ? -1 : 1;

    const sort: Record<string, SortOrder> =
      sortBy === "name"
        ? { name: dir }
        : sortBy === "createdAt"
          ? { createdAt: dir }
          : { displayOrder: dir, name: 1 };

    // Pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Query + count
    const [categories, total] = await Promise.all([
      this.catModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      this.catModel.countDocuments(filter),
    ]);

    // Item count
    const ids = categories.map((c) => c._id);
    const counts = await this.itemModel.aggregate([
      {
        $match: {
          restaurantId: RESTAURANT_ID,
          isDeleted: false,
          categoryId: { $in: ids },
        },
      },
      { $group: { _id: "$categoryId", count: { $sum: 1 } } },
    ]);

    const map = new Map<string, number>(
      counts.map((x) => [String(x._id), x.count]),
    );

    // Response (paginated)
    return {
      items: categories.map((c) => ({
        ...c,
        itemCount: map.get(String(c._id)) ?? 0,
      })),
      total,
      page: pageNum,
      limit: limitNum,
    };
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const cat = await this.catModel.findOne({ _id: id, restaurantId: RESTAURANT_ID, isDeleted: false });
    if (!cat) throw new NotFoundException('Category not found');

    if (dto.name !== undefined) cat.name = dto.name.trim();
    if (dto.description !== undefined) cat.description = dto.description;
    if (dto.displayOrder !== undefined) cat.displayOrder = dto.displayOrder;
    if (dto.status !== undefined) cat.status = dto.status;

    try {
      await cat.save();
      return cat;
    } catch (e: any) {
      if (e?.code === 11000) throw new ConflictException('Category name already exists');
      throw e;
    }
  }

  async softDelete(id: string) {
    const cat = await this.catModel.findOne({ _id: id, restaurantId: RESTAURANT_ID, isDeleted: false });
    if (!cat) throw new NotFoundException('Category not found');

    const activeItems = await this.itemModel.countDocuments({
      restaurantId: RESTAURANT_ID,
      isDeleted: false,
      categoryId: new Types.ObjectId(id),
      status: 'available',
    });

    if (activeItems > 0) {
      throw new BadRequestException('Cannot delete category with active (available) items. Inactivate it instead.');
    }

    cat.isDeleted = true;
    cat.status = 'inactive';
    await cat.save();
    return { success: true };
  }
}
