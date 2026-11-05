import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';

const origin = process.env.PWA_TEST_ORIGIN || 'http://localhost:3000';

test('production manifest, public worker and offline resources are served without auth redirects', async () => {
  const sw = await fetch(`${origin}/sw.js`, { redirect: 'manual' });
  assert.equal(sw.status, 200);
  assert.match(sw.headers.get('content-type'), /javascript/);
  assert.match(sw.headers.get('cache-control'), /no-store/);
  const html = await (await fetch(origin)).text();
  assert.match(html, /name="apple-mobile-web-app-capable" content="yes"/);
  assert.match(html, /rel="apple-touch-icon"/);
  const manifest = await (await fetch(`${origin}/manifest.webmanifest`)).json();
  assert.equal(manifest.id, '/');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.lang, 'fa');
  assert.ok(manifest.icons.some(icon => icon.purpose === 'maskable'));
  for (const path of [
    '/pwa/offline.html',
    ...manifest.icons.map(icon => icon.src),
    '/pwa/apple-touch-icon.png',
  ]) {
    assert.equal(
      (await fetch(origin + path, { redirect: 'manual' })).status,
      200,
      path,
    );
  }
  const privatePage = await fetch(`${origin}/panel/profile`, {
    redirect: 'manual',
  });
  assert.equal(privatePage.status, 307);
  assert.match(privatePage.headers.get('location'), /login/);
});

test('worker precaches only public allowlist and never intercepts sensitive requests', async () => {
  const source = await (await fetch(`${origin}/sw.js`)).text();
  const handlers = {};
  const storage = new Map();
  const requests = [];
  let offline = false;
  const caches = {
    async open(name) {
      if (!storage.has(name)) storage.set(name, new Map());
      const entries = storage.get(name);
      return {
        put: async (key, value) => entries.set(key, value),
        match: async key => entries.get(key),
      };
    },
    async keys() {
      return [...storage.keys()];
    },
    async delete(name) {
      return storage.delete(name);
    },
  };
  const self = {
    location: { origin },
    clients: { claim: async () => {} },
    addEventListener: (name, fn) => {
      handlers[name] = fn;
    },
  };
  const network = async (request, options) => {
    requests.push({ request, options });
    if (offline) throw new Error('network down');
    return {
      ok: true,
      type: 'basic',
      source: typeof request === 'string' ? request : request.url,
    };
  };
  vm.runInNewContext(source, { self, caches, fetch: network, URL, Response });
  let pending;
  handlers.install({
    waitUntil: promise => {
      pending = promise;
    },
  });
  await pending;
  assert.deepEqual(
    requests.map(x => x.request),
    ['/pwa/offline.html', '/pwa/icon-192.png'],
  );
  assert.ok(requests.every(x => x.options.credentials === 'omit'));
  storage.set('monshiim-pwa-old', new Map());
  storage.set('other-application-cache', new Map());
  handlers.activate({
    waitUntil: promise => {
      pending = promise;
    },
  });
  await pending;
  assert.equal(storage.has('monshiim-pwa-old'), false);
  assert.equal(storage.has('other-application-cache'), true);

  function dispatch(path, method = 'GET', mode = 'cors') {
    let result;
    handlers.fetch({
      request: { url: origin + path, method, mode },
      respondWith: promise => {
        result = promise;
      },
    });
    return result;
  }
  for (const path of [
    '/api/auth/me',
    '/api/bookings',
    '/api/payment',
    '/_next/static/foo.js',
    '/uploads/photo.jpg',
    '/panel/profile?_rsc=1',
  ])
    assert.equal(dispatch(path), undefined, path);
  assert.equal(dispatch('/api/payment', 'POST'), undefined);
  assert.equal(
    (await dispatch('/pwa/icon-192.png')).source,
    '/pwa/icon-192.png',
  );
  assert.equal(
    (await dispatch('/panel/profile', 'GET', 'navigate')).source,
    `${origin}/panel/profile`,
  );
  offline = true;
  assert.equal(
    (await dispatch('/deposit/secret', 'GET', 'navigate')).source,
    '/pwa/offline.html',
  );
  assert.deepEqual(
    [...storage.get('monshiim-pwa-v1').keys()],
    ['/pwa/offline.html', '/pwa/icon-192.png'],
  );
});
