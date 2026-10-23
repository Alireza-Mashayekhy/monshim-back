import { BadRequestException } from '@nestjs/common';
import { BarberProfile } from 'src/barber/entities/barber.entity';
import { BarberReview } from 'src/barber/entities/barber-review.entity';
import { Booking } from 'src/booking/entities/booking.entity';
import { City } from 'src/locations/entities/city.entity';
import { Province } from 'src/locations/entities/province.entity';
import { Service } from 'src/services/entities/service.entity';
import { User } from 'src/users/entities/user.entity';
import { BankCard } from 'src/wallet/entities/bank-card.entity';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from 'src/wallet/entities/transaction.entity';
import { Wallet } from 'src/wallet/entities/wallet.entity';
import { DataSource } from 'typeorm';

import { AdminWithdrawalsService } from './admin-withdrawals.service';

describe('AdminWithdrawalsService', () => {
  async function createMysqlMetadataDataSource(
    executedQueries: Array<{ sql: string; parameters: unknown[] }>,
    resolveQueryResult?: (sql: string, parameters: unknown[]) => unknown,
  ) {
    const dataSource = new DataSource({
      type: 'mysql',
      database: 'monshim_test',
      entities: [
        Transaction,
        Wallet,
        User,
        BarberProfile,
        BarberReview,
        Booking,
        Service,
        BankCard,
        Province,
        City,
      ],
    });

    await (
      dataSource as unknown as { buildMetadatas: () => Promise<void> }
    ).buildMetadatas();

    jest.spyOn(dataSource, 'createQueryRunner').mockImplementation(
      () =>
        ({
          connection: dataSource,
          manager: dataSource.manager,
          isReleased: false,
          release: jest.fn().mockResolvedValue(undefined),
          query: jest.fn(
            (
              sql: string,
              parameters: unknown[] = [],
              useStructuredResult?: boolean,
            ) => {
              executedQueries.push({ sql, parameters });
              const rows = resolveQueryResult
                ? resolveQueryResult(sql, parameters)
                : [];
              return Promise.resolve(
                useStructuredResult ? { records: rows } : rows,
              );
            },
          ),
        }) as never,
    );

    return dataSource;
  }

  it('builds valid MySQL queries for paginated list + status + search without TypeORM alias errors', async () => {
    const executedQueries: Array<{ sql: string; parameters: unknown[] }> = [];
    const dataSource = await createMysqlMetadataDataSource(
      executedQueries,
      sql => {
        if (sql.includes('FROM `bank_cards`')) {
          return [{ id: 'card-uuid-1' }];
        }
        if (sql.includes('COUNT(') && sql.includes('totalCount')) {
          return [
            {
              totalCount: '3',
              totalAmount: '950000',
              pendingCount: '2',
              pendingAmount: '650000',
              completedCount: '1',
              completedAmount: '300000',
              rejectedCount: '0',
              rejectedAmount: '0',
            },
          ];
        }
        if (sql.includes('COUNT(')) {
          return [{ cnt: '2' }];
        }
        if (sql.includes('SELECT `transaction`.`id` AS `id`')) {
          return [{ id: 'tx-pending-1' }, { id: 'tx-pending-2' }];
        }
        return [];
      },
    );

    const txRepo = dataSource.getRepository(Transaction);
    const bankCardRepo = dataSource.getRepository(BankCard);

    const requestedAt1 = new Date('2026-10-23T10:00:00.000Z');
    const requestedAt2 = new Date('2026-10-23T08:00:00.000Z');

    jest.spyOn(txRepo, 'find').mockResolvedValue([
      {
        id: 'tx-pending-2',
        amount: 250000,
        type: TransactionType.WITHDRAWAL,
        status: TransactionStatus.PENDING,
        description: 'برداشت به کارت ملت - 1234',
        referenceId: 'card-uuid-1',
        createdAt: requestedAt2,
        wallet: {
          id: 'wallet-1',
          userId: 10,
          balance: 100000,
          user: {
            id: 10,
            fullName: 'علی رضایی',
            phone: '09121112233',
            roles: ['barber'],
            barberProfile: { salonName: 'پیرایش آریا' },
          },
        },
      } as unknown as Transaction,
      {
        id: 'tx-pending-1',
        amount: 400000,
        type: TransactionType.WITHDRAWAL,
        status: TransactionStatus.PENDING,
        description: 'برداشت به کارت ملت - 1234',
        referenceId: 'card-uuid-1',
        createdAt: requestedAt1,
        wallet: {
          id: 'wallet-1',
          userId: 10,
          balance: 100000,
          user: {
            id: 10,
            fullName: 'علی رضایی',
            phone: '09121112233',
            roles: ['barber'],
            barberProfile: { salonName: 'پیرایش آریا' },
          },
        },
      } as unknown as Transaction,
    ]);

    jest.spyOn(bankCardRepo, 'find').mockResolvedValue([
      {
        id: 'card-uuid-1',
        userId: 10,
        bankName: 'ملت',
        cardNumber: '6104337812341234',
        shebaNumber: 'IR120120000000001234567890',
        ownerName: 'علی رضایی',
        isDefault: true,
        createdAt: requestedAt2,
      } as BankCard,
    ]);

    const walletService = {
      approveWithdrawal: jest.fn(),
      rejectWithdrawal: jest.fn(),
    };

    const service = new AdminWithdrawalsService(
      txRepo,
      bankCardRepo,
      walletService as never,
    );

    const result = await service.list({
      page: 1,
      limit: 20,
      status: TransactionStatus.PENDING,
      search: 'ملت',
      from: '2026-10-01',
      to: '2026-10-23',
    });

    expect(result.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
    });
    // Preserves SQL ordering (tx-pending-1 first, tx-pending-2 second)
    expect(result.data.withdrawals.map(item => item.id)).toEqual([
      'tx-pending-1',
      'tx-pending-2',
    ]);
    expect(result.data.withdrawals[0].card?.bankName).toBe('ملت');
    expect(result.data.withdrawals[0].user?.salonName).toBe('پیرایش آریا');
    expect(result.data.summary).toEqual({
      totalCount: 3,
      totalAmount: 950000,
      pendingCount: 2,
      pendingAmount: 650000,
      completedCount: 1,
      completedAmount: 300000,
      rejectedCount: 0,
      rejectedAmount: 0,
    });

    const pageSql = executedQueries.find(q =>
      q.sql.includes('SELECT `transaction`.`id` AS `id`'),
    );
    expect(pageSql).toBeDefined();
    expect(pageSql?.sql).toContain('LIMIT 20');
  });

  it('handles empty list cleanly without querying find(In([]))', async () => {
    const executedQueries: Array<{ sql: string; parameters: unknown[] }> = [];
    const dataSource = await createMysqlMetadataDataSource(
      executedQueries,
      sql => {
        if (sql.includes('COUNT(') && sql.includes('totalCount')) {
          return [
            {
              totalCount: '0',
              totalAmount: '0',
              pendingCount: null,
              pendingAmount: '0',
              completedCount: null,
              completedAmount: '0',
              rejectedCount: null,
              rejectedAmount: '0',
            },
          ];
        }
        if (sql.includes('COUNT(')) {
          return [{ cnt: '0' }];
        }
        return [];
      },
    );

    const txRepo = dataSource.getRepository(Transaction);
    const bankCardRepo = dataSource.getRepository(BankCard);
    const findSpy = jest.spyOn(txRepo, 'find');

    const service = new AdminWithdrawalsService(
      txRepo,
      bankCardRepo,
      {} as never,
    );

    const result = await service.list({ page: 1, limit: 1 });
    expect(result.data.withdrawals).toEqual([]);
    expect(result.data.summary.pendingCount).toBe(0);
    expect(result.pagination.total).toBe(0);
    expect(findSpy).not.toHaveBeenCalled();
  });

  it('rejects reversed date ranges with BadRequestException', async () => {
    const service = new AdminWithdrawalsService(
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.list({ from: '2026-10-25', to: '2026-10-20' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
