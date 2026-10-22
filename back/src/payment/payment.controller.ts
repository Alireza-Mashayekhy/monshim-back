import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { getRequestOrigin } from 'src/common/utils/public-url.util';

import { ChargeWalletDto } from './dto/charge-wallet.dto';
import { InitiateBookingPaymentDto } from './dto/initiate-booking-payment.dto';
import { InitiateSubscriptionPaymentDto } from './dto/initiate-subscription-payment.dto';
import { PaymentService } from './payment.service';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // ۱. درخواست پرداخت آنلاین اشتراک سالن
  @UseGuards(AuthGuard)
  @Post('subscription')
  async paySubscription(
    @Req() req: any,
    @Body() dto: InitiateSubscriptionPaymentDto,
  ) {
    return this.paymentService.initiateSubscriptionPayment(
      req.user.id,
      dto,
      getRequestOrigin(req),
    );
  }

  // ۱.۱. خرید پکیج «صفحهٔ عمومی آرایشگاه» (یک‌باره، مادام‌العمر)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Barber, Role.Admin)
  @Post('public-page')
  async payPublicPage(@Req() req: any) {
    return this.paymentService.initiatePublicPagePayment(
      req.user.id,
      getRequestOrigin(req),
    );
  }

  // ۲. درخواست پرداخت آنلاین نوبت (رزرو بیعانه/کل مبلغ)
  @UseGuards(AuthGuard)
  @Post('booking')
  async payBooking(@Req() req: any, @Body() dto: InitiateBookingPaymentDto) {
    return this.paymentService.initiateBookingPayment(
      req.user.id,
      dto,
      getRequestOrigin(req),
    );
  }

  // ۳. درخواست شارژ آنلاین کیف پول
  @UseGuards(AuthGuard)
  @Post('wallet')
  async chargeWallet(@Req() req: any, @Body() dto: ChargeWalletDto) {
    return this.paymentService.initiateWalletCharge(
      req.user.id,
      dto,
      getRequestOrigin(req),
    );
  }

  // ۳.۱. دریافت اطلاعات صورت‌حساب لینک بیعانه (عمومی - بدون گارد)
  @Get('deposit/:token/invoice')
  async getDepositInvoice(@Param('token') token: string) {
    return this.paymentService.getDepositInvoiceByToken(token);
  }

  // ۳.۲. تایید صورت‌حساب لینک بیعانه و دریافت لینک انتقال به درگاه (عمومی - بدون گارد)
  @Post('deposit/:token/pay')
  async payDepositByToken(@Param('token') token: string, @Req() req: any) {
    return this.paymentService.initiateDepositPaymentByToken(
      token,
      getRequestOrigin(req),
    );
  }

  // ۳.۳. لینک کوتاه پیامک بیعانه → هدایت به صفحه صورت‌حساب در فرانت
  @Get('deposit/:token')
  async depositLink(
    @Param('token') token: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const redirectUrl = await this.paymentService.getDepositRedirectUrl(
      token,
      getRequestOrigin(req),
    );

    return res.redirect(redirectUrl);
  }

  // ۴. کال‌بک بازگشت از درگاه پرداخت زیبال (عمومی - بدون گارد)
  @Get('callback')
  async handleGetCallback(
    @Query('trackId') trackId: string,
    @Query('success') success: string,
    @Query('status') status: string,
    @Query('orderId') orderId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const redirectUrl = await this.paymentService.handleCallback({
      trackId,
      success,
      status,
      orderId,
      requestOrigin: getRequestOrigin(req),
    });

    return res.redirect(redirectUrl);
  }

  @Post('callback')
  async handlePostCallback(
    @Body('trackId') trackId: string,
    @Body('success') success: string,
    @Body('status') status: string,
    @Body('orderId') orderId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const redirectUrl = await this.paymentService.handleCallback({
      trackId,
      success,
      status,
      orderId,
      requestOrigin: getRequestOrigin(req),
    });

    return res.redirect(redirectUrl);
  }

  // ۵. استعلام وضعیت تراکنش
  @UseGuards(AuthGuard)
  @Get('status/:trackId')
  async getStatus(@Param('trackId') trackId: string) {
    return this.paymentService.getPaymentStatus(Number(trackId));
  }
}
