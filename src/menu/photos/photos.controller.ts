import { BadRequestException, Controller, Delete, Param, Patch, Post, UseGuards, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { PhotosService } from './photos.service';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

function validateImage(file: Express.Multer.File) {
  const allowedMime = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedMime.includes(file.mimetype)) throw new BadRequestException('Invalid file type');
  const ext = extname(file.originalname).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) throw new BadRequestException('Invalid extension');
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('/api/admin/menu/items')
export class PhotosController {
  constructor(
    private readonly photos: PhotosService,
    private readonly storage: StorageService,
  ) {}

  @Post(':id/photos')
  @UseInterceptors(
    FilesInterceptor('photos', 10, {
      limits: { fileSize: 5 * 1024 * 1024 },
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          try {
            validateImage(file);
            const ext = extname(file.originalname).toLowerCase();
            cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
          } catch (e) {
            cb(e as any, '');
          }
        },
      }),
    }),
  )
  upload(@Param('id') itemId: string, @UploadedFiles() files: Express.Multer.File[]) {
    if (!files?.length) throw new BadRequestException('No files uploaded');
    return this.photos.addPhotos(itemId, files.map(f => this.storage.publicUrl(f.filename)));
  }

  @Delete(':id/photos/:photoId')
  remove(@Param('id') itemId: string, @Param('photoId') photoId: string) {
    return this.photos.removePhoto(itemId, photoId);
  }

  @Patch(':id/photos/:photoId/primary')
  setPrimary(@Param('id') itemId: string, @Param('photoId') photoId: string) {
    return this.photos.setPrimary(itemId, photoId);
  }
}