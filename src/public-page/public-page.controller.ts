import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

import { PublicPageService } from './public-page.service';

/**
 * «صفحهٔ عمومی آرایشگاه» — پروفایل سئوشده با آدرس `/barber/[id]` در فرانت.
 *
 * این کنترلر مستقل است تا منطقِ فعال‌سازی (خرید پکیج یا حد نصاب نوبت‌های
 * پرداخت‌شده) با بقیهٔ مسیرهای آرایشگر قاطی نشود:
 *   • `GET /public-page/directory` → فقط آرایشگرهایی که صفحه‌شان فعال است
 *     (مبنای sitemap)
 *   • `GET /public-page/barber/:id` → پروفایل عمومی؛ در غیر این صورت ۴۰۴
 *   • `GET /public-page/me`         → وضعیت صفحهٔ عمومیِ آرایشگرِ جاری
 */
@ApiTags('PublicPage')
@Controller('public-page')
export class PublicPageController {
  constructor(private readonly publicPageService: PublicPageService) {}

  @Get('directory')
  getDirectory() {
    return this.publicPageService.getActiveDirectory();
  }

  @Get('barber/:id')
  getPublicBarberPage(@Param('id') id: string) {
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId < 1) {
      throw new NotFoundException('آرایشگاه یافت نشد');
    }
    return this.publicPageService.getPublicBarberPage(numericId);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Barber, Role.Admin)
  @Get('me')
  getMyStatus(@Req() req: any) {
    return this.publicPageService.getStatusByUserId(req.user.id);
  }
}
