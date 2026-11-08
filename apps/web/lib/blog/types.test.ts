import assert from 'node:assert/strict';
import test from 'node:test';

import { headings, safeUrl } from './types.ts';

test('headings get deterministic, globally unique IDs even for colliding titles', () => {
  const heading = (text: string, level = 2) => ({
    type: 'heading',
    attrs: { level },
    content: [{ type: 'text', text }],
  });
  const doc = {
    type: 'doc',
    content: [
      heading('سلام'),
      heading('سلام-2'),
      heading('سلام'),
      heading('سلام'),
      heading('Ignored', 1),
      heading('Section', 3),
    ],
  };
  assert.deepEqual(
    headings(doc).map(h => h.id),
    [
      'section-سلام',
      'section-سلام-2',
      'section-سلام-3',
      'section-سلام-4',
      'section-section',
    ],
  );
});

test('suspicious URLs are never accepted as links or media', () => {
  for (const url of [
    'javascript:alert(1)',
    '//evil.example/a',
    'http://example.com',
    'data:text/html,abc',
    '/\\evil',
  ])
    assert.equal(safeUrl(url), '');
  assert.equal(safeUrl('/blog/hello'), '/blog/hello');
  assert.equal(safeUrl('mailto:test@example.com'), 'mailto:test@example.com');
  assert.equal(safeUrl('tel:+12345', true), '');
});
