// src/payment/admin-withdrawals.controller.ts
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

import { AdminWithdrawalsService } from './admin-withdrawals.service';
import { AdminWithdrawalQueryDto } from './dto/admin-withdrawal-query.dto';
import {
  ApproveWithdrawalDto,
  RejectWithdrawalDto,
} from './dto/review-withdrawal.dto';

@ApiTags('Admin withdrawals')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.Admin)
@Controller('admin/withdrawals')
export class AdminWithdrawalsController {
  constructor(
    private readonly adminWithdrawalsService: AdminWithdrawalsService,
  ) {}

  /** لیست درخواست‌های برداشت آرایشگران + آمار کل */
  @Get()
  list(@Query() query: AdminWithdrawalQueryDto) {
    return this.adminWithdrawalsService.list(query);
  }

  /** تایید برداشت پس از واریز واقعی وجه */
  @Patch(':id/approve')
  approve(@Param('id') id: string, @Body() dto: ApproveWithdrawalDto) {
    return this.adminWithdrawalsService.approve(id, dto.transferReference);
  }

  /** رد برداشت و برگرداندن مبلغ به کیف پول آرایشگر */
  @Patch(':id/reject')
  reject(@Param('id') id: string, @Body() dto: RejectWithdrawalDto) {
    return this.adminWithdrawalsService.reject(id, dto.reason);
  }
}
