// src/bookings/bookings.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { AuthGuard } from 'src/common/guards/auth.guard';

import { BookingsService } from './booking.service';
import { BookingQueryDto } from './dto/booking-query.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';

@Controller('bookings')
@UseGuards(AuthGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

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

  // دریافت زمان‌های آزاد یک آرایشگر در تاریخ مشخص (عمومی - بدون احراز هویت)
  @Get('available-times')
  async getAvailableTimes(
    @Query('barberId') barberId: string,
    @Query('date') date: string,
  ) {
    if (!barberId || !date) {
      throw new BadRequestException('باربرآیدی و تاریخ الزامی هستند');
    }
    return this.bookingsService.getAvailableTimes(+barberId, date);
  }
}
