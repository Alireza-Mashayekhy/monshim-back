import { readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';

const mockBase = 'http://127.0.0.1:43101';
const webBase = 'http://127.0.0.1:43100';
const crossHost = process.env.SESSION_E2E_CROSS_HOST === '1';

async function configure(options: Record<string, unknown>) {
  await fetch(`${mockBase}/__test/reset`, { method: 'POST' });
  await fetch(`${mockBase}/__test/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
}

function publicCacheActionId() {
  const manifest = JSON.parse(
    readFileSync(
      '.next/session-e2e/server/server-reference-manifest.json',
      'utf8',
    ),
  ) as { node: Record<string, { exportedName?: string }> };
  const entry = Object.entries(manifest.node).find(
    ([, action]) => action.exportedName === 'revalidatePublicBarberCache',
  );
  if (!entry) throw new Error('Public cache Server Action not found in build');
  return entry[0];
}

test.describe('public-cache Server Action authorization', () => {
  test.skip(
    crossHost,
    'API-host cookies are not visible to frontend Server Actions.',
  );

  for (const scenario of [
    {
      name: 'barber may revalidate own page',
      options: { roles: ['barber'] },
      cookie: 'valid',
      target: 42,
      allowed: true,
    },
    {
      name: 'barber cannot revalidate another page',
      options: { roles: ['barber'] },
      cookie: 'valid',
      target: 73,
      allowed: false,
    },
    {
      name: 'admin may revalidate another page',
      options: { roles: ['admin'] },
      cookie: 'valid',
      target: 73,
      allowed: true,
    },
    {
      name: 'revoked or invalid session is denied',
      options: { meStatus: 401 },
      cookie: 'valid',
      target: 42,
      allowed: false,
    },
    {
      name: 'temporary API error fails closed',
      options: { meStatus: 503 },
      cookie: 'valid',
      target: 42,
      allowed: false,
    },
  ]) {
    test(scenario.name, async ({ request }) => {
      await configure(scenario.options);
      const response = await request.post(`${webBase}/admin/approvals`, {
        headers: {
          'Next-Action': publicCacheActionId(),
          'Content-Type': 'text/plain;charset=UTF-8',
          Origin: webBase,
          Cookie: `access_token=${scenario.cookie}`,
        },
        data: JSON.stringify([
          { userId: scenario.target, slugs: ['salon-test'] },
        ]),
      });
      expect(response.status()).toBe(200);
      const body = await response.text();
      expect(body).toMatch(new RegExp(`\\n1:${scenario.allowed}\\b`));
      const events = (await (
        await fetch(`${mockBase}/__test/events`)
      ).json()) as {
        data: { path: string }[];
      };
      expect(events.data.some(event => event.path === '/api/auth/me')).toBe(
        true,
      );
    });
  }
});
