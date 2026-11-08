import { Body, Controller, Post, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { CreateManualBookingDto } from 'src/club/dto/create-manual-booking.dto';
import request from 'supertest';

import { setupBodyParsers } from './body-parsers.config';

/**
 * تستِ بازگشتی برای باگ واقعیِ «ثبت رزرو دستی ۴۰۰ می‌دهد».
 *
 * ریشه: در `main.ts` یک پارس‌کنندهٔ JSON محدود به مسیر بلاگ ثبت شده بود:
 *
 *     app.use('/api/admin/blog', json({ limit: '1100kb' }));
 *
 * `NestFactory` پارس‌کنندهٔ پیش‌فرضِ بدنه را فقط وقتی اضافه می‌کند که
 * پارس‌کننده‌ای با همان *نام تابع* قبلاً ثبت نشده باشد
 * (`isMiddlewareApplied` در `express-adapter`). خروجی `json()` هم تابعی به نام
 * `jsonParser` است؛ پس Nest پارس‌کنندهٔ سراسری را اضافه نمی‌کرد و `req.body`
 * بیرون از `/api/admin/blog` همیشه خالی می‌ماند.
 *
 * نتیجه: ValidationPipe همهٔ فیلدهای `CreateManualBookingDto` را خالی می‌دید و
 * `POST /api/bookings/manual` با ۴۰۰ و پیام‌های
 * «clubCustomerId should not be empty»، «date should not be empty»،
 * «time should not be empty» رد می‌شد — در حالی که بدنهٔ درخواست کامل بود.
 *
 * این تست همان ترتیبِ پارس‌کننده‌های `main.ts` را بازسازی می‌کند تا اگر دوباره
 * کسی پارس‌کنندهٔ scoped را قبل از پارس‌کنندهٔ سراسری (یا بدون خاموش‌کردن
 * پارسر پیش‌فرض Nest) ثبت کند، شکست بخورد.
 */
@Controller('bookings')
class StubBookingsController {
  @Post('manual')
  createManual(@Body() dto: CreateManualBookingDto) {
    return dto;
  }
}

@Controller('admin/blog')
class StubBlogController {
  @Post()
  create(@Body() dto: Record<string, unknown>) {
    return { receivedBytes: JSON.stringify(dto ?? {}).length };
  }
}

const MANUAL_BOOKING_PAYLOAD = {
  clubCustomerId: 'd014dc3b-9a9a-4c21-98cc-1f9de056d101',
  serviceId: '455c52de-98c8-45e2-91b1-e2db729f60db',
  serviceIds: ['455c52de-98c8-45e2-91b1-e2db729f60db'],
  date: '2026-11-06',
  time: '11:00',
  sendDepositLink: true,
  sendSmsReminder: false,
};

/** بیش از سقف پیش‌فرض ۱۰۰kb و کمتر از سقف ۱۱۰۰kb مسیر بلاگ */
const LARGE_BODY = { content: 'ی'.repeat(300_000) };

describe('body parsers (همان ترتیب main.ts)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [StubBookingsController, StubBlogController],
    }).compile();

    // مثل main.ts: پارس‌کنندهٔ پیش‌فرض Nest خاموش و پارس‌کننده‌ها دستی ثبت می‌شوند
    app = moduleRef.createNestApplication({ bodyParser: false });
    app.setGlobalPrefix('api');
    setupBodyParsers(app);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/bookings/manual بدنه را می‌گیرد و ۴۰۰ نمی‌دهد', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/bookings/manual')
      .send(MANUAL_BOOKING_PAYLOAD)
      .expect(201);

    expect(response.body).toMatchObject({
      clubCustomerId: MANUAL_BOOKING_PAYLOAD.clubCustomerId,
      date: MANUAL_BOOKING_PAYLOAD.date,
      time: MANUAL_BOOKING_PAYLOAD.time,
      sendDepositLink: true,
      sendSmsReminder: false,
    });
    expect(response.body.serviceIds).toEqual(MANUAL_BOOKING_PAYLOAD.serviceIds);
  });

  it('بدنهٔ نامعتبر همچنان ۴۰۰ می‌گیرد (اعتبارسنجی خاموش نشده)', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/bookings/manual')
      .send({ date: '2026-11-06' })
      .expect(400);

    expect(response.body.message).toEqual(
      expect.arrayContaining(['clubCustomerId should not be empty']),
    );
  });

  it('مسیر بلاگ بدنهٔ بزرگ‌تر از سقف پیش‌فرض را می‌پذیرد', async () => {
    await request(app.getHttpServer())
      .post('/api/admin/blog')
      .send(LARGE_BODY)
      .expect(201);
  });

  it('بقیهٔ مسیرها همان سقف پیش‌فرض ۱۰۰kb را نگه می‌دارند', async () => {
    await request(app.getHttpServer())
      .post('/api/bookings/manual')
      .send({ ...MANUAL_BOOKING_PAYLOAD, note: 'ی'.repeat(300_000) })
      .expect(413);
  });
});
