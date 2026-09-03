// files/files.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import {
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_IMAGE_MIME_TYPES,
} from 'src/common/constants/constants';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FilesService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  constructor() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  saveFile(file: Express.Multer.File, subFolder: string = ''): string {
    this.assertSafeImage(file);

    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${uuidv4()}${ext}`;
    const safeFolder = subFolder.replace(/[^a-zA-Z0-9_-]/g, '');
    const folderPath = path.join(this.uploadDir, safeFolder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    const filePath = path.join(folderPath, filename);
    fs.writeFileSync(filePath, file.buffer);
    // بازگرداندن مسیر نسبی (شامل ساب‌فولدر)
    return safeFolder
      ? `/uploads/${safeFolder}/${filename}`
      : `/uploads/${filename}`;
  }

  saveMultipleFiles(
    files: Express.Multer.File[],
    subFolder: string = '',
  ): string[] {
    return files.map(file => this.saveFile(file, subFolder));
  }

  deleteFile(filePath: string): { message: string } {
    if (!filePath) {
      return { message: 'مسیر فایل ارائه نشده است' };
    }

    const relativePath = filePath.replace(/^\/uploads\//, '');
    const fullPath = path.resolve(this.uploadDir, relativePath);

    if (!fullPath.startsWith(path.resolve(this.uploadDir) + path.sep)) {
      throw new BadRequestException('مسیر فایل نامعتبر است');
    }

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return { message: 'فایل با موفقیت حذف شد' };
    }

    return { message: 'فایل یافت نشد' };
  }

  private assertSafeImage(file: Express.Multer.File) {
    if (!file?.buffer) {
      throw new BadRequestException('فایل آپلود نشده است');
    }

    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
      throw new BadRequestException('فرمت فایل مجاز نیست');
    }

    if (
      !ALLOWED_IMAGE_MIME_TYPES.includes(
        file.mimetype as (typeof ALLOWED_IMAGE_MIME_TYPES)[number],
      )
    ) {
      throw new BadRequestException('نوع فایل مجاز نیست');
    }
  }
}
