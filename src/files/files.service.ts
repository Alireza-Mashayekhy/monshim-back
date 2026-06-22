// files/files.service.ts
import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FilesService {
  private readonly uploadDir = path.join(__dirname, '../../uploads');

  constructor() {
    // ایجاد پوشه uploads اگر وجود ندارد
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  saveFile(file: Express.Multer.File, subFolder: string = ''): string {
    // ایجاد نام یکتا برای فایل
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    const folderPath = path.join(this.uploadDir, subFolder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    const filePath = path.join(folderPath, filename);
    fs.writeFileSync(filePath, file.buffer);
    // برگرداندن مسیر نسبی برای ذخیره در دیتابیس
    return `/uploads/${subFolder}/${filename}`;
  }

  saveMultipleFiles(
    files: Express.Multer.File[],
    subFolder: string = '',
  ): string[] {
    return files.map(file => this.saveFile(file, subFolder));
  }
}
