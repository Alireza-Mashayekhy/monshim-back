import {
  DEPOSIT_TOKEN_BYTES,
  SMS_PARAM_MAX_LENGTH,
} from '../common/constants/constants';
import {
  bookingParams,
  clipForSms,
  depositLinkParams,
  depositPaidBarberParams,
  depositPaidCustomerParams,
  SMS_TEMPLATES,
} from './sms-templates';

const MAX = SMS_PARAM_MAX_LENGTH;

const expectAllParamsWithinLimit = (
  parameters: { name: string; value: string }[],
) => {
  for (const parameter of parameters) {
    expect(parameter.value.length).toBeLessThanOrEqual(MAX);
  }
};

describe('sms-templates', () => {
  it('توکن لینک بیعانه در سقف پارامتر SMS.ir جا می‌شود', () => {
    // توکن لینک بیعانه: DEPOSIT_TOKEN_BYTES بایت به هگز → ۲ کاراکتر برای هر بایت
    expect(DEPOSIT_TOKEN_BYTES * 2).toBeLessThanOrEqual(MAX);
  });

  it('مقدار PAYMENT_LINK دست‌نخورده و بدون کوتاه‌شدن ارسال می‌شود', () => {
    const paymentToken = 'a'.repeat(DEPOSIT_TOKEN_BYTES * 2);

    const parameters = depositLinkParams({
      customerName: 'سارا محمدی',
      salonName: 'سالن زیبایی رز',
      paymentToken,
    });

    expect(parameters).toContainEqual({
      name: 'PAYMENT_LINK',
      value: paymentToken,
    });
    expectAllParamsWithinLimit(parameters);
  });

  it('نام و نام سالن طولانی تا سقف ۲۵ کاراکتر کوتاه می‌شوند', () => {
    const parameters = depositLinkParams({
      customerName: 'سیده فاطمه‌زهرا محمدحسینی مقدم',
      salonName: 'سالن زیبایی و آرایشگاه عروس خانم‌های تهران',
      paymentToken: 'b'.repeat(DEPOSIT_TOKEN_BYTES * 2),
    });

    expectAllParamsWithinLimit(parameters);

    const name = parameters.find(parameter => parameter.name === 'NAME')!;
    const salon = parameters.find(
      parameter => parameter.name === 'SALON_NAME',
    )!;

    expect(name.value.endsWith('…')).toBe(true);
    expect(salon.value.endsWith('…')).toBe(true);
    // خروجی باید از سقف پارامتر پیامک بیشتر نشود، حتی با «…»
    expect(name.value).toHaveLength(MAX);
    expect(salon.value).toHaveLength(MAX);
  });

  it('همه پارامترهای قالب‌های نوبت زیر سقف SMS.ir هستند', () => {
    const parameters = bookingParams({
      customerName: 'مشتری با نام بسیار بسیار طولانی برای تست',
      serviceName: 'کوتاهی مو و اصلاح ریش و ابرو و پارافین‌تراپی',
      date: '2026-10-20',
      time: '12:00',
      salonName: 'سالن تست',
    });

    expectAllParamsWithinLimit(parameters);
    expect(
      parameters.find(parameter => parameter.name === 'DATE')!.value,
    ).toMatch(/^[۰-۹]{4}\/[۰-۹]{2}\/[۰-۹]{2}$/);
  });

  it('از قالب‌های خواسته‌شده برای تغییر ساعت و پرداخت بیعانه استفاده می‌کند', () => {
    expect(SMS_TEMPLATES.BOOKING_TIME_CHANGED_CUSTOMER).toBe(488101);
    expect(SMS_TEMPLATES.DEPOSIT_PAID_BARBER).toBe(798384);
    expect(SMS_TEMPLATES.DEPOSIT_PAID_CUSTOMER).toBe(634504);
  });

  it('پارامترهای پیامک پرداخت بیعانه به آرایشگر را با ترتیب قالب می‌سازد', () => {
    const parameters = depositPaidBarberParams({
      customerName: 'سارا محمدی',
      date: '2026-10-20',
      time: '16:30:00',
    });

    expect(parameters.map(parameter => parameter.name)).toEqual([
      'DATE',
      'TIME',
      'NAME',
    ]);
    expect(parameters).toContainEqual({ name: 'TIME', value: '۱۶:۳۰' });
    expect(parameters).toContainEqual({ name: 'NAME', value: 'سارا محمدی' });
    expectAllParamsWithinLimit(parameters);
  });

  it('پارامترهای پیامک پرداخت موفق بیعانه به مشتری (634504) را با ترتیب قالب می‌سازد', () => {
    const parameters = depositPaidCustomerParams({
      date: '2026-10-20',
      time: '14:00:00',
      salonName: 'سالن زیبایی و تخصصی عروس خانم‌های تهران',
    });

    expect(parameters.map(parameter => parameter.name)).toEqual([
      'DATE',
      'TIME',
      'SALON_NAME',
    ]);
    expect(parameters[0].value).toMatch(/^[۰-۹]{4}\/[۰-۹]{2}\/[۰-۹]{2}$/);
    expect(parameters).toContainEqual({ name: 'TIME', value: '۱۴:۰۰' });
    expectAllParamsWithinLimit(parameters);
  });
});

describe('clipForSms', () => {
  it('فاصله‌های اضافی را جمع می‌کند', () => {
    expect(clipForSms('  علی   رضایی  ')).toBe('علی رضایی');
  });

  it('مقدار خالی را با پیش‌فرض جایگزین می‌کند', () => {
    expect(clipForSms(null, 'مشتری')).toBe('مشتری');
    expect(clipForSms('   ', 'سالن')).toBe('سالن');
  });

  it('مقدار بلندتر از سقف را با … کوتاه می‌کند', () => {
    const clipped = clipForSms('ا'.repeat(40));

    expect(clipped).toHaveLength(MAX);
    expect(clipped.endsWith('…')).toBe(true);
  });

  it('مقدار داخل سقف را تغییر نمی‌دهد', () => {
    expect(clipForSms('سالن رز')).toBe('سالن رز');
  });
});
