import type { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';

/**
 * سقفِ بدنهٔ JSON برای اسناد بلاگ (محتوای HTML مقاله + کاور base64).
 * بقیهٔ مسیرها سقفِ پیش‌فرض و امن‌ترِ Nest (`100kb`) را نگه می‌دارند.
 */
export const BLOG_JSON_LIMIT = '1100kb';

/**
 * ثبتِ پارس‌کننده‌های بدنهٔ درخواست.
 *
 * ⚠️ این تابع جای `bodyParser` پیش‌فرضِ Nest را می‌گیرد؛ برنامه باید با
 * `NestFactory.create(AppModule, { bodyParser: false })` ساخته شود.
 *
 * چرا دستی؟ Nest فقط پارس‌کننده‌هایی را اضافه می‌کند که «قبلاً ثبت نشده
 * باشند» و تشخیصش بر اساس *نام تابع* است (`isMiddlewareApplied` در
 * `express-adapter`). خروجیِ `json()` در body-parser تابعی به نام `jsonParser`
 * است؛ پس به‌محضِ ثبتِ یک پارس‌کنندهٔ محدود به مسیر (مثل
 * `app.use('/api/admin/blog', json(...))`)، Nest فکر می‌کند پارس‌کنندهٔ
 * سراسریِ JSON از قبل وجود دارد و **آن را ثبت نمی‌کند**.
 *
 * نتیجه یک باگ واقعی بود: `req.body` در همهٔ مسیرهای بیرون از
 * `/api/admin/blog` خالی می‌ماند و `ValidationPipe` همهٔ فیلدها را «خالی»
 * می‌دید؛ مثلاً `POST /api/bookings/manual` با ۴۰۰ و پیام‌های
 * «clubCustomerId should not be empty / date should not be empty / time should
 * not be empty» رد می‌شد، هرچند بدنهٔ درخواست کامل بود.
 *
 * ترتیب مهم است: اول پارس‌کنندهٔ bلاگ (سقف بالاتر)، بعد سراسری. هر درخواست
 * در اولین middlewareای که content-type‌اش را می‌فهمد پارس می‌شود و
 * `body-parser` بدنهٔ خوانده‌شده را دوباره نمی‌خواند؛ پس سقفِ هر مسیر همان
 * چیزی است که اینجا تعیین می‌شود.
 */
export function setupBodyParsers(app: NestExpressApplication): void {
  app.use('/api/admin/blog', json({ limit: BLOG_JSON_LIMIT }));
  app.use(json());
  app.use(urlencoded({ extended: true }));
}
