// src/bookings/bookings.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request, Response } from 'express';
import { BarberProfile } from 'src/barber/entities/barber.entity';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { Repository } from 'typeorm';

import { BookingsService } from './booking.service';
import { BookingQueryDto } from './dto/booking-query.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';

@Controller('bookings')
@UseGuards(AuthGuard)
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    @InjectRepository(BarberProfile)
    private barberProfileRepo: Repository<BarberProfile>,
  ) {}

  // ایجاد رزرو جدید (مشتری)
  @Post()
  create(@Req() req: Request & { user: any }, @Body() dto: CreateBookingDto) {
    const user = req.user;
    return this.bookingsService.create(user.id, dto);
  }

  // دریافت لیست رزروهای مشتری جاری
  @Get('my')
  findMyBookings(
    @Req() req: Request & { user: any },
    @Query() query: BookingQueryDto,
  ) {
    const user = req.user;
    return this.bookingsService.findByCustomer(user.id, query);
  }

  @Get('barber/my')
  @Roles(Role.Barber, Role.Admin)
  async findMyBarberBookings(
    @Req() req: Request & { user: any },
    @Query() query: BookingQueryDto,
  ) {
    const user = req.user;
    // پیدا کردن پروفایل آرایشگر بر اساس userId
    const barberProfile = await this.barberProfileRepo.findOne({
      where: { userId: user.id },
    });
    if (!barberProfile) {
      throw new NotFoundException('پروفایل آرایشگر یافت نشد');
    }
    // ارسال barberId (که در اینجا userId است) به سرویس
    return this.bookingsService.findByBarber(barberProfile.userId, query);
  }

  // دریافت لیست رزروهای یک آرایشگر (فقط آرایشگر خودش یا ادمین)
  @Get('barber/:barberId')
  @Roles(Role.Admin, Role.Barber)
  findBarberBookings(
    @Param('barberId') barberId: string,
    @Query() query: BookingQueryDto,
    @Req() req: Request & { user: any },
  ) {
    const user = req.user;
    // اگر کاربر عادی است و باربر آیدی با خودش یکی نیست، دسترسی ندارد
    if (!user.roles.includes('admin') && user.id !== +barberId) {
      throw new ForbiddenException('شما به رزروهای این آرایشگر دسترسی ندارید');
    }
    return this.bookingsService.findByBarber(+barberId, query);
  }

  @Get('available-slots')
  async getAvailableSlots(
    @Query('barberId') barberId: string,
    @Query('date') date: string,
    @Query('serviceId') serviceId: string,
  ) {
    if (!barberId || !date || !serviceId) {
      throw new BadRequestException(
        'باربرآیدی، تاریخ و شناسه سرویس الزامی هستند',
      );
    }
    const slots = await this.bookingsService.getAvailableSlots(
      barberId,
      date,
      serviceId,
    );
    return { slots };
  }

  // دریافت یک رزرو خاص
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request & { user: any }) {
    const user = req.user;
    return this.bookingsService.findOne(id, user.id, user.roles);
  }

  // به‌روزرسانی وضعیت رزرو (فقط آرایشگر یا ادمین)
  @Patch(':id/status')
  @Roles(Role.Admin, Role.Barber)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateBookingStatusDto,
    @Req() req: Request & { user: any },
  ) {
    const user = req.user;
    return this.bookingsService.updateStatus(id, user.id, user.roles, dto);
  }

  // لغو رزرو توسط مشتری
  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @Req() req: Request & { user: any }) {
    const user = req.user;
    return this.bookingsService.cancelByCustomer(id, user.id);
  }
}
