import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MenuCategory, MenuCategorySchema } from './categories/category.schema';
import { MenuItem, MenuItemSchema } from './items/item.schema';
import { MenuItemPhoto, MenuItemPhotoSchema } from './photos/photo.schema';
import { ModifierGroup, ModifierGroupSchema } from './modifiers/modifier-group.schema';
import { ModifierOption, ModifierOptionSchema } from './modifiers/modifier-option.schema';

import { CategoriesController } from './categories/categories.controller';
import { CategoriesService } from './categories/categories.service';

import { ItemsController } from './items/items.controller';
import { ItemsService } from './items/items.service';

import { PhotosController } from './photos/photos.controller';
import { PhotosService } from './photos/photos.service';
import { StorageService } from './photos/storage.service';

import { ModifiersController } from './modifiers/modifiers.controller';
import { ModifiersService } from './modifiers/modifiers.service';

import { GuestMenuController } from './guest/guest.controller';
import { GuestMenuService } from './guest/guest.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MenuCategory.name, schema: MenuCategorySchema },
      { name: MenuItem.name, schema: MenuItemSchema },
      { name: MenuItemPhoto.name, schema: MenuItemPhotoSchema },
      { name: ModifierGroup.name, schema: ModifierGroupSchema },
      { name: ModifierOption.name, schema: ModifierOptionSchema },
    ]),
  ],
  controllers: [
    CategoriesController,
    ItemsController,
    PhotosController,
    ModifiersController,
    GuestMenuController,
  ],
  providers: [
    CategoriesService,
    ItemsService,
    PhotosService,
    StorageService,
    ModifiersService,
    GuestMenuService,
  ],
})
export class MenuModule {}