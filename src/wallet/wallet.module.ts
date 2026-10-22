// src/wallet/wallet.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ZohalService } from 'src/common/services/zohal.service';
import { User } from 'src/users/entities/user.entity';

import { BankCard } from './entities/bank-card.entity';
import { Transaction } from './entities/transaction.entity';
import { Wallet } from './entities/wallet.entity';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [TypeOrmModule.forFeature([Wallet, Transaction, BankCard, User])],
  controllers: [WalletController],
  providers: [WalletService, ZohalService],
  exports: [WalletService],
})
export class WalletModule {}
