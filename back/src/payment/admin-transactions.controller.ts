import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

import { AdminTransactionsService } from './admin-transactions.service';
import { AdminTransactionQueryDto } from './dto/admin-transaction-query.dto';
import { SettleAdminRefundDto } from './dto/settle-admin-refund.dto';

@ApiTags('Admin transactions')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.Admin)
@Controller('admin/transactions')
export class AdminTransactionsController {
  constructor(
    private readonly adminTransactionsService: AdminTransactionsService,
  ) {}

  @Get()
  list(@Query() query: AdminTransactionQueryDto) {
    return this.adminTransactionsService.list(query);
  }

  @Patch(':id/settle-refund')
  settleRefund(@Param('id') id: string, @Body() dto: SettleAdminRefundDto) {
    return this.adminTransactionsService.settleCustomerRefund(
      id,
      dto.transferReference,
    );
  }

  @Get('export')
  export(@Query() query: AdminTransactionQueryDto) {
    return this.adminTransactionsService.exportData(query);
  }
}
