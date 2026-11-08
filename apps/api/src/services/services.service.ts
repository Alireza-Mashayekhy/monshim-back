// src/services/services.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { EntityManager, Repository } from 'typeorm';

import {
  CreateServiceDto,
  DEPOSIT_MAX_RATIO,
  MIN_DEPOSIT_PRICE,
} from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Service } from './entities/service.entity';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
  ) {}

  private validateDeposit(
    price: number,
    depositPrice: number | null | undefined,
  ) {
    if (depositPrice == null) return;

    const deposit = Number(depositPrice);
    if (!Number.isFinite(deposit) || deposit < MIN_DEPOSIT_PRICE) {
      throw new BadRequestException('حداقل مبلغ بیعانه ۱۰۰ هزار تومان است.');
    }
    if (deposit > Number(price) * DEPOSIT_MAX_RATIO) {
      throw new BadRequestException(
        'مبلغ بیعانه نمی‌تواند بیشتر از ۳۰٪ مبلغ کل باشد.',
      );
    }
  }

  // ایجاد سرویس جدید
  async create(
    createServiceDto: CreateServiceDto,
    manager?: EntityManager,
  ): Promise<Service> {
    this.validateDeposit(
      Number(createServiceDto.price),
      createServiceDto.depositPrice,
    );

    const repository = manager
      ? manager.getRepository(Service)
      : this.serviceRepository;

    const service = repository.create(createServiceDto);

    return repository.save(service);
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

    this.validateDeposit(Number(price), depositPrice);

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
