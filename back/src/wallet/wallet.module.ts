// src/wallet/wallet.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZohalService } from 'src/common/services/zohal.service';
import { NotificationModule } from 'src/notification/notification.module';
import { User } from 'src/users/entities/user.entity';

import { BankCard } from './entities/bank-card.entity';
import { Transaction } from './entities/transaction.entity';
import { Wallet } from './entities/wallet.entity';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet, Transaction, BankCard, User]),
    // برای ارسال پیامک واریز برداشت (قالب 142864) هنگام تایید ادمین
    NotificationModule,
  ],
  controllers: [WalletController],
  providers: [WalletService, ZohalService],
  exports: [WalletService],
})
export class WalletModule {}
