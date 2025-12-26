import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RESTAURANT_ID } from '../../config/restaurant.config';
import { ModifierGroup } from './modifier-group.schema';
import { ModifierOption } from './modifier-option.schema';
import { CreateModifierGroupDto, CreateModifierOptionDto } from './dto/modifiers.dto';
import { dollarsToCents } from '../items/dto/item.dto';

@Injectable()
export class ModifiersService {
  constructor(
    @InjectModel(ModifierGroup.name) private readonly groupModel: Model<ModifierGroup>,
    @InjectModel(ModifierOption.name) private readonly optionModel: Model<ModifierOption>,
  ) {}

  private validateGroupRules(dto: CreateModifierGroupDto) {
    const isRequired = dto.isRequired ?? false;
    const min = dto.minSelections ?? 0;
    const max = dto.maxSelections ?? 0;

    if (dto.selectionType === 'single') {
      if (isRequired && (min !== 0 || max !== 0)) {}
      return;
    }

    if (isRequired) {
      if (min < 1) throw new BadRequestException('minSelections must be >= 1 when required for multi-select');
      if (max > 0 && max < min) throw new BadRequestException('maxSelections must be >= minSelections');
    }
  }

  async createGroup(dto: CreateModifierGroupDto) {
    this.validateGroupRules(dto);
    try {
      return await this.groupModel.create({
        restaurantId: RESTAURANT_ID,
        name: dto.name.trim(),
        selectionType: dto.selectionType,
        isRequired: dto.isRequired ?? false,
        minSelections: dto.minSelections ?? 0,
        maxSelections: dto.maxSelections ?? 0,
        displayOrder: dto.displayOrder ?? 0,
        status: dto.status ?? 'active',
      });
    } catch (e: any) {
      if (e?.code === 11000) throw new BadRequestException('Modifier group name already exists');
      throw e;
    }
  }

  async createOption(dto: CreateModifierOptionDto) {
    const group = await this.groupModel.findOne({ _id: dto.groupId, restaurantId: RESTAURANT_ID });
    if (!group) throw new NotFoundException('Group not found');

    const cents = dto.priceAdjustment === undefined ? 0 : dollarsToCents(dto.priceAdjustment);
    if (cents < 0) throw new BadRequestException('priceAdjustment must be >= 0');

    try {
      return await this.optionModel.create({
        groupId: new Types.ObjectId(dto.groupId),
        name: dto.name.trim(),
        priceAdjustmentCents: cents,
        status: 'active',
      });
    } catch (e: any) {
      if (e?.code === 11000) throw new BadRequestException('Option name already exists in this group');
      throw e;
    }
  }

  async updateGroup(id: string, dto: Partial<CreateModifierGroupDto>) {
    const group = await this.groupModel.findOne({ _id: id, restaurantId: RESTAURANT_ID });
    if (!group) throw new NotFoundException('Group not found');

    const merged = { ...group.toObject(), ...dto } as any;
    this.validateGroupRules(merged);

    if (dto.name !== undefined) group.name = dto.name.trim();
    if (dto.selectionType !== undefined) group.selectionType = dto.selectionType;
    if (dto.isRequired !== undefined) group.isRequired = dto.isRequired;
    if (dto.minSelections !== undefined) group.minSelections = dto.minSelections;
    if (dto.maxSelections !== undefined) group.maxSelections = dto.maxSelections;
    if (dto.displayOrder !== undefined) group.displayOrder = dto.displayOrder;
    if (dto.status !== undefined) group.status = dto.status;

    await group.save();
    return group;
  }

  async updateOption(id: string, dto: Partial<{ name: string; priceAdjustment: number; status: 'active' | 'inactive' }>) {
    const opt = await this.optionModel.findOne({ _id: id });
    if (!opt) throw new NotFoundException('Option not found');

    if (dto.name !== undefined) opt.name = dto.name.trim();
    if (dto.status !== undefined) opt.status = dto.status;
    if (dto.priceAdjustment !== undefined) {
      const cents = dollarsToCents(dto.priceAdjustment);
      if (cents < 0) throw new BadRequestException('priceAdjustment must be >= 0');
      opt.priceAdjustmentCents = cents;
    }

    await opt.save();
    return opt;
  }

  async getGroupsWithOptions(groupIds: Types.ObjectId[]) {
    const groups = await this.groupModel
      .find({ _id: { $in: groupIds }, restaurantId: RESTAURANT_ID, status: 'active' })
      .lean();

    const options = await this.optionModel
      .find({ groupId: { $in: groupIds }, status: 'active' })
      .lean();

    const map = new Map<string, any[]>();
    for (const o of options) {
      const key = String(o.groupId);
      map.set(key, [...(map.get(key) ?? []), { ...o, priceAdjustment: o.priceAdjustmentCents / 100 }]);
    }

    return groups.map(g => ({ ...g, options: map.get(String(g._id)) ?? [] }));
  }
}
