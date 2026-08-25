// src/referral/referral.controller.ts
import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/common/guards/auth.guard';

import { ReferralService } from './referral.service';

@Controller('referral')
@UseGuards(AuthGuard)
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  /**
   * دریافت اطلاعات معرف (کد معرف و اطلاعات دعوت‌ها)
   * GET /referral/my-referrals
   */
  @Get('my-referrals')
  async getMyReferrals(@Req() req: any) {
    const user = req.user;
    const referralInfo = await this.referralService.getMyReferrals(user.id);
    return {
      message: 'اطلاعات معرف با موفقیت دریافت شد',
      data: referralInfo,
    };
  }
}
