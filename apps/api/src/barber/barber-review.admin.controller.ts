import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { QueryDto } from 'src/common/query';

import { BarberReviewService } from './barber-review.service';
import { ModerateBarberReviewDto } from './dto/moderate-barber-review.dto';
import { BarberReviewStatus } from './entities/barber-review.entity';

@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.Admin)
@Controller('admin/barber-reviews')
export class BarberReviewAdminController {
  constructor(private readonly reviewService: BarberReviewService) {}

  // لیست نظرات (با فیلتر وضعیت و جستجو)
  @Get()
  findAll(
    @Query() query: QueryDto,
    @Query('status') status?: BarberReviewStatus,
  ) {
    return this.reviewService.listForAdmin({
      ...query,
      status: status || undefined,
    });
  }

  // تایید یا رد کردن نظر توسط ادمین
  @Patch(':id')
  moderate(@Param('id') id: string, @Body() dto: ModerateBarberReviewDto) {
    return this.reviewService.moderate(id, dto);
  }
}
