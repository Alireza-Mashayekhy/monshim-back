import { DataSource, Table, TableColumn } from 'typeorm';
import { ConnectionMetadataBuilder } from 'typeorm/connection/ConnectionMetadataBuilder';

import { PublicPageDiscount } from './entities/public-page-discount.entity';
import { PublicPageSchemaService } from './public-page-schema.service';

function buildExistingTable() {
  return new Table({
    name: 'public_page_discounts',
    columns: [
      'id',
      'code',
      'percent_off',
      'is_active',
      'created_at',
      'updated_at',
    ].map(name => new TableColumn({ name, type: 'varchar', isNullable: true })),
  });
}

/**
 * دیتابیس ساختگی که فقط «اسکیمای موجود» را شبیه‌سازی می‌کند؛ بقیهٔ مسیر
 * (ساخت `Table` از متادیتای entity) واقعی است تا دقیقاً همان چیزی تست شود که
 * در production اجرا می‌شود.
 */
async function createServiceStub(options?: {
  existingTable?: Table;
  broken?: boolean;
}) {
  const template = new DataSource({
    type: 'mysql',
    entities: [PublicPageDiscount],
  });
  const [metadata] = await new ConnectionMetadataBuilder(
    template,
  ).buildEntityMetadatas([PublicPageDiscount]);

  const runner = {
    connect: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    getTable: jest.fn().mockResolvedValue(options?.existingTable),
    createTable: jest.fn().mockResolvedValue(undefined),
    addColumn: jest.fn().mockResolvedValue(undefined),
  };

  const dataSource = options?.broken
    ? ({
        getMetadata: () => {
          throw new Error('connection lost');
        },
      } as unknown as DataSource)
    : ({
        getMetadata: () => metadata,
        driver: template.driver,
        createQueryRunner: () => runner,
      } as unknown as DataSource);

  const service = new PublicPageSchemaService(dataSource);
  const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
  Object.defineProperty(service, 'logger', { value: logger });

  return { service, runner, logger };
}

describe('PublicPageSchemaService (گارد اسکیمای کدهای تخفیف)', () => {
  it('اگر جدول public_page_discounts در پایگاه داده نباشد، هنگام بوت می‌سازد', async () => {
    const { service, runner, logger } = await createServiceStub();

    await service.onApplicationBootstrap();

    expect(runner.createTable).toHaveBeenCalledTimes(1);
    // `ifNotExists = true` تا بالا آمدن هم‌زمان چند نمونه خطا ندهد
    expect(runner.createTable.mock.calls[0][1]).toBe(true);
    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining('public_page_discounts'),
    );
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('وقتی جدول از قبل وجود دارد هیچ کاری نمی‌کند (idempotent)', async () => {
    const { service, runner, logger } = await createServiceStub({
      existingTable: buildExistingTable(),
    });

    await service.onApplicationBootstrap();

    expect(runner.createTable).not.toHaveBeenCalled();
    expect(runner.addColumn).not.toHaveBeenCalled();
    expect(logger.log).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('خطای گارد را می‌بلعد تا بالا آمدن سرویس شکست نخورد', async () => {
    const { service, logger } = await createServiceStub({ broken: true });

    await expect(service.onApplicationBootstrap()).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('connection lost'),
    );
  });
});
