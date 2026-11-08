// Build and run the actual production frontend against an isolated fake API.
// The build is nested under .next so it never overwrites a developer's normal
// build and is excluded from Git/workspace snapshots.
import { spawn } from 'node:child_process';
import {
  existsSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const crossHost = process.argv.includes('--cross-host');
const env = {
  ...process.env,
  NEXT_TELEMETRY_DISABLED: '1',
  SESSION_E2E: '1',
  SESSION_E2E_CROSS_HOST: crossHost ? '1' : '0',
  NEXT_PUBLIC_API_URL: crossHost ? 'http://api.monshim.test:43101/api' : '/api',
  NEXT_PUBLIC_IMAGE_URL: '',
  API_URL: 'http://127.0.0.1:43101/api',
  API_PROXY_TARGET: 'http://127.0.0.1:43101',
};

async function run(script, args) {
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [require.resolve(script), ...args], {
      env,
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', exitCode => resolve(exitCode ?? 1));
  });
  return code;
}

// Next rewrites this shared generated file even with an isolated distDir.
// Restore it afterwards, unless another Next process has since changed it.
const nextEnvPath = 'next-env.d.ts';
const originalNextEnv = existsSync(nextEnvPath)
  ? readFileSync(nextEnvPath, 'utf8')
  : null;
try {
  // Next normally preserves the fetch cache between builds; a stale fixture
  // would otherwise leak across test runs even though the mock API resets.
  rmSync('.next/session-e2e/cache', { recursive: true, force: true });
  const buildCode = await run('next/dist/bin/next', ['build']);
  process.exitCode =
    buildCode ||
    (await run('@playwright/test/cli', [
      'test',
      '--config=playwright.session.config.ts',
    ]));
} finally {
  if (
    existsSync(nextEnvPath) &&
    readFileSync(nextEnvPath, 'utf8').includes('./.next/session-e2e/')
  ) {
    if (originalNextEnv === null) unlinkSync(nextEnvPath);
    else writeFileSync(nextEnvPath, originalNextEnv);
  }
}
