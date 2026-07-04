// files/files.service.ts
import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FilesService {
  private readonly uploadDir = path.join(__dirname, '../../uploads');

  constructor() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  saveFile(file: Express.Multer.File, subFolder: string = ''): string {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    const folderPath = path.join(this.uploadDir, subFolder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    const filePath = path.join(folderPath, filename);
    fs.writeFileSync(filePath, file.buffer);
    // بازگرداندن مسیر نسبی (شامل ساب‌فولدر)
    return `/uploads/${subFolder}/${filename}`;
  }

  saveMultipleFiles(
    files: Express.Multer.File[],
    subFolder: string = '',
  ): string[] {
    return files.map(file => this.saveFile(file, subFolder));
  }

  /**
   * حذف فایل با دریافت مسیر نسبی ذخیره‌شده در دیتابیس
   * مثال: `/uploads/profiles/abc-123.jpg`
   */
  deleteFile(filePath: string): { message: string } {
    if (!filePath) {
      return { message: 'مسیر فایل ارائه نشده است' };
    }

    // حذف پیشوند `/uploads/` برای استخراج مسیر نسبی داخل پوشه uploads
    const relativePath = filePath.replace(/^\/uploads\//, '');
    const fullPath = path.join(this.uploadDir, relativePath);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return { message: 'فایل با موفقیت حذف شد' };
    }

    return { message: 'فایل یافت نشد' };
  }
}
