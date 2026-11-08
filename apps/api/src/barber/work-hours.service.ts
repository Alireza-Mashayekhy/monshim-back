// src/barber/work-hours.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BarberWorkHours } from './entities/barber-work-hours.entity';

@Injectable()
export class WorkHoursService {
  constructor(
    @InjectRepository(BarberWorkHours)
    private workHoursRepo: Repository<BarberWorkHours>,
  ) {}

  async setWorkHours(
    barberId: string, // ← UUID
    hours: { dayOfWeek: number; startTime: string; endTime: string }[],
  ) {
    // حذف رکوردهای قبلی
    await this.workHoursRepo.delete({ barberId });

    if (!hours || hours.length === 0) {
      return [];
    }

    const entities = hours.map(h =>
      this.workHoursRepo.create({
        barberId,
        dayOfWeek: h.dayOfWeek,
        startTime: h.startTime,
        endTime: h.endTime,
      }),
    );
    return this.workHoursRepo.save(entities);
  }

  async getWorkHours(barberId: string): Promise<BarberWorkHours[]> {
    return this.workHoursRepo.find({
      where: { barberId },
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
  }

  async getWorkHoursForDay(barberId: string, dayOfWeek: number) {
    return this.workHoursRepo.find({ where: { barberId, dayOfWeek } });
  }
}
