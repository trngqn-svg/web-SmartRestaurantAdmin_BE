import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MenuItem } from '../items/item.schema';
import { MenuItemPhoto } from './photo.schema';
import { RESTAURANT_ID } from '../../config/restaurant.config';

@Injectable()
export class PhotosService {
  constructor(
    @InjectModel(MenuItem.name) private readonly itemModel: Model<MenuItem>,
    @InjectModel(MenuItemPhoto.name) private readonly photoModel: Model<MenuItemPhoto>,
  ) {}

  private async ensureItem(itemId: string) {
    const item = await this.itemModel.findOne({ _id: itemId, restaurantId: RESTAURANT_ID, isDeleted: false });
    if (!item) throw new NotFoundException('Item not found');
    return item;
  }

  async addPhotos(itemId: string, urls: string[]) {
    await this.ensureItem(itemId);

    // if no primary exists yet, first uploaded becomes primary
    const hasPrimary = await this.photoModel.exists({ menuItemId: new Types.ObjectId(itemId), isPrimary: true });

    const docs = urls.map((url, idx) => ({
      menuItemId: new Types.ObjectId(itemId),
      url,
      isPrimary: !hasPrimary && idx === 0,
    }));

    await this.photoModel.insertMany(docs);
    return this.photoModel.find({ menuItemId: itemId }).sort({ createdAt: -1 }).lean();
  }

  async removePhoto(itemId: string, photoId: string) {
    await this.ensureItem(itemId);

    const photo = await this.photoModel.findOne({ _id: photoId, menuItemId: itemId });
    if (!photo) throw new NotFoundException('Photo not found');

    const wasPrimary = photo.isPrimary;
    await photo.deleteOne();

    if (wasPrimary) {
      // pick newest as primary if exists
      const next = await this.photoModel.findOne({ menuItemId: itemId }).sort({ createdAt: -1 });
      if (next) {
        await this.photoModel.updateOne({ _id: next._id }, { $set: { isPrimary: true } });
      }
    }

    return { success: true };
  }

  async setPrimary(itemId: string, photoId: string) {
    await this.ensureItem(itemId);

    const photo = await this.photoModel.findOne({ _id: photoId, menuItemId: itemId });
    if (!photo) throw new NotFoundException('Photo not found');

    await this.photoModel.updateMany({ menuItemId: itemId }, { $set: { isPrimary: false } });
    await this.photoModel.updateOne({ _id: photoId }, { $set: { isPrimary: true } });

    return { success: true };
  }
}
