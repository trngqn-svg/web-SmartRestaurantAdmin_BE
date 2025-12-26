import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import * as fs from 'fs';

@Injectable()
export class StorageService {
  private baseDir = join(process.cwd(), 'uploads');

  constructor() {
    if (!fs.existsSync(this.baseDir)) fs.mkdirSync(this.baseDir, { recursive: true });
  }

  safeFilename(originalName: string) {
    const ext = extname(originalName).toLowerCase();
    return `${randomUUID()}${ext}`;
  }

  publicUrl(filename: string) {
    return `/uploads/${filename}`;
  }
}
