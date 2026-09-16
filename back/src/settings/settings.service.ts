// src/settings/settings.service.ts

import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UpdateSiteSettingsDto } from './dto/update-setting.dto';
import { SiteSettings } from './entities/setting.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SiteSettings)
    private readonly settingsRepo: Repository<SiteSettings>,
  ) {}

  async getSettings(): Promise<SiteSettings> {
    let settings = await this.settingsRepo.findOne({
      where: { id: 1 },
    });

    if (!settings) {
      settings = this.settingsRepo.create({
        id: 1,
        depositPercent: 30,
        commissionPercent: 10,
      });

      settings = await this.settingsRepo.save(settings);
    }

    return settings;
  }

  async updateSettings(dto: UpdateSiteSettingsDto): Promise<SiteSettings> {
    const settings = await this.getSettings();

    if (
      dto.depositPercent !== undefined &&
      (dto.depositPercent < 0 || dto.depositPercent > 100)
    ) {
      throw new BadRequestException('درصد بیعانه باید بین ۰ تا ۱۰۰ باشد');
    }

    if (
      dto.commissionPercent !== undefined &&
      (dto.commissionPercent < 0 || dto.commissionPercent > 100)
    ) {
      throw new BadRequestException('درصد سهم سایت باید بین ۰ تا ۱۰۰ باشد');
    }

    Object.assign(settings, dto);

    return this.settingsRepo.save(settings);
  }
}
