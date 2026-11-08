import type { JSONContent } from '@tiptap/react';

export interface BlogArticle {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: JSONContent;
  status: 'draft' | 'published';
  featured: boolean;
  cover: string | null;
  metaTitle: string;
  metaDescription: string;
  indexable: boolean;
  follow: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
export type BlogInput = Omit<
  BlogArticle,
  'id' | 'publishedAt' | 'createdAt' | 'updatedAt'
>;
export interface MediaItem {
  kind: 'image' | 'video';
  src: string;
  alt: string;
  title: string;
  caption: string;
  href: string;
  poster: string;
  width: number;
  align: string;
  controls: boolean;
  autoplay: boolean;
  muted: boolean;
  loop: boolean;
}
export interface FAQItem {
  question: string;
  answer: string;
}
export const emptyMedia = (kind: 'image' | 'video' = 'image'): MediaItem => ({
  kind,
  src: '',
  alt: '',
  title: '',
  caption: '',
  href: '',
  poster: '',
  width: 100,
  align: 'center',
  controls: true,
  autoplay: false,
  muted: false,
  loop: false,
});
export const emptyArticle: BlogInput = {
  title: '',
  slug: '',
  excerpt: '',
  content: { type: 'doc', content: [{ type: 'paragraph' }] },
  status: 'draft',
  featured: false,
  cover: null,
  metaTitle: '',
  metaDescription: '',
  indexable: true,
  follow: true,
};

export function safeUrl(value: unknown, media = false): string {
  if (typeof value !== 'string' || !value || /[\u0000-\u0020\\]/.test(value))
    return '';
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    return (media ? ['https:'] : ['https:', 'mailto:', 'tel:']).includes(
      new URL(value).protocol,
    )
      ? value
      : '';
  } catch {
    return '';
  }
}
export function plainText(node: JSONContent): string {
  if (!node || typeof node !== 'object') return '';
  return node.type === 'text'
    ? typeof node.text === 'string'
      ? node.text
      : ''
    : Array.isArray(node.content)
      ? node.content.map(plainText).join('')
      : '';
}
export function headings(doc: JSONContent) {
  const seen = new Map<string, number>();
  const used = new Set<string>();
  const result: { title: string; id: string; level: number }[] = [];
  function walk(node: JSONContent) {
    if (!node || typeof node !== 'object') return;
    if (
      node.type === 'heading' &&
      [2, 3, 4].includes(Number(node.attrs?.level))
    ) {
      const title = plainText(node).trim();
      if (title) {
        const base =
          title
            .toLowerCase()
            .normalize('NFC')
            .replace(/[^\p{L}\p{N}\s-]/gu, '')
            .trim()
            .replace(/[\s-]+/g, '-') || 'heading';
        let count = (seen.get(base) ?? 0) + 1;
        let id = `section-${base}${count > 1 ? `-${count}` : ''}`;
        while (used.has(id)) {
          count++;
          id = `section-${base}-${count}`;
        }
        seen.set(base, count);
        used.add(id);
        result.push({ title, id, level: Number(node.attrs?.level) });
      }
    }
    if (Array.isArray(node.content)) node.content.forEach(walk);
  }
  walk(doc);
  return result;
}
