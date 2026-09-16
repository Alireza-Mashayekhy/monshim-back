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
import { AuthGuard } from 'src/common/guards/auth.guard';

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
    return this.paymentService.initiateSubscriptionPayment(req.user.id, dto);
  }

  // ۲. درخواست پرداخت آنلاین نوبت (رزرو بیعانه/کل مبلغ)
  @UseGuards(AuthGuard)
  @Post('booking')
  async payBooking(@Req() req: any, @Body() dto: InitiateBookingPaymentDto) {
    return this.paymentService.initiateBookingPayment(req.user.id, dto);
  }

  // ۳. درخواست شارژ آنلاین کیف پول
  @UseGuards(AuthGuard)
  @Post('wallet')
  async chargeWallet(@Req() req: any, @Body() dto: ChargeWalletDto) {
    return this.paymentService.initiateWalletCharge(req.user.id, dto);
  }

  // ۴. کال‌بک بازگشت از درگاه پرداخت زیبال (عمومی - بدون گارد)
  @Get('callback')
  async handleGetCallback(
    @Query('trackId') trackId: string,
    @Query('success') success: string,
    @Query('status') status: string,
    @Query('orderId') orderId: string,
    @Res() res: Response,
  ) {
    const redirectUrl = await this.paymentService.handleCallback({
      trackId,
      success,
      status,
      orderId,
    });

    return res.redirect(redirectUrl);
  }

  @Post('callback')
  async handlePostCallback(
    @Body('trackId') trackId: string,
    @Body('success') success: string,
    @Body('status') status: string,
    @Body('orderId') orderId: string,
    @Res() res: Response,
  ) {
    const redirectUrl = await this.paymentService.handleCallback({
      trackId,
      success,
      status,
      orderId,
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
