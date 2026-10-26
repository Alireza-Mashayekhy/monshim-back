import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BaleNotificationService } from 'src/bale/bale-notification.service';
import { ZohalService } from 'src/common/services/zohal.service';
import { User } from 'src/users/entities/user.entity';
import { DataSource } from 'typeorm';

import { BankCard } from './entities/bank-card.entity';
import { Transaction } from './entities/transaction.entity';
import { Wallet } from './entities/wallet.entity';
import { WalletService } from './wallet.service';

describe('WalletService - addCard', () => {
  let service: WalletService;
  let walletRepo: any;
  let bankCardRepo: any;
  let userRepo: any;
  let zohalService: any;
  let baleNotificationService: any;
  let dataSource: any;

  beforeEach(async () => {
    walletRepo = {
      findOne: jest.fn(),
      upsert: jest.fn(),
    };

    bankCardRepo = {
      findOne: jest.fn(),
      count: jest.fn(),
      create: jest.fn(dto => ({ id: 'card-1', ...dto })),
      save: jest.fn(card => Promise.resolve(card)),
      delete: jest.fn(),
    };

    userRepo = {
      findOne: jest.fn(),
      save: jest.fn(u => Promise.resolve(u)),
    };

    zohalService = {
      verifyCardAndIbanOwnership: jest.fn(),
    };

    baleNotificationService = {
      notifyWithdrawalRequested: jest.fn().mockResolvedValue(undefined),
    };

    dataSource = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: getRepositoryToken(Wallet), useValue: walletRepo },
        { provide: getRepositoryToken(Transaction), useValue: {} },
        { provide: getRepositoryToken(BankCard), useValue: bankCardRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: ZohalService, useValue: zohalService },
        {
          provide: BaleNotificationService,
          useValue: baleNotificationService,
        },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
  });

  it('throws BadRequestException if card already exists for user', async () => {
    bankCardRepo.findOne.mockResolvedValueOnce({ id: 'existing-card' });

    await expect(
      service.addCard(1, {
        bankName: 'بانک پاسارگاد',
        cardNumber: '6037991812345678',
        shebaNumber: 'IR123456789012345678901234',
        ownerName: 'علی رضایی',
        nationalCode: '0010321268',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException if user does not exist', async () => {
    bankCardRepo.findOne.mockResolvedValueOnce(null);
    userRepo.findOne.mockResolvedValueOnce(null);

    await expect(
      service.addCard(999, {
        bankName: 'بانک پاسارگاد',
        cardNumber: '6037991812345678',
        shebaNumber: 'IR123456789012345678901234',
        ownerName: 'علی رضایی',
        nationalCode: '0010321268',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException if neither user nor dto has national code', async () => {
    bankCardRepo.findOne.mockResolvedValueOnce(null);
    userRepo.findOne.mockResolvedValueOnce({
      id: 1,
      fullName: 'علی رضایی',
      phone: '09121111111',
      nationalCode: null,
    });

    await expect(
      service.addCard(1, {
        bankName: 'بانک پاسارگاد',
        cardNumber: '6037991812345678',
        shebaNumber: 'IR123456789012345678901234',
        ownerName: 'علی رضایی',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException if national code is invalid checksum', async () => {
    bankCardRepo.findOne.mockResolvedValueOnce(null);
    userRepo.findOne.mockResolvedValueOnce({
      id: 1,
      fullName: 'علی رضایی',
      phone: '09121111111',
      nationalCode: null,
    });

    await expect(
      service.addCard(1, {
        bankName: 'بانک پاسارگاد',
        cardNumber: '6037991812345678',
        shebaNumber: 'IR123456789012345678901234',
        ownerName: 'علی رضایی',
        nationalCode: '1111111111',
      }),
    ).rejects.toThrow('کد ملی وارد شده معتبر نیست');
  });

  it('saves nationalCode to user if missing in user profile and adds card successfully', async () => {
    const user = {
      id: 1,
      fullName: 'علی رضایی',
      phone: '09121111111',
      nationalCode: null,
    };
    bankCardRepo.findOne.mockResolvedValueOnce(null);
    userRepo.findOne
      .mockResolvedValueOnce(user) // for find user by id
      .mockResolvedValueOnce(null); // for checking existing user by nationalCode
    bankCardRepo.count.mockResolvedValueOnce(0);

    zohalService.verifyCardAndIbanOwnership.mockResolvedValueOnce({
      name: 'علی رضایی',
      bank_name: 'بانک پاسارگاد',
      iban: 'IR123456789012345678901234',
      cardNumber: '6037991812345678',
      nationalCode: '0010321268',
    });

    const result = await service.addCard(1, {
      bankName: 'بانک پاسارگاد',
      cardNumber: '6037991812345678',
      shebaNumber: 'IR123456789012345678901234',
      ownerName: 'علی رضایی',
      nationalCode: '0010321268',
    });

    expect(user.nationalCode).toBe('0010321268');
    expect(userRepo.save).toHaveBeenCalledWith(user);
    expect(zohalService.verifyCardAndIbanOwnership).toHaveBeenCalledWith({
      card: '6037991812345678',
      iban: 'IR123456789012345678901234',
      nationalCode: '0010321268',
      userFullName: 'علی رضایی',
      userPhone: '09121111111',
    });
    expect(result.cardNumber).toBe('6037991812345678');
    expect(result.isDefault).toBe(true);
  });

  it('throws BadRequestException if dto nationalCode does not match user profile nationalCode', async () => {
    const user = {
      id: 1,
      fullName: 'علی رضایی',
      phone: '09121111111',
      nationalCode: '0010321268',
    };
    bankCardRepo.findOne.mockResolvedValueOnce(null);
    userRepo.findOne.mockResolvedValueOnce(user);

    await expect(
      service.addCard(1, {
        bankName: 'بانک پاسارگاد',
        cardNumber: '6037991812345678',
        shebaNumber: 'IR123456789012345678901234',
        ownerName: 'علی رضایی',
        nationalCode: '0084545941',
      }),
    ).rejects.toThrow(
      'کد ملی وارد شده با کد ملی ثبت‌شده در پروفایل شما مغایرت دارد',
    );
  });

  it('sends Bale notification when barber submits a withdrawal request', async () => {
    const card = {
      id: 'card-9',
      userId: 10,
      bankName: 'بانک ملت',
      cardNumber: '6104337700001111',
      shebaNumber: 'IR120120000000001234567890',
      ownerName: 'علی رضایی',
    };
    bankCardRepo.findOne.mockResolvedValueOnce(card);

    const walletRow = { id: 'wal-10', userId: 10, balance: 1_500_000 };
    walletRepo.findOne.mockResolvedValueOnce(walletRow);
    const createdTx = {
      id: 'tx-wd-1',
      walletId: 'wal-10',
      amount: 1_000_000,
    };

    dataSource.transaction.mockImplementationOnce(
      async (cb: (manager: any) => Promise<any>) =>
        cb({
          getRepository: () => ({
            createQueryBuilder: () => ({
              where: () => ({
                setLock: () => ({
                  getOne: () => Promise.resolve(walletRow),
                }),
              }),
            }),
          }),
          create: jest.fn((_entity: unknown, payload: any) => ({
            ...createdTx,
            ...payload,
          })),
          save: jest.fn((entity: any) => Promise.resolve(entity)),
        }),
    );

    const res = await service.requestWithdraw(10, {
      amount: 1_000_000,
      cardId: 'card-9',
      description: 'تسویه آخر هفته',
    });

    expect(walletRow.balance).toBe(500_000);
    expect(res.transaction.amount).toBe(1_000_000);
    expect(
      baleNotificationService.notifyWithdrawalRequested,
    ).toHaveBeenCalledTimes(1);
    expect(
      baleNotificationService.notifyWithdrawalRequested,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 10,
        card,
        remainingBalance: 500_000,
        note: 'تسویه آخر هفته',
      }),
    );
  });

  it('does NOT persist unverified nationalCode onto user if Zohal verification rejects', async () => {
    const user = {
      id: 1,
      fullName: 'علیرضا مشایخی',
      phone: '09121111111',
      nationalCode: null,
    };
    bankCardRepo.findOne.mockResolvedValueOnce(null);
    userRepo.findOne.mockResolvedValueOnce(user).mockResolvedValueOnce(null);

    zohalService.verifyCardAndIbanOwnership.mockRejectedValueOnce(
      new BadRequestException('شماره موبایل وارد شده با کد ملی مطابقت ندارد'),
    );

    await expect(
      service.addCard(1, {
        bankName: 'سامان',
        cardNumber: '6219861942641811',
        shebaNumber: 'IR880560611828005582138801',
        ownerName: 'علیرضا مشایخی',
        nationalCode: '0521288622',
      }),
    ).rejects.toThrow('شماره موبایل وارد شده با کد ملی مطابقت ندارد');

    expect(user.nationalCode).toBeNull();
    expect(userRepo.save).not.toHaveBeenCalled();
  });
});
