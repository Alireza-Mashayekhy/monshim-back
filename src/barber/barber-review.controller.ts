import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { QueryDto } from 'src/common/query';

import { BarberReviewService } from './barber-review.service';
import { CreateBarberReviewDto } from './dto/create-barber-review.dto';

@Controller('barber')
export class BarberReviewController {
  constructor(private readonly reviewService: BarberReviewService) {}

  // لیست نظرات تاییدشده یک آرایشگر
  @Get(':id/reviews')
  listApproved(@Param('id') id: string, @Query() query: QueryDto) {
    return this.reviewService.listApprovedForBarber(id, query);
  }

  // نظر من + امکان ثبت نظر برای این آرایشگر
  @Get(':id/reviews/my')
  @UseGuards(AuthGuard)
  getMyReview(@Param('id') id: string, @Req() req: any) {
    return this.reviewService.getMyReviewForBarber(req.user.id, id);
  }

  // ثبت نظر و امتیاز (فقط برای کاربرانی که قبلاً رزرو کرده‌اند)
  @Post(':id/reviews')
  @UseGuards(AuthGuard)
  create(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: CreateBarberReviewDto,
  ) {
    return this.reviewService.create(req.user.id, id, dto);
  }
}

@Controller('barber-reviews')
@UseGuards(AuthGuard)
export class MyBarberReviewController {
  constructor(private readonly reviewService: BarberReviewService) {}

  // همه نظرات ثبت‌شده توسط کاربر جاری
  @Get('my')
  listMyReviews(@Req() req: any) {
    return this.reviewService.listMyReviews(req.user.id);
  }
}
