import { BadRequestException } from '@nestjs/common';

import {
  DEFAULT_COMMISSION_MAX_AMOUNT,
  DEFAULT_COMMISSION_TIERS,
} from '../payment/deposit-amount';
import { CommissionBase, SiteSettings } from './entities/setting.entity';
import { SettingsService } from './settings.service';

describe('SettingsService (tiered commission & production schema guard)', () => {
  function createHarness(initialRow?: Partial<SiteSettings>) {
    let row: SiteSettings | null = initialRow
      ? ({
          id: 1,
          depositPercent: 30,
          commissionPercent: 10,
          commissionBase: CommissionBase.TOTAL,
          updatedAt: new Date(),
          ...initialRow,
        } as SiteSettings)
      : null;

    const queryMock = jest.fn(() =>
      Promise.resolve([
        { COLUMN_NAME: 'id' },
        { COLUMN_NAME: 'depositPercent' },
      ]),
    );

    const repo = {
      metadata: { tableName: 'site_settings' },
      query: queryMock,
      findOne: jest.fn(() => Promise.resolve(row ? { ...row } : null)),
      create: jest.fn(
        (data: Partial<SiteSettings>) => ({ ...data }) as SiteSettings,
      ),
      save: jest.fn((entity: SiteSettings) => {
        row = { ...entity };
        return Promise.resolve({ ...row });
      }),
    };

    const service = new SettingsService(repo as any);
    return { service, repo, queryMock };
  }

  it('ستون‌های جامانده را در onModuleInit اضافه می‌کند و پله‌های استاندارد + سقف ۲۰۰ هزار را برمی‌گرداند', async () => {
    const { service, queryMock } = createHarness({
      commissionTiers: null,
      commissionMode: 'tiered',
      commissionMaxAmount: DEFAULT_COMMISSION_MAX_AMOUNT,
    });

    await service.onModuleInit();
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "ADD COLUMN `commission_mode` VARCHAR(20) NOT NULL DEFAULT 'tiered'",
      ),
    );
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('ADD COLUMN `commission_tiers` JSON NULL'),
    );
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining(
        'ADD COLUMN `commission_max_amount` INT NULL DEFAULT 200000',
      ),
    );

    const settings = await service.getSettings();
    expect(settings.commissionMode).toBe('tiered');
    expect(settings.commissionTiers).toEqual(DEFAULT_COMMISSION_TIERS);
    expect(settings.commissionMaxAmount).toBe(200_000);
  });

  it('ترتیب صعودی پله‌ها را اعتبارسنجی کرده و از ذخیره بازه‌های نزولی جلوگیری می‌کند', async () => {
    const { service } = createHarness({});

    await expect(
      service.updateSettings({
        commissionMode: 'tiered',
        commissionTiers: [
          { upTo: 1_000_000, percent: 10 },
          { upTo: 500_000, percent: 7 },
          { upTo: null, percent: 3 },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    const updated = await service.updateSettings({
      commissionMode: 'tiered',
      commissionTiers: [
        { upTo: 400_000, percent: 10 },
        { upTo: 1_200_000, percent: 7 },
        { upTo: 2_200_000, percent: 5 },
        { upTo: null, percent: 3 },
      ],
      commissionMaxAmount: 200_000,
    });

    expect(updated.commissionTiers).toHaveLength(4);
    expect(updated.commissionMaxAmount).toBe(200_000);
  });
});
