// files/files.service.ts
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import {
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_IMAGE_FORMATS,
  ALLOWED_IMAGE_MIME_TYPES,
  IMAGE_MAX_DIMENSION,
  IMAGE_MAX_INPUT_PIXELS,
  IMAGE_MAX_SIZE_BYTES,
  IMAGE_WEBP_QUALITY,
  OUTPUT_IMAGE_EXTENSION,
} from 'src/common/constants/constants';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  constructor() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveFile(
    file: Express.Multer.File,
    subFolder: string = '',
  ): Promise<string> {
    this.assertSafeImage(file);

    const optimizedBuffer = await this.optimizeToWebp(file.buffer);

    const filename = `${uuidv4()}${OUTPUT_IMAGE_EXTENSION}`;
    const safeFolder = subFolder.replace(/[^a-zA-Z0-9_-]/g, '');
    const folderPath = path.join(this.uploadDir, safeFolder);
    await fs.promises.mkdir(folderPath, { recursive: true });

    const filePath = path.join(folderPath, filename);
    await fs.promises.writeFile(filePath, optimizedBuffer);

    // بازگرداندن مسیر نسبی (شامل ساب‌فولدر)
    return safeFolder
      ? `/uploads/${safeFolder}/${filename}`
      : `/uploads/${filename}`;
  }

  async saveMultipleFiles(
    files: Express.Multer.File[],
    subFolder: string = '',
  ): Promise<string[]> {
    return Promise.all(files.map(file => this.saveFile(file, subFolder)));
  }

  deleteFiles(filePaths: string[]): void {
    for (const filePath of filePaths) {
      try {
        this.deleteFile(filePath);
      } catch (error) {
        this.logger.warn(`failed to delete file ${filePath}: ${String(error)}`);
      }
    }
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

  private async optimizeToWebp(buffer: Buffer): Promise<Buffer> {
    try {
      const image = sharp(buffer, {
        animated: true, // حفظ انیمیشن gif
        limitInputPixels: IMAGE_MAX_INPUT_PIXELS,
        failOn: 'error',
      });

      // فرمت واقعی فایل باید از روی محتوا تشخیص داده شود، نه پسوند/میم‌تایپ
      const meta = await image.metadata();
      const { format } = meta;
      if (
        !format ||
        !ALLOWED_IMAGE_FORMATS.includes(
          format as (typeof ALLOWED_IMAGE_FORMATS)[number],
        )
      ) {
        throw new BadRequestException('فرمت تصویر مجاز نیست');
      }

      // برای تصاویر چندفریمی، ارتفاع هر فریم ملاک است
      const frameHeight =
        meta.pages && meta.pages > 1 ? meta.pageHeight : meta.height;
      const withinLimits =
        !!meta.width &&
        !!frameHeight &&
        meta.width <= IMAGE_MAX_DIMENSION &&
        frameHeight <= IMAGE_MAX_DIMENSION;

      const optimized = await image
        .rotate() // اصلاح چرخش بر اساس EXIF
        .resize({
          width: IMAGE_MAX_DIMENSION,
          height: IMAGE_MAX_DIMENSION,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: IMAGE_WEBP_QUALITY, effort: 4 })
        .toBuffer();

      // اگر ورودی از قبل webp و در محدودهٔ ابعاد بوده و تبدیل ما حجمش را
      // بیشتر کرده، همان فایل اصلی بهینه‌تر است و نگه داشته می‌شود.
      if (
        format === 'webp' &&
        withinLimits &&
        optimized.length >= buffer.length
      ) {
        this.logger.debug('webp input kept as-is (re-encode was larger)');
        return buffer;
      }

      return optimized;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.warn(`image optimization failed: ${String(error)}`);

      const message = String(error);
      if (message.includes('pixel limit') || message.includes('exceeds')) {
        throw new BadRequestException('ابعاد تصویر بیش از حد مجاز است');
      }

      throw new BadRequestException('فایل ارسالی تصویر معتبری نیست');
    }
  }

  private assertSafeImage(file: Express.Multer.File) {
    if (!file?.buffer) {
      throw new BadRequestException('فایل آپلود نشده است');
    }

    if (file.size && file.size > IMAGE_MAX_SIZE_BYTES) {
      throw new BadRequestException(
        `حجم فایل نباید بیشتر از ${IMAGE_MAX_SIZE_BYTES / (1024 * 1024 * 3)}MB باشد`,
      );
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
