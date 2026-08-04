// src/wallet/wallet.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/common/guards/auth.guard';

import { CreateCardDto } from './dto/create-card.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { WithdrawRequestDto } from './dto/withdraw-request.dto';
import { WalletService } from './wallet.service';

@Controller('wallet')
@UseGuards(AuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  // ===== موجودی =====
  @Get('balance')
  async getBalance(@Req() req: any) {
    const user = req.user;
    return this.walletService.getBalance(user.id);
  }

  // ===== تراکنش‌ها =====
  @Get('transactions')
  async getTransactions(@Req() req: any, @Query() query: TransactionQueryDto) {
    const user = req.user;
    return this.walletService.getTransactions(user.id, query);
  }

  // ===== کارت‌های بانکی =====
  @Get('cards')
  async getCards(@Req() req: any) {
    const user = req.user;
    return this.walletService.getCards(user.id);
  }

  @Post('cards')
  async addCard(@Req() req: any, @Body() dto: CreateCardDto) {
    const user = req.user;
    return this.walletService.addCard(user.id, dto);
  }

  @Delete('cards/:id')
  async deleteCard(@Req() req: any, @Param('id') cardId: string) {
    const user = req.user;
    return this.walletService.deleteCard(user.id, cardId);
  }

  // ===== برداشت =====
  @Post('withdraw')
  async requestWithdraw(@Req() req: any, @Body() dto: WithdrawRequestDto) {
    const user = req.user;
    return this.walletService.requestWithdraw(user.id, dto);
  }
}
