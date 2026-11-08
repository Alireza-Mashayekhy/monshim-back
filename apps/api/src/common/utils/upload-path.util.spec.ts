import path from 'node:path';

import { getUploadDir, getUploadRoot } from './upload-path.util';

/**
 * تست مسیر آپلود.
 *
 * چرا اهمیت دارد: اگر مسیر عوض شود، تصاویر آپلودی کاربران «گم» می‌شوند و
 * فایل‌های جدید ممکن است بیرون از volume نوشته شوند (و با هر deploy پاک شوند).
 */
describe('upload path', () => {
  const original = process.env.UPLOAD_DIR;

  afterEach(() => {
    if (original === undefined) delete process.env.UPLOAD_DIR;
    else process.env.UPLOAD_DIR = original;
  });

  it('بدون UPLOAD_DIR همان رفتار قبلی (cwd/uploads) را حفظ می‌کند', () => {
    delete process.env.UPLOAD_DIR;

    expect(getUploadRoot()).toBe(path.join(process.cwd(), 'uploads'));
  });

  it('UPLOAD_DIR را مطلق می‌کند', () => {
    process.env.UPLOAD_DIR = '/backend/uploads';

    expect(getUploadRoot()).toBe('/backend/uploads');
  });

  it('مسیر نسبی در UPLOAD_DIR را نسبت به cwd مطلق می‌کند', () => {
    process.env.UPLOAD_DIR = 'vol/uploads';

    expect(getUploadRoot()).toBe(path.resolve('vol/uploads'));
  });

  it('UPLOAD_DIR خالی را نادیده می‌گیرد', () => {
    process.env.UPLOAD_DIR = '   ';

    expect(getUploadRoot()).toBe(path.join(process.cwd(), 'uploads'));
  });

  it('زیرپوشه را به ریشه می‌چسباند', () => {
    process.env.UPLOAD_DIR = '/backend/uploads';

    expect(getUploadDir('blog')).toBe('/backend/uploads/blog');
  });
});
