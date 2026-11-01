import { Test, TestingModule } from '@nestjs/testing';
import { createHash, randomUUID } from 'crypto';

import { RedisModule } from './redis.module';
import { RedisService } from './redis.service';
import { SessionRevocationService } from './session-revocation.service';

// Opt in with an isolated Redis on this port; the normal test suite needs no server.
const redisPort = process.env.SESSION_REDIS_TEST_PORT;
const describeRedis = redisPort ? describe : describe.skip;

describeRedis('session revocation with a real Redis server', () => {
  const sessionId = randomUUID();
  const otherSessionId = randomUUID();
  const legacyToken = `test-only-${randomUUID()}`;
  const sessionKey = `auth:revoked:session:${sessionId}`;
  const legacyKey = `auth:revoked:legacy:${createHash('sha256').update(legacyToken).digest('hex')}`;
  const oldHost = process.env.REDIS_HOST;
  const oldPort = process.env.REDIS_PORT;
  let module: TestingModule;
  let redis: RedisService;
  let revocations: SessionRevocationService;

  beforeAll(async () => {
    process.env.REDIS_HOST = '127.0.0.1';
    process.env.REDIS_PORT = redisPort;
    module = await Test.createTestingModule({
      imports: [RedisModule],
    }).compile();
    await module.init();
    redis = module.get(RedisService);
    revocations = module.get(SessionRevocationService);
  });

  afterAll(async () => {
    if (redis?.getClient()?.isOpen) {
      await redis.getClient().del([sessionKey, legacyKey]);
      await redis.getClient().quit();
    }
    if (module) await module.close();
    if (oldHost === undefined) delete process.env.REDIS_HOST;
    else process.env.REDIS_HOST = oldHost;
    if (oldPort === undefined) delete process.env.REDIS_PORT;
    else process.env.REDIS_PORT = oldPort;
  });

  it('stores revocations with the correct lifetime and isolates other sessions', async () => {
    expect(await revocations.isSessionRevoked(sessionId)).toBe(false);
    await revocations.revokeSession(sessionId);
    const otherWorker = new SessionRevocationService(redis);
    expect(await otherWorker.isSessionRevoked(sessionId)).toBe(true);
    expect(await otherWorker.isSessionRevoked(otherSessionId)).toBe(false);
    const ttl = await redis.getClient().ttl(sessionKey);
    expect(ttl).toBeGreaterThan(30 * 24 * 60 * 60);
    expect(ttl).toBeLessThanOrEqual(31 * 24 * 60 * 60);
  });

  it('stores a hash rather than a legacy refresh token', async () => {
    expect(await revocations.isLegacyTokenRevoked(legacyToken)).toBe(false);
    await revocations.revokeLegacyToken(legacyToken);
    expect(await revocations.isLegacyTokenRevoked(legacyToken)).toBe(true);
    expect(await redis.getClient().get(legacyKey)).toBe('1');
    expect(await redis.getClient().ttl(legacyKey)).toBeGreaterThan(
      30 * 24 * 60 * 60,
    );
  });

  it('fails promptly when the real Redis client is no longer ready', async () => {
    await redis.getClient().del([sessionKey, legacyKey]);
    await redis.getClient().quit();
    await expect(revocations.isSessionRevoked(sessionId)).rejects.toMatchObject(
      {
        status: 503,
      },
    );
    await expect(revocations.revokeSession(sessionId)).rejects.toMatchObject({
      status: 503,
    });
  });
});
