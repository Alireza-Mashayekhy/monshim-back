import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'crypto';
import { REFRESH_TOKEN_TTL_MS } from 'src/common/config/jwt.config';

import { RedisService } from './redis.service';

// One day of margin covers a refresh that was already in progress at logout.
const REVOCATION_TTL_SECONDS = REFRESH_TOKEN_TTL_MS / 1000 + 24 * 60 * 60;

/** Random UUIDs in newly issued access/refresh tokens share one session. */
export function isSessionId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

@Injectable()
export class SessionRevocationService {
  constructor(private readonly redisService: RedisService) {}

  private readyClient() {
    const client = this.redisService.getClient();
    // node-redis queues commands while reconnecting by default. Fail closed
    // promptly instead of enqueueing work when the client is already offline.
    if (!client?.isReady) {
      throw new ServiceUnavailableException('Session store is unavailable');
    }
    return client;
  }

  private sessionKey(sessionId: string): string {
    return `auth:revoked:session:${sessionId}`;
  }

  private legacyKey(token: string): string {
    const hash = createHash('sha256').update(token).digest('hex');
    return `auth:revoked:legacy:${hash}`;
  }

  async isSessionRevoked(sessionId: string): Promise<boolean> {
    return !!(await this.readyClient().get(this.sessionKey(sessionId)));
  }

  async isLegacyTokenRevoked(token: string): Promise<boolean> {
    return !!(await this.readyClient().get(this.legacyKey(token)));
  }

  /**
   * Keep revocations for a full refresh lifetime from logout: a concurrently
   * issued token for the same session can otherwise live longer than the token
   * that arrived with the logout request. Redis failures propagate as 5xx; they
   * must never be mistaken for an expired user session.
   */
  async revokeSession(sessionId: string): Promise<void> {
    await this.readyClient().set(this.sessionKey(sessionId), '1', {
      EX: REVOCATION_TTL_SECONDS,
    });
  }

  async revokeLegacyToken(token: string): Promise<void> {
    await this.readyClient().set(this.legacyKey(token), '1', {
      EX: REVOCATION_TTL_SECONDS,
    });
  }
}
