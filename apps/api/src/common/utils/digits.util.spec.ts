import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { SendOtpDto } from 'src/auth/dto/send-otp.dto';
import { SendVerifyOtp } from 'src/auth/dto/verify-otp.dto';
import { BarberQueryDto } from 'src/barber/dto/barber-query.dto';
import { ChargeWalletDto } from 'src/payment/dto/charge-wallet.dto';
import { CreateServiceDto } from 'src/services/dto/create-service.dto';
import { UpdateServiceDto } from 'src/services/dto/update-service.dto';
import { UpdateSiteSettingsDto } from 'src/settings/dto/update-setting.dto';
import { UpdateSubscriptionPlanDto } from 'src/subscription/dto/update-subscription.dto';
import { CreateCardDto } from 'src/wallet/dto/create-card.dto';
import { WithdrawRequestDto } from 'src/wallet/dto/withdraw-request.dto';

import {
  normalizeNumberValue,
  normalizeNumericString,
  toEnglishDigits,
} from './digits.util';

describe('digits.util', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  });

  describe('toEnglishDigits', () => {
    it('converts Persian and Arabic-Indic digits while preserving other text', () => {
      expect(toEnglishDigits('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789');
      expect(toEnglishDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
      expect(toEnglishDigits('قیمت ۲۵۰,۰۰۰ تومان - کد ٤٥')).toBe(
        'قیمت 250,000 تومان - کد 45',
      );
    });
  });

  describe('normalizeNumericString & normalizeNumberValue', () => {
    it('normalizes Persian/Arabic numbers, separators, and decimal marks', () => {
      expect(normalizeNumericString('۱٬۲۵۰,۰۰۰')).toBe('1250000');
      expect(normalizeNumericString('۱۲٫۷۵')).toBe('12.75');
      expect(normalizeNumberValue('۲۵۰,۰۰۰')).toBe(250000);
      expect(normalizeNumberValue('٢٠٫٥')).toBe(20.5);
      expect(normalizeNumberValue(150000)).toBe(150000);
      expect(normalizeNumberValue('invalid')).toBe('invalid');
    });
  });

  describe('ValidationPipe DTO integration with enableImplicitConversion', () => {
    it('accepts Persian digits in CreateServiceDto & UpdateServiceDto', async () => {
      const created = await pipe.transform(
        {
          name: 'اصلاح مو و صورت',
          price: '۲۵۰,۰۰۰',
          depositPrice: '۱۰۰٬۰۰۰',
          durationMinutes: '۴۵',
        },
        { type: 'body', metatype: CreateServiceDto },
      );

      expect(created).toMatchObject({
        name: 'اصلاح مو و صورت',
        price: 250000,
        depositPrice: 100000,
        durationMinutes: 45,
      });

      const updated = await pipe.transform(
        { price: '۳۲۰,۰۰۰' },
        { type: 'body', metatype: UpdateServiceDto },
      );
      expect(updated.price).toBe(320000);
    });

    it('accepts Persian and Arabic digits in wallet, payment, settings, and subscription DTOs', async () => {
      const withdraw = await pipe.transform(
        { amount: '۱۵۰,۰۰۰', cardId: 'card-1' },
        { type: 'body', metatype: WithdrawRequestDto },
      );
      expect(withdraw.amount).toBe(150000);

      const charge = await pipe.transform(
        { amount: '۵۰,۰۰۰' },
        { type: 'body', metatype: ChargeWalletDto },
      );
      expect(charge.amount).toBe(50000);

      const settings = await pipe.transform(
        { depositPercent: '۲۰٫۵', commissionPercent: '١٢.٢٥' },
        { type: 'body', metatype: UpdateSiteSettingsDto },
      );
      expect(settings).toMatchObject({
        depositPercent: 20.5,
        commissionPercent: 12.25,
      });

      const plan = await pipe.transform(
        { price: '۱۹۹,۰۰۰', smsCount: '۲۵۰' },
        { type: 'body', metatype: UpdateSubscriptionPlanDto },
      );
      expect(plan).toMatchObject({
        price: 199000,
        smsCount: 250,
      });
    });

    it('accepts Persian digits in OTP, phone, bank card, and explore filter DTOs', async () => {
      const sendOtp = await pipe.transform(
        { phone: '۰۹۱۲۳۴۵۶۷۸۹' },
        { type: 'body', metatype: SendOtpDto },
      );
      expect(sendOtp.phone).toBe('09123456789');

      const verifyOtp = await pipe.transform(
        { phone: '٠٩١٢٣٤٥٦٧٨٩', code: '۱۲۳۴' },
        { type: 'body', metatype: SendVerifyOtp },
      );
      expect(verifyOtp).toMatchObject({
        phone: '09123456789',
        code: '1234',
      });

      const card = await pipe.transform(
        {
          bankName: 'ملت',
          cardNumber: '۶۰۳۷ ۹۹۱۸ ۱۲۳۴ ۵۶۷۸',
          shebaNumber: 'ir ۱۲۰۱ ۷۰۰۰ ۰۰۰۰ ۱۲۳۴ ۵۶۷۸ ۹۰۱۲',
          ownerName: 'علی رضایی',
          nationalCode: '۰۰۱۰۳۲۱۲۶۸',
        },
        { type: 'body', metatype: CreateCardDto },
      );
      expect(card).toMatchObject({
        cardNumber: '6037991812345678',
        shebaNumber: 'IR120170000000123456789012',
        nationalCode: '0010321268',
      });

      const barberQuery = await pipe.transform(
        {
          page: '۲',
          limit: '۱۲',
          cityId: '۵',
          provinceId: '۸',
          minPrice: '۱۰۰,۰۰۰',
          maxPrice: '۵۰۰,۰۰۰',
          minRating: '۴',
        },
        { type: 'query', metatype: BarberQueryDto },
      );
      expect(barberQuery).toMatchObject({
        page: 2,
        limit: 12,
        cityId: 5,
        provinceId: 8,
        minPrice: 100000,
        maxPrice: 500000,
        minRating: 4,
      });
    });

    it('still rejects non-numeric strings on numeric DTO fields', async () => {
      await expect(
        pipe.transform(
          { name: 'اصلاح', price: 'رایگان', durationMinutes: 30 },
          { type: 'body', metatype: CreateServiceDto },
        ),
      ).rejects.toThrow();
    });
  });
});
