import { BadRequestException } from '@nestjs/common';

type ObjectValue = Record<string, unknown>;
const nodes = new Set([
  'doc',
  'paragraph',
  'heading',
  'blockquote',
  'codeBlock',
  'text',
  'hardBreak',
  'horizontalRule',
  'bulletList',
  'orderedList',
  'listItem',
  'taskList',
  'taskItem',
  'table',
  'tableRow',
  'tableHeader',
  'tableCell',
  'media',
  'gallery',
  'faq',
  'toc',
  'barberSlider',
]);
const marks = new Set([
  'bold',
  'italic',
  'strike',
  'underline',
  'code',
  'subscript',
  'superscript',
  'link',
  'textStyle',
  'highlight',
]);
const colors = new Set([
  '#0b7285',
  '#1f2937',
  '#dc2626',
  '#d97706',
  '#15803d',
  '#2563eb',
  '#9333ea',
  '#fef08a',
  '#bbf7d0',
  '#bae6fd',
  '#ffffff',
  '#000000',
]);
const sizes = new Set(['12px', '14px', '16px', '18px', '22px', '28px', '34px']);
const obj = (v: unknown): ObjectValue =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as ObjectValue) : {};
const str = (v: unknown, max = 1000) => {
  if (typeof v !== 'string') return '';
  if (v.length > max)
    throw new BadRequestException('طول یکی از مقادیر محتوا بیش از حد مجاز است');
  return v;
};
const bool = (v: unknown) => v === true;

/** Only relative paths and explicitly supported schemes; never protocol-relative or script URLs. */
export function safeUrl(value: unknown, media = false): string {
  const s = str(value, 2048).trim();
  if (!s || /[\u0000-\u0020\\]/.test(s)) return '';
  if (s.startsWith('/') && !s.startsWith('//')) return s;
  try {
    const u = new URL(s);
    return (media ? ['https:'] : ['https:', 'mailto:', 'tel:']).includes(
      u.protocol,
    )
      ? s
      : '';
  } catch {
    return '';
  }
}

function contentUrl(value: unknown, media = false): string {
  const result = safeUrl(value, media);
  if (typeof value === 'string' && value.trim() && !result)
    throw new BadRequestException('آدرس رسانه یا پیوند نامعتبر است');
  return result;
}

function mediaAttrs(value: unknown): ObjectValue {
  const a = obj(value);
  return {
    kind: a.kind === 'video' ? 'video' : 'image',
    src: contentUrl(a.src, true),
    alt: str(a.alt, 300),
    title: str(a.title, 300),
    caption: str(a.caption, 500),
    href: contentUrl(a.href),
    poster: contentUrl(a.poster, true),
    width:
      Number.isInteger(Number(a.width)) &&
      Number(a.width) >= 25 &&
      Number(a.width) <= 100
        ? Number(a.width)
        : 100,
    align: ['start', 'center', 'end', 'full'].includes(String(a.align))
      ? a.align
      : 'center',
    controls: a.controls !== false,
    autoplay: bool(a.autoplay),
    muted: bool(a.muted),
    loop: bool(a.loop),
  };
}

function nodeAttrs(type: string, value: unknown): ObjectValue | undefined {
  const a = obj(value);
  switch (type) {
    case 'heading':
      return {
        level: [1, 2, 3, 4, 5, 6].includes(Number(a.level))
          ? Number(a.level)
          : 2,
        ...textAttrs(a),
      };
    case 'paragraph':
      return textAttrs(a);
    case 'orderedList':
      return {
        start:
          Number.isInteger(a.start) &&
          Number(a.start) > 0 &&
          Number(a.start) < 10000
            ? a.start
            : 1,
      };
    case 'taskItem':
      return { checked: bool(a.checked) };
    case 'tableCell':
    case 'tableHeader':
      return {
        colspan: bounded(a.colspan, 1, 20),
        rowspan: bounded(a.rowspan, 1, 20),
        colwidth: Array.isArray(a.colwidth)
          ? a.colwidth.slice(0, 20).map(x => bounded(x, 25, 2000))
          : null,
      };
    case 'media':
      return mediaAttrs(a);
    case 'gallery':
      if (Array.isArray(a.items) && a.items.length > 30)
        throw new BadRequestException('گالری حداکثر ۳۰ رسانه دارد');
      return {
        title: str(a.title, 200),
        items: Array.isArray(a.items)
          ? a.items.slice(0, 30).map(mediaAttrs)
          : [],
      };
    case 'faq':
      if (Array.isArray(a.items) && a.items.length > 50)
        throw new BadRequestException('حداکثر ۵۰ سوال مجاز است');
      return {
        title: str(a.title, 200),
        items: Array.isArray(a.items)
          ? a.items.slice(0, 50).map(x => ({
              question: str(obj(x).question, 500),
              answer: str(obj(x).answer, 4000),
            }))
          : [],
      };
    case 'toc':
      return { title: str(a.title, 200) };
    case 'barberSlider':
      if (Array.isArray(a.ids) && a.ids.length > 30)
        throw new BadRequestException('حداکثر ۳۰ آرایشگر مجاز است');
      return {
        title: str(a.title, 200),
        autoplay: bool(a.autoplay),
        ids: Array.isArray(a.ids)
          ? [
              ...new Set(
                a.ids.map(Number).filter(x => Number.isSafeInteger(x) && x > 0),
              ),
            ].slice(0, 30)
          : [],
      };
    default:
      return undefined;
  }
}
function bounded(v: unknown, min: number, max: number) {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : min;
}
function textAttrs(a: ObjectValue) {
  return {
    textAlign: ['left', 'center', 'right', 'justify'].includes(
      String(a.textAlign),
    )
      ? a.textAlign
      : null,
    dir: ['rtl', 'ltr', 'auto'].includes(String(a.dir)) ? a.dir : null,
  };
}
function cleanMark(v: unknown): ObjectValue {
  const m = obj(v),
    type = str(m.type, 40),
    a = obj(m.attrs);
  if (!marks.has(type))
    throw new BadRequestException('قالب متن پشتیبانی نمی‌شود');
  if (type === 'link') {
    const href = safeUrl(a.href);
    if (!href) throw new BadRequestException('آدرس پیوند نامعتبر است');
    return {
      type,
      attrs: {
        href,
        target: a.target === '_blank' ? '_blank' : null,
        rel: a.target === '_blank' ? 'noopener noreferrer' : null,
        class: null,
      },
    };
  }
  if (type === 'textStyle')
    return {
      type,
      attrs: {
        color: colors.has(String(a.color).toLowerCase())
          ? String(a.color).toLowerCase()
          : null,
        fontSize: sizes.has(String(a.fontSize)) ? a.fontSize : null,
      },
    };
  if (type === 'highlight')
    return {
      type,
      attrs: {
        color: colors.has(String(a.color).toLowerCase())
          ? String(a.color).toLowerCase()
          : null,
      },
    };
  return { type };
}

/** Strict allowlist: persist only the editor schema and inert, bounded data. */
export function sanitizeContent(input: unknown): ObjectValue {
  if (Buffer.byteLength(JSON.stringify(input) ?? '', 'utf8') > 1_000_000)
    throw new BadRequestException('محتوای مقاله بیش از حد بزرگ است');
  let count = 0;
  function visit(value: unknown, depth: number): ObjectValue {
    const node = obj(value),
      type = str(node.type, 40);
    if (++count > 12000 || depth > 25 || !nodes.has(type))
      throw new BadRequestException('ساختار محتوای مقاله نامعتبر است');
    const out: ObjectValue = { type };
    if (type === 'text') {
      if (typeof node.text !== 'string' || node.text.length > 100000)
        throw new BadRequestException('متن نامعتبر است');
      out.text = node.text;
      if (Array.isArray(node.marks))
        out.marks = node.marks.slice(0, 12).map(cleanMark);
    }
    const attrs = nodeAttrs(type, node.attrs);
    if (attrs) out.attrs = attrs;
    if (node.content !== undefined) {
      if (!Array.isArray(node.content))
        throw new BadRequestException('ساختار محتوای مقاله نامعتبر است');
      out.content = node.content.map(x => visit(x, depth + 1));
    }
    return out;
  }
  const result = visit(input, 0);
  const block = [
    'paragraph',
    'heading',
    'blockquote',
    'codeBlock',
    'horizontalRule',
    'bulletList',
    'orderedList',
    'taskList',
    'table',
    'media',
    'gallery',
    'faq',
    'toc',
    'barberSlider',
  ];
  const allowed: Record<string, string[]> = {
    doc: block,
    blockquote: block,
    listItem: block,
    taskItem: block,
    paragraph: ['text', 'hardBreak'],
    heading: ['text', 'hardBreak'],
    codeBlock: ['text'],
    bulletList: ['listItem'],
    orderedList: ['listItem'],
    taskList: ['taskItem'],
    table: ['tableRow'],
    tableRow: ['tableHeader', 'tableCell'],
    tableHeader: block,
    tableCell: block,
  };
  function validate(n: ObjectValue): void {
    const type = String(n.type);
    const content = n.content as ObjectValue[] | undefined;
    if (
      content &&
      (!allowed[type] ||
        content.some(child => !allowed[type].includes(String(child.type))))
    )
      throw new BadRequestException('ترتیب بلوک‌های مقاله معتبر نیست');
    if (
      [
        'doc',
        'bulletList',
        'orderedList',
        'taskList',
        'table',
        'tableRow',
        'blockquote',
        'listItem',
        'taskItem',
        'tableCell',
        'tableHeader',
      ].includes(type) &&
      (!content || !content.length)
    )
      throw new BadRequestException('بلوک خالی نامعتبر است');
    if (
      (type === 'listItem' || type === 'taskItem') &&
      content?.[0]?.type !== 'paragraph'
    )
      throw new BadRequestException('آیتم فهرست باید با پاراگراف شروع شود');
    if (
      type === 'codeBlock' &&
      content?.some(
        child => Array.isArray(child.marks) && child.marks.length > 0,
      )
    )
      throw new BadRequestException('کد نمی‌تواند قالب متن داشته باشد');
    if (type === 'text' && (!n.text || content))
      throw new BadRequestException('متن نامعتبر است');
    if (content) content.forEach(validate);
  }
  if (result.type !== 'doc' || !Array.isArray(result.content))
    throw new BadRequestException('سند مقاله نامعتبر است');
  validate(result);
  return result;
}
