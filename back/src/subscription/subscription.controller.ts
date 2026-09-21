// src/subscriptions/subscription.controller.ts

import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

import { UpdateSubscriptionPlanDto } from './dto/update-subscription.dto';
import { SubscriptionService } from './subscription.service';

@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.Admin)
@Controller('admin/subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  findAll() {
    return this.subscriptionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subscriptionService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSubscriptionPlanDto) {
    return this.subscriptionService.update(id, dto);
  }
}
