import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { getUploadDir } from 'src/common/utils/upload-path.util';

function configuredMb(name: string, fallback: number, max: number) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value >= 1 && value <= max
    ? value
    : fallback;
}
export const BLOG_IMAGE_LIMIT =
  configuredMb('BLOG_IMAGE_MAX_MB', 5, 50) * 1024 * 1024;
export const BLOG_VIDEO_LIMIT =
  configuredMb('BLOG_VIDEO_MAX_MB', 50, 100) * 1024 * 1024;

@Injectable()
export class BlogMediaService {
  async save(file: Express.Multer.File) {
    if (!file?.buffer?.length)
      throw new BadRequestException('فایل ارسال نشده است');
    const ext = path.extname(file.originalname).toLowerCase();
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'];
    let output: Buffer, suffix: string;
    if (imageExtensions.includes(ext)) {
      if (file.buffer.length > BLOG_IMAGE_LIMIT)
        throw new BadRequestException(
          `حجم تصویر بیش از ${BLOG_IMAGE_LIMIT / 1024 / 1024} مگابایت است`,
        );
      try {
        const image = sharp(file.buffer, {
          animated: true,
          limitInputPixels: 50_000_000,
          failOn: 'error',
        });
        const meta = await image.metadata();
        const formats: Record<string, string[]> = {
          '.jpg': ['jpeg'],
          '.jpeg': ['jpeg'],
          '.png': ['png'],
          '.gif': ['gif'],
          '.webp': ['webp'],
          '.avif': ['heif'],
        };
        if (
          !meta.format ||
          !formats[ext].includes(meta.format) ||
          (ext === '.avif' && meta.compression !== 'av1')
        )
          throw new Error('invalid type');
        output = await image
          .rotate()
          .resize({
            width: 2400,
            height: 2400,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: 85 })
          .toBuffer();
        suffix = '.webp';
      } catch {
        throw new BadRequestException('فایل تصویر معتبر یا پشتیبانی‌شده نیست');
      }
    } else {
      if (file.buffer.length > BLOG_VIDEO_LIMIT)
        throw new BadRequestException(
          `حجم ویدیو بیش از ${BLOG_VIDEO_LIMIT / 1024 / 1024} مگابایت است`,
        );
      const b = file.buffer;
      const mp4 = b.length >= 12 && b.toString('ascii', 4, 8) === 'ftyp';
      const webm =
        b.length >= 4 &&
        b.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
      const ogg = b.length >= 4 && b.toString('ascii', 0, 4) === 'OggS';
      if (!(
        (['.mp4', '.m4v'].includes(ext) && mp4) ||
        (ext === '.webm' && webm) ||
        (ext === '.ogv' && ogg)
      ))
        throw new BadRequestException('فرمت واقعی ویدیو معتبر نیست');
      output = b;
      suffix = ext;
    }
    const dir = getUploadDir('blog');
    await fs.mkdir(dir, { recursive: true });
    const name = `${randomUUID()}${suffix}`;
    await fs.writeFile(path.join(dir, name), output, { flag: 'wx' });
    return { url: `/uploads/blog/${name}` };
  }
}
