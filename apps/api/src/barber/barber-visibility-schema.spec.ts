import { BarberService } from './barber.service';

/** Production does not use TypeORM synchronize. */
describe('barber public-visibility schema', () => {
  const oldColumns = [
    { COLUMN_NAME: 'pending_changes' },
    { COLUMN_NAME: 'pending_status' },
    { COLUMN_NAME: 'pending_rejection_reason' },
  ];

  function setup(columns = oldColumns, alterError?: Error & { code?: string }) {
    const profileRepo = {
      metadata: { tableName: 'barber_profile' },
      query: jest.fn((sql: string) => {
        if (sql.startsWith('SELECT')) return Promise.resolve(columns);
        if (alterError) return Promise.reject(alterError);
        return Promise.resolve([]);
      }),
    };
    const userRepo = { save: jest.fn(), update: jest.fn() };
    const service = new BarberService(
      userRepo as any,
      profileRepo as any,
      {} as any,
    );
    return { service, profileRepo, userRepo };
  }

  it('adds only the new column, with a visible default, without reactivating accounts', async () => {
    const { service, profileRepo, userRepo } = setup();
    await service.onModuleInit();
    expect(profileRepo.query).toHaveBeenCalledTimes(2);
    expect(profileRepo.query).toHaveBeenCalledWith(
      'ALTER TABLE `barber_profile` ADD COLUMN `is_publicly_visible` TINYINT(1) NOT NULL DEFAULT 1',
    );
    expect(userRepo.save).not.toHaveBeenCalled();
    expect(userRepo.update).not.toHaveBeenCalled();
    expect(
      profileRepo.query.mock.calls.some(([sql]) => /^UPDATE/i.test(sql)),
    ).toBe(false);
  });

  it('does not run DDL when the column already exists', async () => {
    const { service, profileRepo } = setup([
      ...oldColumns,
      { COLUMN_NAME: 'is_publicly_visible' },
    ]);
    await service.onModuleInit();
    expect(profileRepo.query).toHaveBeenCalledTimes(1);
  });

  it('tolerates a concurrent instance adding the same column', async () => {
    const duplicate = Object.assign(new Error('duplicate column'), {
      code: 'ER_DUP_FIELDNAME',
    });
    const { service } = setup(oldColumns, duplicate);
    await expect(service.onModuleInit()).resolves.toBeUndefined();
  });

  it('fails startup with the original error if the required column cannot be created', async () => {
    const denied = Object.assign(new Error('ALTER permission denied'), {
      code: 'ER_TABLEACCESS_DENIED_ERROR',
    });
    const { service } = setup(oldColumns, denied);
    await expect(service.onModuleInit()).rejects.toBe(denied);
  });
});
