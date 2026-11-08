/**
 * هوک حل مسیر: importهای **بدون پسوند** را با پسوند `.ts` حل می‌کند.
 *
 * فقط برای اجرای مولدهای `shared/` روی فایل‌های منبع TypeScript بک‌اند.
 * هیچ اثری روی بیلد یا اجرای واقعی پروژه ندارد.
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const EXTENSIONS = ['.ts', '.tsx', '.mts', '.js', '.mjs'];

function toCandidates(specifier, parentUrl) {
  if (!specifier.startsWith('.') || !parentUrl?.startsWith('file:')) {
    return [];
  }

  const base = path.resolve(
    path.dirname(new URL(parentUrl).pathname),
    specifier,
  );

  if (EXTENSIONS.some(ext => base.endsWith(ext))) {
    return [];
  }

  const candidates = [];
  for (const ext of EXTENSIONS) candidates.push(base + ext);
  for (const ext of EXTENSIONS) candidates.push(path.join(base, 'index' + ext));

  return candidates.map(candidate => pathToFileURL(candidate).href);
}

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (error?.code !== 'ERR_MODULE_NOT_FOUND') throw error;

    for (const candidate of toCandidates(specifier, context.parentURL)) {
      try {
        return await nextResolve(candidate, context);
      } catch {
        // کاندید بعدی
      }
    }

    throw error;
  }
}
