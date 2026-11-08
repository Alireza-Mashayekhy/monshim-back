import './editor.css';

import type { JSONContent } from '@tiptap/react';
import {
  createElement,
  type CSSProperties,
  Fragment,
  type ReactNode,
} from 'react';

import JsonLd from '@/components/marketing/json-ld';
import { getBarber, type PublicBarber } from '@/lib/blog/server';
import {
  type FAQItem,
  headings,
  type MediaItem,
  plainText,
  safeUrl,
} from '@/lib/blog/types';
import { publicImageUrl } from '@/lib/images';
import { faqPageSchema } from '@/lib/seo';

import BarberSlider from './barber-slider';
import TableOfContents from './table-of-contents';

const palette = new Set([
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
function Media({ item }: { item: MediaItem }) {
  if (!item || typeof item !== 'object') return null;
  const src = safeUrl(item.src, true);
  if (!src) return null;
  const href = safeUrl(item.href),
    poster = safeUrl(item.poster, true);
  const width =
    Number(item.width) >= 25 && Number(item.width) <= 100
      ? Number(item.width)
      : 100;
  const align =
    item.align === 'start'
      ? '0 0 0 auto'
      : item.align === 'end'
        ? '0 auto 0 0'
        : '0 auto';
  const content =
    item.kind === 'video' ? (
      <video
        src={publicImageUrl(src)}
        poster={poster ? publicImageUrl(poster) : undefined}
        controls={item.controls !== false}
        autoPlay={!!item.autoplay}
        muted={!!item.muted}
        loop={!!item.loop}
        playsInline
        preload="metadata"
        className="h-auto w-full rounded-lg"
      />
    ) : (
      <img
        src={publicImageUrl(src)}
        alt={item.alt || ''}
        title={item.title || undefined}
        loading="lazy"
        className="h-auto w-full rounded-lg"
      />
    );
  return (
    <figure
      style={{
        width: `${item.align === 'full' ? 100 : width}%`,
        margin: align,
        maxWidth: '100%',
      }}
      className="my-5!"
    >
      {href ? <a href={href}>{content}</a> : content}
      {item.caption && (
        <figcaption className="mt-2 text-center text-xs text-muted-foreground">
          {item.caption}
        </figcaption>
      )}
    </figure>
  );
}
function getFaq(doc: JSONContent): FAQItem[] {
  const rows: FAQItem[] = [];
  const visit = (n: JSONContent) => {
    if (!n || typeof n !== 'object') return;
    if (n.type === 'faq' && Array.isArray(n.attrs?.items))
      for (const x of n.attrs.items)
        if (
          typeof x?.question === 'string' &&
          typeof x?.answer === 'string' &&
          x.question.trim() &&
          x.answer.trim()
        )
          rows.push({ question: x.question, answer: x.answer });
    if (Array.isArray(n.content)) n.content.forEach(visit);
  };
  visit(doc);
  return rows;
}
export async function ArticleContent({ doc }: { doc: JSONContent }) {
  if (!doc || doc.type !== 'doc' || !Array.isArray(doc.content))
    return <p>محتوای مقاله در دسترس نیست.</p>;
  const toc = headings(doc);
  const faq = getFaq(doc);
  const allIds = new Set<number>();
  const collect = (n: JSONContent) => {
    if (!n || typeof n !== 'object') return;
    if (n.type === 'barberSlider' && Array.isArray(n.attrs?.ids))
      n.attrs.ids.slice(0, 30).forEach((id: unknown) => {
        const num = Number(id);
        if (Number.isSafeInteger(num) && num > 0) allIds.add(num);
      });
    if (Array.isArray(n.content)) n.content.forEach(collect);
  };
  collect(doc);
  const pairs = await Promise.all(
    [...allIds]
      .slice(0, 100)
      .map(async id => [id, await getBarber(id)] as const),
  );
  const barberMap = new Map<number, PublicBarber>(
    pairs.filter((pair): pair is readonly [number, PublicBarber] => !!pair[1]),
  );
  let headingIndex = 0;
  function render(node: JSONContent, key: string): ReactNode {
    if (!node || typeof node !== 'object') return null;
    if (node.type === 'text') {
      let text: ReactNode = typeof node.text === 'string' ? node.text : '';
      for (const [i, mark] of (Array.isArray(node.marks)
        ? node.marks
        : []
      ).entries()) {
        if (!mark || typeof mark !== 'object') continue;
        switch (mark.type) {
          case 'bold':
            text = <strong key={i}>{text}</strong>;
            break;
          case 'italic':
            text = <em key={i}>{text}</em>;
            break;
          case 'underline':
            text = <u key={i}>{text}</u>;
            break;
          case 'strike':
            text = <s key={i}>{text}</s>;
            break;
          case 'code':
            text = <code key={i}>{text}</code>;
            break;
          case 'subscript':
            text = <sub key={i}>{text}</sub>;
            break;
          case 'superscript':
            text = <sup key={i}>{text}</sup>;
            break;
          case 'link': {
            const href = safeUrl(mark.attrs?.href);
            if (href)
              text = (
                <a
                  key={i}
                  href={href}
                  target={
                    mark.attrs?.target === '_blank' ? '_blank' : undefined
                  }
                  rel={
                    mark.attrs?.target === '_blank'
                      ? 'noopener noreferrer'
                      : undefined
                  }
                >
                  {text}
                </a>
              );
            break;
          }
          case 'textStyle': {
            const color = String(mark.attrs?.color || ''),
              fontSize = String(mark.attrs?.fontSize || '');
            const style: CSSProperties = {};
            if (palette.has(color)) style.color = color;
            if (sizes.has(fontSize)) style.fontSize = fontSize;
            text = (
              <span key={i} style={style}>
                {text}
              </span>
            );
            break;
          }
          case 'highlight': {
            const color = String(mark.attrs?.color || '');
            text = (
              <mark
                key={i}
                style={{
                  backgroundColor: palette.has(color) ? color : undefined,
                }}
              >
                {text}
              </mark>
            );
            break;
          }
        }
      }
      return <Fragment key={key}>{text}</Fragment>;
    }
    const children = Array.isArray(node.content)
      ? node.content.map((x, i) => render(x, `${key}-${i}`))
      : [];
    const attrs = node.attrs || {};
    const textAlign = ['left', 'center', 'right', 'justify'].includes(
      String(attrs.textAlign),
    )
      ? (attrs.textAlign as CSSProperties['textAlign'])
      : undefined;
    const dir = ['rtl', 'ltr', 'auto'].includes(String(attrs.dir))
      ? attrs.dir
      : undefined;
    switch (node.type) {
      case 'paragraph':
        return (
          <p key={key} dir={dir} style={{ textAlign }}>
            {children}
          </p>
        );
      case 'heading': {
        const level = Number(attrs.level);
        const h = level >= 1 && level <= 6 ? level : 2;
        const id =
          [2, 3, 4].includes(h) && plainText(node).trim()
            ? toc[headingIndex++]?.id
            : undefined;
        return createElement(
          `h${h}`,
          { key, id, dir, style: { textAlign, scrollMarginTop: '5rem' } },
          children,
        );
      }
      case 'hardBreak':
        return <br key={key} />;
      case 'horizontalRule':
        return <hr key={key} />;
      case 'blockquote':
        return <blockquote key={key}>{children}</blockquote>;
      case 'codeBlock':
        return (
          <pre key={key}>
            <code>{children}</code>
          </pre>
        );
      case 'bulletList':
        return <ul key={key}>{children}</ul>;
      case 'orderedList':
        return (
          <ol key={key} start={Number(attrs.start) || 1}>
            {children}
          </ol>
        );
      case 'listItem':
        return <li key={key}>{children}</li>;
      case 'taskList':
        return (
          <ul key={key} data-type="taskList">
            {children}
          </ul>
        );
      case 'taskItem':
        return (
          <li key={key} data-type="taskItem">
            <input
              type="checkbox"
              checked={!!attrs.checked}
              readOnly
              aria-label="وضعیت"
            />
            <div>{children}</div>
          </li>
        );
      case 'table': {
        const firstRow = Array.isArray(node.content) ? node.content[0] : null;
        const widths = Array.isArray(firstRow?.content)
          ? firstRow.content.flatMap(cell => {
              const span = Math.max(
                1,
                Math.min(20, Number(cell?.attrs?.colspan) || 1),
              );
              const values = Array.isArray(cell?.attrs?.colwidth)
                ? cell.attrs.colwidth
                : [];
              return Array.from({ length: span }, (_, i) => {
                const value = Number(values[i]);
                return value >= 25 && value <= 2000 ? value : null;
              });
            })
          : [];
        return (
          <div key={key} className="overflow-x-auto">
            <table>
              {widths.some(Boolean) && (
                <colgroup>
                  {widths.map((width, i) => (
                    <col
                      key={i}
                      style={width ? { width: `${width}px` } : undefined}
                    />
                  ))}
                </colgroup>
              )}
              <tbody>{children}</tbody>
            </table>
          </div>
        );
      }
      case 'tableRow':
        return <tr key={key}>{children}</tr>;
      case 'tableHeader':
        return (
          <th
            key={key}
            colSpan={Math.max(1, Math.min(20, Number(attrs.colspan) || 1))}
            rowSpan={Math.max(1, Math.min(20, Number(attrs.rowspan) || 1))}
          >
            {children}
          </th>
        );
      case 'tableCell':
        return (
          <td
            key={key}
            colSpan={Math.max(1, Math.min(20, Number(attrs.colspan) || 1))}
            rowSpan={Math.max(1, Math.min(20, Number(attrs.rowspan) || 1))}
          >
            {children}
          </td>
        );
      case 'media':
        return <Media key={key} item={attrs as MediaItem} />;
      case 'gallery': {
        const items = Array.isArray(attrs.items)
          ? (attrs.items.slice(0, 30) as MediaItem[])
          : [];
        return items.length ? (
          <section key={key} className="my-8">
            {attrs.title && <h2 className="text-lg!">{String(attrs.title)}</h2>}
            <div
              className={items.length > 1 ? 'grid gap-3 sm:grid-cols-2' : ''}
            >
              {items.map((x, i) => (
                <Media key={i} item={x} />
              ))}
            </div>
          </section>
        ) : null;
      }
      case 'faq': {
        const items = Array.isArray(attrs.items)
          ? (attrs.items as FAQItem[]).filter(
              x =>
                typeof x?.question === 'string' &&
                typeof x?.answer === 'string' &&
                x.question.trim() &&
                x.answer.trim(),
            )
          : [];
        return items.length ? (
          <section key={key} className="my-8">
            <h2 className="text-lg!">
              {String(attrs.title || 'سوالات متداول')}
            </h2>
            {items.map((x, i) => (
              <details key={i} className="border-b py-3">
                <summary className="cursor-pointer font-semibold">
                  {x.question}
                </summary>
                <p className="whitespace-pre-wrap">{x.answer}</p>
              </details>
            ))}
          </section>
        ) : null;
      }
      case 'toc':
        return (
          <TableOfContents
            key={key}
            title={String(attrs.title || '')}
            items={toc}
          />
        );
      case 'barberSlider': {
        const ids = Array.isArray(attrs.ids) ? attrs.ids : [];
        const barbers = ids
          .map((id: unknown) => barberMap.get(Number(id)))
          .filter((b): b is PublicBarber => !!b);
        return (
          <BarberSlider
            key={key}
            title={String(attrs.title || '')}
            barbers={barbers}
            autoplay={!!attrs.autoplay}
          />
        );
      }
      default:
        return null;
    }
  }
  const content = doc.content.map((n, i) => render(n, `n${i}`));
  return (
    <div className="blog-prose">
      {faq.length > 0 && <JsonLd data={faqPageSchema(faq)} />}
      {content}
    </div>
  );
}
