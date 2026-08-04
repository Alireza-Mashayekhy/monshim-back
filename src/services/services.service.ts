// src/services/services.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';

import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Service } from './entities/service.entity';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
  ) {}

  // ایجاد سرویس جدید
  async create(createServiceDto: CreateServiceDto): Promise<Service> {
    if (
      createServiceDto.depositPrice != null &&
      Number(createServiceDto.depositPrice) > Number(createServiceDto.price)
    ) {
      throw new BadRequestException(
        'مبلغ بیعانه نمی‌تواند بیشتر از مبلغ کل باشد.',
      );
    }

    const service = this.serviceRepository.create(createServiceDto);

    return this.serviceRepository.save(service);
  }
  // دریافت تمام سرویس‌های یک آرایشگر خاص
  async findByBarberId(barberId: number): Promise<Service[]> {
    return this.serviceRepository.find({
      where: { barberId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  // دریافت یک سرویس با شناسه
  async findOne(id: string): Promise<Service> {
    const service = await this.serviceRepository.findOne({ where: { id } });
    if (!service) {
      throw new NotFoundException('سرویس یافت نشد');
    }
    return service;
  }

  // به‌روزرسانی سرویس (فقط توسط مالک)
  async update(
    id: string,
    updateServiceDto: UpdateServiceDto,
    currentUser: User,
  ): Promise<Service> {
    const service = await this.findOne(id);

    if (service.barberId !== currentUser.id) {
      throw new ForbiddenException('شما اجازه ویرایش این سرویس را ندارید');
    }

    const price = updateServiceDto.price ?? Number(service.price);

    const depositPrice = updateServiceDto.depositPrice ?? service.depositPrice;

    if (depositPrice != null && Number(depositPrice) > Number(price)) {
      throw new BadRequestException(
        'مبلغ بیعانه نمی‌تواند بیشتر از مبلغ کل باشد.',
      );
    }

    Object.assign(service, updateServiceDto);

    return this.serviceRepository.save(service);
  }

  // حذف سرویس (غیرفعال کردن)
  async remove(id: string, currentUser: User): Promise<void> {
    const service = await this.findOne(id);
    if (service.barberId !== currentUser.id) {
      throw new ForbiddenException('شما اجازه حذف این سرویس را ندارید');
    }
    service.isActive = false;
    await this.serviceRepository.save(service);
  }

  // حذف فیزیکی (برای ادمین)
  async hardDelete(id: string): Promise<void> {
    const result = await this.serviceRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('سرویس یافت نشد');
    }
  }
}
