import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

import { BaleBotService } from './bale-bot.service';
import type { BaleUpdate } from './bale-client.service';
import { BaleClientService } from './bale-client.service';

@Controller('bale')
@SkipThrottle()
export class BaleController {
  constructor(
    private readonly baleClient: BaleClientService,
    private readonly baleBotService: BaleBotService,
  ) {}

  @Post('webhook/:secret')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('secret') secret: string,
    @Body() update: BaleUpdate,
  ) {
    if (!this.baleClient.isEnabled()) {
      return { ok: true };
    }

    if (!this.baleClient.verifyWebhookSecret(secret)) {
      throw new ForbiddenException('Invalid webhook secret');
    }

    await this.baleBotService.handleUpdate(update);
    return { ok: true };
  }
}
