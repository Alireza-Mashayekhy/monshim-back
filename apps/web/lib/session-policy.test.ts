import assert from 'node:assert/strict';
import test from 'node:test';

import { apiMayUseDifferentCookieHost } from './auth-cookie-origin.ts';
import { resolveSessionGate, shouldCheckSession } from './session-policy.ts';

const guest = {
  isPublicPath: true,
  isAuthPage: true,
  isPending: false,
  isFetching: false,
  isError: false,
  hasUser: false,
  denied: false,
};

test('login pages check recoverable sessions; ordinary public pages do not', () => {
  assert.equal(shouldCheckSession(true, true), true);
  assert.equal(shouldCheckSession(true, false), false);
  assert.equal(shouldCheckSession(false, false), true);
  assert.equal(
    resolveSessionGate({ ...guest, isAuthPage: false, isPending: true }),
    'ready',
  );
  assert.equal(resolveSessionGate(guest), 'ready');
});

test('wait for refresh or revalidation before showing login or redirecting', () => {
  assert.equal(
    resolveSessionGate({ ...guest, isPending: true, isFetching: true }),
    'checking',
  );
  assert.equal(resolveSessionGate({ ...guest, isFetching: true }), 'checking');
  assert.equal(
    resolveSessionGate({ ...guest, isFetching: true, hasUser: true }),
    'checking',
  );
  assert.equal(
    resolveSessionGate({ ...guest, hasUser: true }),
    'auth-redirect',
  );
  assert.equal(
    resolveSessionGate({
      ...guest,
      isPublicPath: false,
      isAuthPage: false,
      isFetching: true,
    }),
    'checking',
  );
});

test('temporary failures remain retryable, including when stale user data exists', () => {
  assert.equal(resolveSessionGate({ ...guest, isError: true }), 'error');
  assert.equal(
    resolveSessionGate({ ...guest, isError: true, hasUser: true }),
    'error',
  );
  assert.equal(
    resolveSessionGate({
      ...guest,
      isPublicPath: false,
      isAuthPage: false,
      isError: true,
    }),
    'error',
  );
});

test('only confirmed guests and denied roles are redirected from private pages', () => {
  const privatePage = { ...guest, isPublicPath: false, isAuthPage: false };
  assert.equal(resolveSessionGate(privatePage), 'login');
  assert.equal(resolveSessionGate({ ...privatePage, hasUser: true }), 'ready');
  assert.equal(
    resolveSessionGate({ ...privatePage, hasUser: true, denied: true }),
    'role-redirect',
  );
});

test('detect API cookies invisible to the frontend host; ports do not matter', () => {
  assert.equal(apiMayUseDifferentCookieHost(undefined, 'monshiim.ir'), false);
  assert.equal(apiMayUseDifferentCookieHost('/api', 'monshiim.ir'), false);
  assert.equal(
    apiMayUseDifferentCookieHost('https://monshiim.ir/api', 'monshiim.ir:3000'),
    false,
  );
  assert.equal(
    apiMayUseDifferentCookieHost('http://localhost:4000/api', 'localhost:3000'),
    false,
  );
  assert.equal(
    apiMayUseDifferentCookieHost('https://api.monshiim.ir/api', 'monshiim.ir'),
    true,
  );
  assert.equal(
    apiMayUseDifferentCookieHost('//api.monshiim.ir/api', 'www.monshiim.ir'),
    true,
  );
  assert.equal(
    apiMayUseDifferentCookieHost('http://127.0.0.1:4000/api', 'localhost:3000'),
    true,
  );
  assert.equal(
    apiMayUseDifferentCookieHost('https://api.monshiim.ir/api', null),
    true,
  );
});
