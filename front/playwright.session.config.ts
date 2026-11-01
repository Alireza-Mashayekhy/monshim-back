import { defineConfig } from '@playwright/test';

const webPort = 43100;
const apiPort = 43101;
const crossHost = process.env.SESSION_E2E_CROSS_HOST === '1';
const browserApi = crossHost
  ? `http://api.monshim.test:${apiPort}/api`
  : '/api';
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

export default defineConfig({
  testDir: './tests/session',
  testMatch: '**/*.e2e.ts',
  timeout: 120_000,
  expect: { timeout: 45_000 },
  workers: 1,
  use: {
    baseURL: crossHost
      ? `http://web.monshim.test:${webPort}`
      : `http://127.0.0.1:${webPort}`,
    headless: true,
    launchOptions: {
      ...(executablePath ? { executablePath } : {}),
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--no-proxy-server',
        // Only the local browser test uses these synthetic same-site hosts.
        '--host-resolver-rules=MAP *.monshim.test 127.0.0.1',
      ],
    },
  },
  webServer: [
    {
      command: 'node tests/session/mock-api.mjs',
      url: `http://127.0.0.1:${apiPort}/__test/health`,
      timeout: 30_000,
      reuseExistingServer: false,
    },
    {
      command: `next start --hostname 0.0.0.0 --port ${webPort}`,
      url: `http://127.0.0.1:${webPort}/login`,
      timeout: 180_000,
      reuseExistingServer: false,
      env: {
        NEXT_TELEMETRY_DISABLED: '1',
        SESSION_E2E: '1',
        NEXT_PUBLIC_API_URL: browserApi,
        API_URL: `http://127.0.0.1:${apiPort}/api`,
        API_PROXY_TARGET: `http://127.0.0.1:${apiPort}`,
      },
    },
  ],
});
