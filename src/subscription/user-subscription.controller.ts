import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from 'src/common/guards/auth.guard';

import { CreateUserSubscriptionDto } from './dto/create-user-subscription.dto';
import { UserSubscriptionService } from './user-subscription.service';

@Controller('user-subscriptions')
@UseGuards(AuthGuard)
export class UserSubscriptionController {
  constructor(
    private readonly userSubscriptionService: UserSubscriptionService,
  ) {}

  @Post()
  create(@Req() req, @Body() dto: CreateUserSubscriptionDto) {
    return this.userSubscriptionService.create(req.user.id, dto);
  }

  @Get('current')
  getCurrent(@Req() req) {
    return this.userSubscriptionService.getCurrent(req.user.id);
  }

  @Get()
  findAll(@Req() req) {
    return this.userSubscriptionService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    return this.userSubscriptionService.findOne(id, req.user.id);
  }
}
