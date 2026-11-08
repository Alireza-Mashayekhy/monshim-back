import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';
import { HealthService } from './health.service';

/**
 * `RedisService` به‌صورت global از `RedisModule` در دسترس است.
 * `DataSource` هم با `@InjectDataSource()` از `TypeOrmModule.forRoot` می‌آید.
 * پس این ماژول به import اضافه‌ای نیاز ندارد.
 */
@Module({
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
