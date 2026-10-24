import {
  TransactionStatus,
  TransactionType,
} from './entities/transaction.entity';
import { WalletService } from './wallet.service';

describe('WalletService.getTransactions (امور مالی آرایشگر)', () => {
  function createMockQueryBuilder(result: { data?: any[]; total?: number }) {
    const qb: any = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest
        .fn()
        .mockResolvedValue([result.data ?? [], result.total ?? 0]),
    };
    return qb;
  }

  function createService(qb: any) {
    const walletRepo: any = {
      findOne: jest.fn().mockResolvedValue({ id: 'wallet-1', balance: 0 }),
      upsert: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    const transactionRepo: any = {
      createQueryBuilder: jest.fn(() => qb),
    };

    const service = new WalletService(
      walletRepo,
      transactionRepo,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    return { service, transactionRepo };
  }

  it('فقط درآمدِ متصل به پرداخت موفق درگاه و برداشت‌ها را برمی‌گرداند', async () => {
    const qb = createMockQueryBuilder({
      data: [
        {
          id: 'tx-1',
          amount: '100000',
          type: TransactionType.DEPOSIT,
          status: TransactionStatus.COMPLETED,
          description: 'درآمد رزرو نوبت ORD-1 - منشیم',
          referenceId: 'pay-1',
        },
      ],
      total: 1,
    });
    const { service } = createService(qb);

    const result = await service.getTransactions(7, { page: 1, limit: 10 });

    // فقط تراکنش موفق؛ ناموفق‌ها هیچ‌وقت به آرایشگر نشان داده نمی‌شوند
    expect(qb.andWhere).toHaveBeenCalledWith(
      'transaction.status != :failedStatus',
      { failedStatus: TransactionStatus.FAILED },
    );

    // کسر کیف پول آرایشگر بابت لغو رزرو پنهان می‌شود
    const cancellationFilter = qb.andWhere.mock.calls.find(
      ([sql]: [string]) =>
        typeof sql === 'string' && sql.includes('cancellationDebitPrefix'),
    );
    expect(cancellationFilter).toBeTruthy();

    // واریز درآمد رزرو فقط با پرداخت موفقِ برگشت‌نخوردهٔ درگاه معتبر است
    const creditFilter = qb.andWhere.mock.calls.find(
      ([sql]: [string]) =>
        typeof sql === 'string' && sql.includes('bookingCreditPattern'),
    );
    expect(creditFilter).toBeTruthy();
    expect(creditFilter[0]).toContain('gatewayPayment.id IS NOT NULL');
    expect(creditFilter[0]).toContain('SELECT refund_tx.referenceId');
    expect(creditFilter[1]).toEqual(
      expect.objectContaining({
        bookingCreditPattern: 'درآمد رزرو نوبت%',
        refundTxType: TransactionType.REFUND,
      }),
    );

    expect(qb.leftJoin).toHaveBeenCalledWith(
      expect.anything(),
      'gatewayPayment',
      expect.stringContaining('gatewayPayment.status = :gatewayPaymentStatus'),
      expect.objectContaining({ gatewayPaymentStatus: 'PAID' }),
    );

    expect(result.data).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
  });
});
