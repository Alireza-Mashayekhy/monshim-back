// src/barber/barber.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { InjectRepository } from '@nestjs/typeorm';
import { memoryStorage } from 'multer';
import {
  IMAGE_MAX_SIZE_BYTES,
  MAX_BARBER_PORTFOLIO_IMAGES,
} from 'src/common/constants/constants';
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
  findAll(
    @Req() req: any,
    @Query() query: QueryDto,
    @Query('cityId') cityId?: number,
    @Query('provinceId') provinceId?: number,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('minRating') minRating?: number,
  ) {
    return this.barberService.findAll(query, {
      cityId: cityId || query.cityId || undefined,
      provinceId: provinceId || undefined,
      minPrice: minPrice !== undefined ? Number(minPrice) : undefined,
      maxPrice: maxPrice !== undefined ? Number(maxPrice) : undefined,
      minRating: minRating !== undefined ? Number(minRating) : undefined,
      gender: req.user?.gender ?? null,
    });
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
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: IMAGE_MAX_SIZE_BYTES },
    }),
  )
  async uploadProfileImage(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const user = req.user;
    if (!file) {
      throw new BadRequestException('فایل تصویر ارسال نشده است');
    }

    // ذخیره فایل در پوشه profiles
    const imagePath = await this.filesService.saveFile(file, 'profiles');

    // به‌روزرسانی پروفایل کاربر
    await this.barberService.update(user.id, { profileImage: imagePath });

    return { imageUrl: imagePath };
  }

  @Patch('profile/portfolio')
  @UseInterceptors(
    FilesInterceptor('portfolio', MAX_BARBER_PORTFOLIO_IMAGES, {
      storage: memoryStorage(),
      limits: {
        fileSize: IMAGE_MAX_SIZE_BYTES,
        files: MAX_BARBER_PORTFOLIO_IMAGES,
      },
    }),
  )
  async updatePortfolioImages(
    @Req() req: any,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @Body('existingImages') existingImagesJson: string,
  ) {
    const user = req.user;
    const profile = await this.barberProfileRepo.findOne({
      where: { userId: user.id },
    });
    if (!profile) {
      throw new NotFoundException('پروفایل آرایشگر یافت نشد');
    }

    if (typeof existingImagesJson !== 'string') {
      throw new BadRequestException('فهرست عکس‌های حفظ‌شده نامعتبر است');
    }

    let existingImages: unknown;
    try {
      existingImages = JSON.parse(existingImagesJson);
    } catch {
      throw new BadRequestException('فهرست عکس‌های حفظ‌شده نامعتبر است');
    }

    if (
      !Array.isArray(existingImages) ||
      existingImages.some(image => typeof image !== 'string')
    ) {
      throw new BadRequestException('فهرست عکس‌های حفظ‌شده نامعتبر است');
    }

    const currentImages = profile.portfolioImages ?? [];
    const keptImages = existingImages as string[];
    const uploadedFiles = files ?? [];

    if (
      new Set(keptImages).size !== keptImages.length ||
      keptImages.some(image => !currentImages.includes(image))
    ) {
      throw new BadRequestException(
        'نمی‌توان عکس‌های متعلق به پروفایل دیگر را نگه داشت',
      );
    }

    if (
      keptImages.length + uploadedFiles.length >
      MAX_BARBER_PORTFOLIO_IMAGES
    ) {
      throw new BadRequestException(
        `حداکثر ${MAX_BARBER_PORTFOLIO_IMAGES} نمونه‌کار مجاز است`,
      );
    }

    const uploadedPaths: string[] = [];

    try {
      for (const file of uploadedFiles) {
        uploadedPaths.push(await this.filesService.saveFile(file, 'portfolio'));
      }

      const nextImages = [...keptImages, ...uploadedPaths];
      const updatedProfile = await this.barberService.updatePortfolioImages(
        user.id,
        nextImages,
      );
      this.filesService.deleteFiles(
        currentImages.filter(image => !nextImages.includes(image)),
      );

      return {
        message: 'نمونه‌کارها با موفقیت به‌روزرسانی شدند',
        data: updatedProfile,
      };
    } catch (error) {
      this.filesService.deleteFiles(uploadedPaths);
      throw error;
    }
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

  // دریافت کد معرف کاربر
  @Get('profile/referral-code')
  async getMyReferralCode(@Req() req: any) {
    const user = req.user;
    const referralInfo = await this.barberService.getReferralInfo(user.id);
    return {
      message: 'کد معرف با موفقیت دریافت شد',
      data: referralInfo,
    };
  }
}
