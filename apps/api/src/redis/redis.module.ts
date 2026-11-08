import { Global, Module } from '@nestjs/common';

import { RedisService } from './redis.service';
import { SessionRevocationService } from './session-revocation.service';

@Global()
@Module({
  providers: [RedisService, SessionRevocationService],
  exports: [RedisService, SessionRevocationService],
})
export class RedisModule {}
