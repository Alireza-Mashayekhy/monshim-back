import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import http from 'node:http';
import { registerHooks } from 'node:module';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

// Match Next's @/ alias and extensionless TypeScript imports for Node's native
// test runner; production builds continue to use the normal Next resolver.
const frontRoot = new URL('../../', import.meta.url);
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      return nextResolve(
        new URL(`${specifier.slice(2)}.ts`, frontRoot).href,
        context,
      );
    }
    if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
      const tsFile = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(fileURLToPath(tsFile)))
        return nextResolve(tsFile.href, context);
    }
    return nextResolve(specifier, context);
  },
});

const { api } = await import('./client.ts');
const { markSessionChanged } = await import('./session-coordination.ts');
let handler;
const server = http.createServer((req, res) => handler(req, res));

function reply(res, status, data = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

before(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  api.defaults.baseURL = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise((resolve, reject) =>
    server.close(err => (err ? reject(err) : resolve())),
  );
});

test('concurrent 401 responses share one refresh and retry the original requests', async () => {
  let refreshes = 0;
  let refreshed = false;
  handler = (req, res) => {
    if (req.url === '/auth/refresh') {
      refreshes++;
      refreshed = true;
      reply(res, 201);
    } else {
      reply(res, refreshed ? 200 : 401, { refreshed });
    }
  };
  const responses = await Promise.all(
    Array.from({ length: 5 }, () => api.get('/private')),
  );
  assert.equal(refreshes, 1);
  assert.ok(responses.every(response => response.data.refreshed));
});

test('a second 401 after refresh is a verification error, not a logout', async () => {
  let refreshes = 0;
  handler = (req, res) => {
    if (req.url === '/auth/refresh') {
      refreshes++;
      reply(res, 201);
    } else reply(res, 401);
  };
  await assert.rejects(api.get('/private'), {
    code: 'ERR_SESSION_VERIFICATION',
  });
  assert.equal(refreshes, 1);
});

test('a failed login does not recursively attempt a refresh', async () => {
  let refreshes = 0;
  handler = (req, res) => {
    if (req.url === '/auth/refresh') refreshes++;
    reply(res, 401);
  };
  await assert.rejects(
    api.post('/auth/login-with-password', {}),
    error => error.response?.status === 401,
  );
  assert.equal(refreshes, 0);
});

test('a successful response from a previous account is not applied after a session change', async () => {
  let started;
  const requestStarted = new Promise(resolve => {
    started = resolve;
  });
  let finish;
  handler = (_req, res) => {
    finish = () => reply(res, 200, { privateData: 'old account' });
    started();
  };
  const pending = api.get('/slow');
  await requestStarted;
  markSessionChanged();
  finish();
  await assert.rejects(pending, { code: 'ERR_SESSION_CHANGED' });
});

test('a stale 401 does not refresh or replay under the next account', async () => {
  let started;
  const requestStarted = new Promise(resolve => {
    started = resolve;
  });
  let finish;
  let refreshes = 0;
  handler = (req, res) => {
    if (req.url === '/auth/refresh') {
      refreshes++;
      reply(res, 201);
      return;
    }
    finish = () => reply(res, 401);
    started();
  };
  const pending = api.get('/slow');
  await requestStarted;
  markSessionChanged();
  finish();
  await assert.rejects(pending, { code: 'ERR_SESSION_CHANGED' });
  assert.equal(refreshes, 0);
});
