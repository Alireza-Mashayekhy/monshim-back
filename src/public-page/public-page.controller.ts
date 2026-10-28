import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

import { UpdatePublicPageSlugDto } from './dto/update-public-page-slug.dto';
import { ValidatePublicPageDiscountDto } from './dto/validate-public-page-discount.dto';
import { PublicPageService } from './public-page.service';

/**
 * «صفحهٔ عمومی آرایشگاه» — پروفایل سئوشده با آدرس `/barber/[slug]` در فرانت.
 *
 * این کنترلر مستقل است تا منطقِ فعال‌سازی (خرید پکیج یا حد نصاب رزروهای موفق
 * پرداخت‌شده در درگاه) با بقیهٔ مسیرهای آرایشگر قاطی نشود:
 *   • `GET /public-page/directory`         → آرایشگرهای فعالِ دارای اسلاگ (مبنای sitemap)
 *   • `GET /public-page/barber/:identifier` → پروفایل عمومی بر اساس اسلاگ؛ در غیر این صورت ۴۰۴
 *   • `GET /public-page/me`                → وضعیت صفحهٔ عمومیِ آرایشگرِ جاری
 *   • `GET /public-page/slug/check`        → بررسی معتبر و غیرتکراری بودن اسلاگ
 *   • `PATCH /public-page/me/slug`         → ثبت **یک‌بارهٔ** اسلاگ صفحهٔ عمومی (غیرقابل تغییر)
 */
@ApiTags('PublicPage')
@Controller('public-page')
export class PublicPageController {
  constructor(private readonly publicPageService: PublicPageService) {}

  @Get('directory')
  getDirectory() {
    return this.publicPageService.getActiveDirectory();
  }

  @Get('barber/:identifier')
  getPublicBarberPage(@Param('identifier') identifier: string) {
    return this.publicPageService.getPublicBarberPage(identifier);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Barber, Role.Admin)
  @Get('me')
  getMyStatus(@Req() req: any) {
    return this.publicPageService.getStatusByUserId(req.user.id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Barber, Role.Admin)
  @Post('discount/quote')
  quoteDiscount(@Body() dto: ValidatePublicPageDiscountDto) {
    return this.publicPageService.getDiscountQuote(dto.code);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Barber, Role.Admin)
  @Get('slug/check')
  checkSlugAvailability(@Req() req: any, @Query('slug') slug = '') {
    return this.publicPageService.checkSlugAvailability(req.user.id, slug);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Barber, Role.Admin)
  @Patch('me/slug')
  updateMySlug(@Req() req: any, @Body() dto: UpdatePublicPageSlugDto) {
    return this.publicPageService.updateSlugByUserId(req.user.id, dto.slug);
  }
}
