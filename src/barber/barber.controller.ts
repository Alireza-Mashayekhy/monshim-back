// src/barber/barber.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { QueryDto } from 'src/common/query';
import { FilesService } from 'src/files/files.service';
import { Repository } from 'typeorm';

import { BarberService } from './barber.service';
import { UpdateBarberDto } from './dto/update-barber.dto';
import { BarberProfile } from './entities/barber.entity';
import { WorkHoursService } from './work-hours.service';

@Controller('barber')
@UseGuards(AuthGuard)
export class BarberController {
  constructor(
    private readonly barberService: BarberService,
    private readonly filesService: FilesService,
    private readonly workHoursService: WorkHoursService,
    @InjectRepository(BarberProfile)
    private barberProfileRepo: Repository<BarberProfile>,
  ) {}

  // ---- مسیرهای عمومی ----
  @Get()
  findAll(@Query() query: QueryDto, @Query('cityId') cityId?: number) {
    return this.barberService.findAll(query, { cityId: cityId || undefined });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.barberService.findOne(+id);
  }

  // ---- مسیرهای مربوط به پروفایل کاربر جاری ----
  @Get('profile/me')
  getMyProfile(@Req() req: any) {
    const user = req.user;
    return this.barberService.findOneByUserId(user.id);
  }

  @Patch('profile/me')
  updateMyProfile(@Req() req: any, @Body() dto: UpdateBarberDto) {
    const user = req.user;
    return this.barberService.update(user.id, dto);
  }

  @Post('profile/image')
  @UseInterceptors(FileInterceptor('image'))
  async uploadProfileImage(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const user = req.user;
    if (!file) {
      throw new BadRequestException('فایل تصویر ارسال نشده است');
    }

    // ذخیره فایل در پوشه profiles
    const imagePath = this.filesService.saveFile(file, 'profiles');

    // به‌روزرسانی پروفایل کاربر
    await this.barberService.update(user.id, { profileImage: imagePath });

    return { imageUrl: imagePath };
  }

  // ---- مسیرهای مدیریتی (ادمین) ----
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBarberDto: UpdateBarberDto) {
    return this.barberService.update(+id, updateBarberDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.barberService.remove(+id);
  }

  @Post('profile/work-hours')
  async setWorkHours(
    @Req() req: any,
    @Body()
    dto: { hours: { dayOfWeek: number; startTime: string; endTime: string }[] },
  ) {
    const user = req.user;

    // پیدا کردن پروفایل آرایشگر بر اساس userId
    const profile = await this.barberProfileRepo.findOne({
      where: { userId: user.id },
    });
    if (!profile) {
      throw new NotFoundException('پروفایل آرایشگر یافت نشد');
    }

    if (!dto.hours || !Array.isArray(dto.hours)) {
      throw new BadRequestException('فیلد hours باید یک آرایه باشد');
    }

    // ارسال profile.id (UUID) به سرویس
    return this.workHoursService.setWorkHours(profile.id, dto.hours);
  }

  @Get('profile/work-hours')
  async getWorkHours(@Req() req: any) {
    const user = req.user;

    const profile = await this.barberProfileRepo.findOne({
      where: { userId: user.id },
    });
    if (!profile) {
      throw new NotFoundException('پروفایل آرایشگر یافت نشد');
    }

    return this.workHoursService.getWorkHours(profile.id);
  }
}
