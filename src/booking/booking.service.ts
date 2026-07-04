// src/bookings/booking.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BarberProfile } from 'src/barber/entities/barber.entity';
import { getPagination } from 'src/common/query';
import { Service } from 'src/services/entities/service.entity';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';

import { BookingQueryDto } from './dto/booking-query.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { Booking, BookingStatus } from './entities/booking.entity';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepo: Repository<Booking>,
    @InjectRepository(BarberProfile)
    private barberProfileRepo: Repository<BarberProfile>,
    @InjectRepository(Service)
    private serviceRepo: Repository<Service>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async create(customerId: number, dto: CreateBookingDto): Promise<Booking> {
    const barber = await this.barberProfileRepo.findOne({
      where: { userId: dto.barberId, isApproved: true },
    });
    if (!barber) {
      throw new NotFoundException(
        'آرایشگر مورد نظر یافت نشد یا تایید نشده است',
      );
    }

    const service = await this.serviceRepo.findOne({
      where: { id: dto.serviceId, isActive: true },
    });
    if (!service) {
      throw new NotFoundException('سرویس مورد نظر یافت نشد');
    }

    // بررسی تداخل زمانی با استفاده از QueryBuilder برای پشتیبانی از Not با چند شرط
    const existingBooking = await this.bookingRepo
      .createQueryBuilder('booking')
      .where('booking.barberId = :barberId', { barberId: dto.barberId })
      .andWhere('booking.date = :date', { date: dto.date })
      .andWhere('booking.time = :time', { time: dto.time })
      .andWhere('booking.status NOT IN (:...statuses)', {
        statuses: [BookingStatus.CANCELED, BookingStatus.REJECTED],
      })
      .getOne();

    if (existingBooking) {
      throw new BadRequestException(
        'این زمان قبلاً توسط شخص دیگری رزرو شده است',
      );
    }

    const booking = this.bookingRepo.create({
      customerId,
      barberId: dto.barberId,
      serviceId: dto.serviceId,
      date: dto.date,
      time: dto.time,
      price: service.price,
      note: dto.note,
      status: BookingStatus.PENDING,
    });

    return this.bookingRepo.save(booking);
  }

  async findByCustomer(customerId: number, query: BookingQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const status = query.status;

    const qb = this.bookingRepo
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.barber', 'barber')
      .leftJoinAndSelect('booking.service', 'service')
      .where('booking.customerId = :customerId', { customerId });

    if (status) {
      qb.andWhere('booking.status = :status', { status });
    }

    const { skip, take } = getPagination(page, limit);
    qb.skip(skip).take(take).orderBy('booking.createdAt', 'DESC');

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByBarber(barberId: number, query: BookingQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const status = query.status;

    const qb = this.bookingRepo
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.customer', 'customer')
      .leftJoinAndSelect('booking.service', 'service')
      .where('booking.barberId = :barberId', { barberId });

    if (status) {
      qb.andWhere('booking.status = :status', { status });
    }

    const { skip, take } = getPagination(page, limit);
    qb.skip(skip)
      .take(take)
      .orderBy('booking.date', 'DESC')
      .addOrderBy('booking.time', 'DESC');

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId: number, roles: string[]): Promise<Booking> {
    const booking = await this.bookingRepo.findOne({
      where: { id },
      relations: {
        customer: true,
        barber: true,
        service: true,
      },
    });
    if (!booking) {
      throw new NotFoundException('رزرو یافت نشد');
    }

    const isCustomer = booking.customerId === userId;
    const isBarber = booking.barberId === userId;
    const isAdmin = roles?.includes('admin');

    if (!isCustomer && !isBarber && !isAdmin) {
      throw new ForbiddenException('شما دسترسی به این رزرو را ندارید');
    }

    return booking;
  }

  async updateStatus(
    id: string,
    userId: number,
    roles: string[],
    dto: UpdateBookingStatusDto,
  ): Promise<Booking> {
    const booking = await this.findOne(id, userId, roles);

    const isBarber = booking.barberId === userId;
    const isAdmin = roles?.includes('admin');
    if (!isBarber && !isAdmin) {
      throw new ForbiddenException(
        'فقط آرایشگر یا ادمین می‌توانند وضعیت را تغییر دهند',
      );
    }

    if (
      booking.status === BookingStatus.COMPLETED ||
      booking.status === BookingStatus.CANCELED
    ) {
      throw new BadRequestException(
        'امکان تغییر وضعیت رزرو انجام‌شده یا لغو‌شده وجود ندارد',
      );
    }

    booking.status = dto.status;
    return this.bookingRepo.save(booking);
  }

  async cancelByCustomer(id: string, userId: number): Promise<Booking> {
    const booking = await this.findOne(id, userId, []);
    if (booking.customerId !== userId) {
      throw new ForbiddenException('شما اجازه لغو این رزرو را ندارید');
    }
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException(
        'فقط رزروهای در انتظار تایید قابل لغو هستند',
      );
    }
    booking.status = BookingStatus.CANCELED;
    return this.bookingRepo.save(booking);
  }

  async getAvailableTimes(barberId: number, date: string): Promise<string[]> {
    const barber = await this.barberProfileRepo.findOne({
      where: { userId: barberId },
    });
    if (!barber) {
      throw new NotFoundException('آرایشگر یافت نشد');
    }

    const bookings = await this.bookingRepo
      .createQueryBuilder('booking')
      .where('booking.barberId = :barberId', { barberId })
      .andWhere('booking.date = :date', { date })
      .andWhere('booking.status NOT IN (:...statuses)', {
        statuses: [BookingStatus.CANCELED, BookingStatus.REJECTED],
      })
      .getMany();

    const bookedTimes = bookings.map(b => b.time);
    const allTimes: string[] = [];
    for (let h = 9; h <= 20; h++) {
      for (let m = 0; m < 60; m += 30) {
        const hour = h.toString().padStart(2, '0');
        const min = m.toString().padStart(2, '0');
        allTimes.push(`${hour}:${min}`);
      }
    }
    return allTimes.filter(time => !bookedTimes.includes(time));
  }
}
