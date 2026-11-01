import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getSessionVersion,
  isCurrentSessionVersion,
  markSessionChanged,
  SESSION_VERSION_KEY,
  subscribeToSessionChanges,
  withSessionMutation,
} from './session-coordination.ts';

const tick = () => new Promise<void>(resolve => setImmediate(resolve));

test('cookie-writing requests are serialized and a failed request releases the queue', async () => {
  const order: string[] = [];
  let release!: () => void;
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  const first = withSessionMutation(async () => {
    order.push('refresh-start');
    await gate;
    order.push('refresh-end');
  });
  const second = withSessionMutation(async () => {
    order.push('logout');
    throw new Error('temporary failure');
  });
  const third = withSessionMutation(async () => {
    order.push('login');
  });
  await tick();
  assert.deepEqual(order, ['refresh-start']);
  release();
  await first;
  await assert.rejects(second, /temporary failure/);
  await third;
  assert.deepEqual(order, ['refresh-start', 'refresh-end', 'logout', 'login']);
});

test('Web Locks are used when available to serialize across tabs', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const names: string[] = [];
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      locks: {
        request: async (name: string, operation: () => Promise<string>) => {
          names.push(name);
          return operation();
        },
      },
    },
  });
  try {
    assert.equal(await withSessionMutation(async () => 'ok'), 'ok');
    assert.deepEqual(names, ['monshim:auth-cookies']);
  } finally {
    if (original) Object.defineProperty(globalThis, 'navigator', original);
    else delete (globalThis as { navigator?: unknown }).navigator;
  }
});

test('only an opaque change marker is shared, and other tabs are notified', () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalChannel = Object.getOwnPropertyDescriptor(
    globalThis,
    'BroadcastChannel',
  );
  const target = new EventTarget();
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: Object.assign(target, { localStorage: storage }),
  });
  Object.defineProperty(globalThis, 'BroadcastChannel', {
    configurable: true,
    value: undefined,
  });
  try {
    let changes = 0;
    const unsubscribe = subscribeToSessionChanges(() => {
      changes += 1;
    });
    markSessionChanged();
    const version = getSessionVersion();
    assert.ok(version.length > 0);
    assert.equal(values.size, 1);
    assert.equal(values.get(SESSION_VERSION_KEY), version);
    assert.equal(
      changes,
      0,
      'the originating tab is synchronized by its own mutation',
    );

    storage.setItem(SESSION_VERSION_KEY, 'other-tab-version');
    const event = new Event('storage');
    Object.assign(event, {
      key: SESSION_VERSION_KEY,
      newValue: 'other-tab-version',
    });
    target.dispatchEvent(event);
    assert.equal(getSessionVersion(), 'other-tab-version');
    assert.equal(isCurrentSessionVersion(version), false);
    assert.equal(isCurrentSessionVersion('other-tab-version'), true);
    assert.equal(isCurrentSessionVersion(undefined), true);
    assert.equal(changes, 1);
    target.dispatchEvent(event);
    assert.equal(changes, 1, 'duplicate notifications are ignored');
    unsubscribe();
  } finally {
    if (originalWindow)
      Object.defineProperty(globalThis, 'window', originalWindow);
    else delete (globalThis as { window?: unknown }).window;
    if (originalChannel)
      Object.defineProperty(globalThis, 'BroadcastChannel', originalChannel);
    else delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
  }
});
