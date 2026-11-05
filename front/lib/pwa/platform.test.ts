import assert from 'node:assert/strict';
import test from 'node:test';

import {
  detectPlatform,
  iosThirdPartyCanAdd,
  isInstallSurface,
  supportsMacSafariDock,
} from './platform.ts';

test('platform recognition includes desktop-mode iPad and iOS browsers', () => {
  assert.equal(
    detectPlatform(
      'Mozilla iPhone OS 17_0 Version/17.0 Mobile Safari/604.1',
      'iPhone',
      5,
    ),
    'ios-safari',
  );
  assert.equal(
    detectPlatform(
      'Mozilla iPhone OS 17_0 CriOS/120 Mobile Safari/604.1',
      'iPhone',
      5,
    ),
    'ios-chrome',
  );
  assert.equal(
    detectPlatform(
      'Mozilla Macintosh Version/17.0 Safari/605.1',
      'MacIntel',
      5,
    ),
    'ios-safari',
  );
  assert.equal(
    detectPlatform(
      'Mozilla Android Chrome/120 Mobile Safari/537.36',
      'Linux',
      5,
    ),
    'android',
  );
  assert.equal(
    detectPlatform('Mozilla Windows NT 10.0 Chrome/120 Edg/120', 'Win32', 0),
    'windows',
  );
  assert.equal(
    detectPlatform(
      'Mozilla Macintosh Chrome/120 Edg/120 Safari/537',
      'MacIntel',
      0,
    ),
    'mac-chromium',
  );
  assert.equal(
    detectPlatform('Mozilla Macintosh Version/17.0 Safari/605', 'MacIntel', 0),
    'mac-safari',
  );
  assert.equal(
    detectPlatform('Mozilla Macintosh Firefox/120', 'MacIntel', 0),
    'other',
  );
});

test('manual installation instructions are conservative about support', () => {
  assert.equal(supportsMacSafariDock('Version/16.6 Safari/605'), false);
  assert.equal(supportsMacSafariDock('Version/17.0 Safari/605'), true);
  assert.equal(iosThirdPartyCanAdd('iPhone OS 16_3 CriOS'), false);
  assert.equal(iosThirdPartyCanAdd('iPhone OS 16_4 CriOS'), true);
  assert.equal(iosThirdPartyCanAdd('unknown'), false);
});

test('installation suggestions do not interrupt sensitive deep links', () => {
  for (const path of [
    '/login',
    '/deposit/token',
    '/panel/payment/callback',
    '/panel/provider/1',
    '/provider/1',
    '/dashboard/appointments',
  ])
    assert.equal(isInstallSurface(path), false);
  for (const path of ['/', '/panel/home', '/dashboard'])
    assert.equal(isInstallSurface(path), true);
});
