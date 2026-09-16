import { Injectable, OnModuleInit } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit {
  private client: RedisClientType;

  async onModuleInit() {
    this.client = createClient({
      socket: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
      },
    });

    this.client.on('error', err => {
      console.log('Redis Error:', err);
    });

    await this.client.connect();

    console.log('Redis connected');
  }

  getClient() {
    return this.client;
  }
}
