import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BaleNotificationService } from 'src/bale/bale-notification.service';
import { ZohalService } from 'src/common/services/zohal.service';
import { BookingSmsService } from 'src/notification/booking-sms.service';
import { SMS_TEMPLATES } from 'src/notification/sms-templates';
import { User } from 'src/users/entities/user.entity';
import { DataSource } from 'typeorm';

import { BankCard } from './entities/bank-card.entity';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from './entities/transaction.entity';
import { Wallet } from './entities/wallet.entity';
import { WalletService } from './wallet.service';

const BARBER_PHONE = '09123456789';

const buildPendingWithdrawal = (): Transaction =>
  ({
    id: 'tx-wd-1',
    walletId: 'wal-1',
    amount: 250_000,
    type: TransactionType.WITHDRAWAL,
    status: TransactionStatus.PENDING,
    description: 'تسویه هفتگی',
    referenceId: 'card-1',
  }) as Transaction;

const buildModule = async (options: {
  transaction?: Transaction | null;
  walletUser?: Partial<User> | null;
  sendSms?: jest.Mock;
}): Promise<{
  service: WalletService;
  transactionRepo: any;
  walletRepo: any;
  bookingSmsService: any;
}> => {
  const transaction =
    options.transaction === undefined
      ? buildPendingWithdrawal()
      : options.transaction;
  const walletUser =
    options.walletUser === undefined
      ? ({ id: 7, fullName: 'علی رضایی', phone: BARBER_PHONE } as Partial<User>)
      : options.walletUser;

  // بار اول (بررسی وضعیت) تراکنش در انتظار است؛ بار دوم بعد از update،
  // همان تراکنش با وضعیت نهایی‌شده برمی‌گردد.
  const transactionRepo = {
    findOne: jest
      .fn()
      .mockResolvedValueOnce(transaction)
      .mockResolvedValue(
        transaction
          ? { ...transaction, status: TransactionStatus.COMPLETED }
          : null,
      ),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const walletRepo = {
    findOne: jest
      .fn()
      .mockResolvedValue(
        walletUser
          ? { id: 'wal-1', userId: walletUser.id, user: walletUser }
          : null,
      ),
  };

  const bookingSmsService = {
    sendWithdrawalPaidToBarber:
      options.sendSms ?? jest.fn().mockResolvedValue(undefined),
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      WalletService,
      { provide: getRepositoryToken(Wallet), useValue: walletRepo },
      { provide: getRepositoryToken(Transaction), useValue: transactionRepo },
      { provide: getRepositoryToken(BankCard), useValue: {} },
      { provide: getRepositoryToken(User), useValue: {} },
      { provide: ZohalService, useValue: {} },
      { provide: BaleNotificationService, useValue: {} },
      { provide: DataSource, useValue: {} },
      { provide: BookingSmsService, useValue: bookingSmsService },
    ],
  }).compile();

  return {
    service: module.get<WalletService>(WalletService),
    transactionRepo,
    walletRepo,
    bookingSmsService,
  };
};

describe('WalletService - تایید برداشت و پیامک واریز (قالب 142864)', () => {
  it('بعد از تایید ادمین، پیامک واریز با نام و موبایل آرایشگر ارسال می‌شود', async () => {
    const { service, transactionRepo, bookingSmsService } = await buildModule(
      {},
    );

    const result = await service.approveWithdrawal('tx-wd-1', 'TRX-9988');

    expect(transactionRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'tx-wd-1',
        type: TransactionType.WITHDRAWAL,
        status: TransactionStatus.PENDING,
      }),
      expect.objectContaining({ status: TransactionStatus.COMPLETED }),
    );
    expect(result?.status).toBe(TransactionStatus.COMPLETED);
    expect(bookingSmsService.sendWithdrawalPaidToBarber).toHaveBeenCalledTimes(
      1,
    );
    expect(bookingSmsService.sendWithdrawalPaidToBarber).toHaveBeenCalledWith(
      BARBER_PHONE,
      { barberName: 'علی رضایی' },
    );
  });

  it('قالب پیامک واریز برداشت همان 142864 است', () => {
    expect(SMS_TEMPLATES.WITHDRAWAL_PAID_BARBER).toBe(142864);
  });

  it('خطای ارسال پیامک، تایید برداشت را ناموفق نمی‌کند', async () => {
    const sendSms = jest
      .fn()
      .mockRejectedValue(new Error('SMS.ir در دسترس نیست'));
    const { service, bookingSmsService } = await buildModule({ sendSms });

    const result = await service.approveWithdrawal('tx-wd-1');

    expect(bookingSmsService.sendWithdrawalPaidToBarber).toHaveBeenCalledTimes(
      1,
    );
    expect(result?.status).toBe(TransactionStatus.COMPLETED);
  });

  it('برای درخواستی که در وضعیت انتظار نیست، پیامکی فرستاده نمی‌شود', async () => {
    const alreadyCompleted = {
      ...buildPendingWithdrawal(),
      status: TransactionStatus.COMPLETED,
    } as Transaction;
    const { service, bookingSmsService } = await buildModule({
      transaction: alreadyCompleted,
    });

    await expect(service.approveWithdrawal('tx-wd-1')).rejects.toThrow(
      BadRequestException,
    );
    expect(bookingSmsService.sendWithdrawalPaidToBarber).not.toHaveBeenCalled();
  });

  it('اگر برداشت پیدا نشود نه تایید انجام می‌شود و نه پیامکی می‌رود', async () => {
    const { service, bookingSmsService } = await buildModule({
      transaction: null,
    });

    await expect(service.approveWithdrawal('tx-missing')).rejects.toThrow(
      NotFoundException,
    );
    expect(bookingSmsService.sendWithdrawalPaidToBarber).not.toHaveBeenCalled();
  });

  it('اگر شماره موبایل آرایشگر در دسترس نباشد، ارسال پیامک صرف‌نظر می‌شود', async () => {
    const { service, bookingSmsService } = await buildModule({
      walletUser: { id: 7, fullName: 'علی رضایی', phone: undefined },
    });

    const result = await service.approveWithdrawal('tx-wd-1');

    expect(bookingSmsService.sendWithdrawalPaidToBarber).not.toHaveBeenCalled();
    expect(result?.status).toBe(TransactionStatus.COMPLETED);
  });

  it('اگر سرویس پیامک تزریق نشده باشد (ماژول بدون نوتیفیکیشن)، تایید همچنان کار می‌کند', async () => {
    const transaction = buildPendingWithdrawal();
    const transactionRepo = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(transaction)
        .mockResolvedValue({
          ...transaction,
          status: TransactionStatus.COMPLETED,
        }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: getRepositoryToken(Wallet),
          useValue: { findOne: jest.fn() },
        },
        { provide: getRepositoryToken(Transaction), useValue: transactionRepo },
        { provide: getRepositoryToken(BankCard), useValue: {} },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: ZohalService, useValue: {} },
        { provide: BaleNotificationService, useValue: {} },
        { provide: DataSource, useValue: {} },
      ],
    }).compile();

    const service = module.get<WalletService>(WalletService);

    const result = await service.approveWithdrawal('tx-wd-1');

    expect(result?.status).toBe(TransactionStatus.COMPLETED);
  });
});
