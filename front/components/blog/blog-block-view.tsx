'use client';

import type { Editor } from '@tiptap/core';
import { type NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  GripVertical,
  Trash2,
  Upload,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  emptyMedia,
  type FAQItem,
  headings,
  type MediaItem,
  safeUrl,
} from '@/lib/blog/types';
import { publicImageUrl } from '@/lib/images';
import { api } from '@/services/api/client';
import type { ApiListResponse } from '@/services/api/types';
import { blogApi } from '@/services/features/blog/api';

const labels: Record<string, string> = {
  media: 'رسانه',
  gallery: 'گالری',
  faq: 'سوالات متداول',
  toc: 'فهرست مطالب',
  barberSlider: 'اسلایدر آرایشگرها',
};
const field = 'w-full rounded-md border bg-white px-2 py-1.5 text-sm';

function UploadButton({
  onDone,
}: {
  onDone: (url: string, kind: 'image' | 'video') => void;
}) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{
    url: string;
    video: boolean;
  } | null>(null);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview.url);
    },
    [preview],
  );
  async function upload(file: File) {
    setPreview({
      url: URL.createObjectURL(file),
      video: file.type.startsWith('video/'),
    });
    setError('');
    setProgress(0);
    try {
      const url = await blogApi.upload(file, setProgress);
      onDone(url, file.type.startsWith('video/') ? 'video' : 'image');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'آپلود ناموفق بود');
    } finally {
      setProgress(null);
      setPreview(null);
    }
  }
  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-md border border-dashed p-2"
      onDragOver={e => e.preventDefault()}
      onDrop={e => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files[0];
        if (file && progress === null) void upload(file);
      }}
    >
      <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border bg-white px-3 py-2 text-xs">
        <Upload className="size-4" /> انتخاب یا رها کردن فایل
        <input
          className="sr-only"
          type="file"
          disabled={progress !== null}
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/ogg,video/x-m4v"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = '';
          }}
        />
      </label>
      {preview &&
        (preview.video ? (
          <video
            src={preview.url}
            controls
            className="max-h-24 max-w-32 rounded"
          />
        ) : (
          <img
            src={preview.url}
            alt="پیش‌نمایش فایل انتخاب‌شده"
            className="max-h-24 max-w-32 rounded object-contain"
          />
        ))}
      {progress !== null && (
        <span role="status" className="text-xs">
          در حال آپلود: {progress}٪
        </span>
      )}
      {error && (
        <span role="alert" className="text-xs text-red-600">
          {error}
        </span>
      )}
    </div>
  );
}

function GalleryUploads({
  items,
  onChange,
}: {
  items: MediaItem[];
  onChange: (items: MediaItem[]) => void;
}) {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  async function upload(files: FileList | File[]) {
    const queue = Array.from(files).slice(0, Math.max(0, 30 - items.length));
    if (!queue.length) {
      setStatus('گالری حداکثر ۳۰ رسانه دارد');
      return;
    }
    setBusy(true);
    let current = [...items];
    try {
      for (const [index, file] of queue.entries()) {
        const url = await blogApi.upload(file, percent =>
          setStatus(`فایل ${index + 1} از ${queue.length}: ${percent}٪`),
        );
        current = [
          ...current,
          {
            ...emptyMedia(file.type.startsWith('video/') ? 'video' : 'image'),
            src: url,
          },
        ];
        onChange(current);
      }
      setStatus('آپلود رسانه‌ها کامل شد');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'آپلود ناموفق بود');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className="rounded-md border border-dashed p-2"
      onDragOver={e => e.preventDefault()}
      onDrop={e => {
        e.preventDefault();
        e.stopPropagation();
        if (!busy) void upload(e.dataTransfer.files);
      }}
    >
      <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border bg-white px-3 py-2 text-xs">
        <Upload className="size-4" /> آپلود چند رسانه یا رها کردن فایل‌ها
        <input
          type="file"
          multiple
          className="sr-only"
          disabled={busy}
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/ogg,video/x-m4v"
          onChange={e => {
            if (e.target.files) void upload(e.target.files);
            e.target.value = '';
          }}
        />
      </label>
      {status && (
        <span className="ms-2 text-xs" role="status">
          {status}
        </span>
      )}
    </div>
  );
}

function MediaFields({
  item,
  onChange,
}: {
  item: MediaItem;
  onChange: (v: MediaItem) => void;
}) {
  const set = (patch: Partial<MediaItem>) => onChange({ ...item, ...patch });
  const src = safeUrl(item.src, true);
  return (
    <div className="space-y-2">
      {src && (
        <div
          style={{
            width: `${item.width}%`,
            minWidth: '25%',
            maxWidth: '100%',
            resize: 'horizontal',
            overflow: 'auto',
          }}
          className="border border-dashed rounded"
          title="برای تغییر عرض، لبه کادر را بکشید"
          onMouseUp={event => {
            const element = event.currentTarget;
            const parent = element.parentElement;
            if (parent && parent.clientWidth) {
              const width = Math.max(
                25,
                Math.min(
                  100,
                  Math.round(
                    (element.getBoundingClientRect().width /
                      parent.getBoundingClientRect().width) *
                      100,
                  ),
                ),
              );
              if (width !== item.width) set({ width });
            }
          }}
        >
          {item.kind === 'video' ? (
            <video
              src={publicImageUrl(src)}
              controls
              className="max-h-48 w-full rounded"
            />
          ) : (
            <img
              src={publicImageUrl(src)}
              alt={item.alt}
              className="max-h-48 w-full rounded object-contain"
            />
          )}
        </div>
      )}
      <UploadButton onDone={(url, kind) => set({ src: url, kind })} />
      <label className="block text-xs">
        آدرس رسانه
        <input
          className={field}
          dir="ltr"
          maxLength={2048}
          value={item.src}
          onChange={e => set({ src: e.target.value })}
          placeholder="https:// یا /uploads/..."
        />
      </label>
      {item.kind === 'image' ? (
        <label className="block text-xs">
          متن جایگزین
          <input
            className={field}
            maxLength={300}
            value={item.alt}
            onChange={e => set({ alt: e.target.value })}
          />
        </label>
      ) : (
        <label className="block text-xs">
          آدرس پوستر
          <input
            className={field}
            dir="ltr"
            maxLength={2048}
            value={item.poster}
            onChange={e => set({ poster: e.target.value })}
          />
        </label>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs">
          زیرنویس
          <input
            className={field}
            maxLength={500}
            value={item.caption}
            onChange={e => set({ caption: e.target.value })}
          />
        </label>
        <label className="text-xs">
          پیوند
          <input
            className={field}
            dir="ltr"
            maxLength={2048}
            value={item.href}
            onChange={e => set({ href: e.target.value })}
          />
        </label>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-xs">
          عنوان
          <input
            className={field}
            maxLength={300}
            value={item.title}
            onChange={e => set({ title: e.target.value })}
          />
        </label>
        <label className="text-xs">
          عرض
          <select
            className={field}
            value={item.width}
            onChange={e => set({ width: Number(e.target.value) })}
          >
            {![25, 33, 50, 66, 75, 100].includes(item.width) && (
              <option value={item.width}>{item.width}٪</option>
            )}
            {[25, 33, 50, 66, 75, 100].map(n => (
              <option key={n} value={n}>
                {n}٪
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          چینش
          <select
            className={field}
            value={item.align}
            onChange={e => set({ align: e.target.value })}
          >
            <option value="start">ابتدا</option>
            <option value="center">وسط</option>
            <option value="end">انتها</option>
            <option value="full">تمام عرض</option>
          </select>
        </label>
      </div>
      {item.kind === 'video' && (
        <div className="flex flex-wrap gap-3 text-xs">
          {(['controls', 'autoplay', 'muted', 'loop'] as const).map(k => (
            <label key={k} className="flex gap-1">
              <input
                type="checkbox"
                checked={item[k]}
                onChange={e => set({ [k]: e.target.checked })}
              />
              {
                {
                  controls: 'کنترل پخش',
                  autoplay: 'پخش خودکار',
                  muted: 'بی‌صدا',
                  loop: 'تکرار',
                }[k]
              }
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function BarberPicker({
  ids,
  onChange,
}: {
  ids: number[];
  onChange: (ids: number[]) => void;
}) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<{ id: number; salonName: string }[]>(
    [],
  );
  const [error, setError] = useState('');
  const [previews, setPreviews] = useState<
    Record<
      number,
      {
        salonName: string;
        profileImage: string | null;
        city?: { name: string } | null;
      } | null
    >
  >({});
  const idKey = ids.join(',');
  useEffect(() => {
    let alive = true;
    const selected = idKey ? idKey.split(',').map(Number) : [];
    void Promise.all(
      selected.map(async id => {
        try {
          const response = await api.get<{
            data: {
              salonName: string;
              profileImage: string | null;
              city?: { name: string } | null;
            };
          }>(`/blog/barbers/${id}`);
          return [id, response.data.data] as const;
        } catch {
          return [id, null] as const;
        }
      }),
    ).then(entries => {
      if (alive) setPreviews(Object.fromEntries(entries));
    });
    return () => {
      alive = false;
    };
  }, [idKey]);
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        فقط آرایشگرهایی که صفحه عمومی فعال دارند در سایت نشان داده می‌شوند.
      </p>
      <div className="flex gap-2">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="نام آرایشگاه"
        />
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            try {
              const r = await api.get<
                ApiListResponse<{ id: number; salonName: string }>
              >('/barber', { params: { search, limit: 20 } });
              setResults(r.data.data);
              setError('');
            } catch {
              setError('جستجوی آرایشگر ناموفق بود');
            }
          }}
        >
          جستجو
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {results.map(b => (
          <Button
            key={b.id}
            type="button"
            variant="outline"
            size="sm"
            disabled={ids.includes(b.id) || ids.length >= 30}
            onClick={() => onChange([...ids, b.id])}
          >
            {b.salonName} +
          </Button>
        ))}
      </div>
      <ol className="space-y-1">
        {ids.map((id, i) => (
          <li
            key={id}
            className="flex items-center gap-2 rounded-md border bg-white p-2 text-xs"
          >
            {previews[id]?.profileImage && (
              <img
                src={publicImageUrl(previews[id]!.profileImage)}
                alt=""
                className="size-9 rounded object-cover"
              />
            )}
            <span>
              {previews[id]?.salonName ||
                (previews[id] === null
                  ? `آرایشگر #${id} (صفحه عمومی غیرفعال یا ناموجود)`
                  : `در حال دریافت #${id}`)}
              {previews[id]?.city?.name ? ` · ${previews[id]?.city?.name}` : ''}
            </span>
            <button
              type="button"
              onClick={() => {
                if (i > 0) {
                  const next = [...ids];
                  [next[i - 1], next[i]] = [next[i], next[i - 1]];
                  onChange(next);
                }
              }}
              aria-label="انتقال بالا"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => {
                if (i < ids.length - 1) {
                  const next = [...ids];
                  [next[i + 1], next[i]] = [next[i], next[i + 1]];
                  onChange(next);
                }
              }}
              aria-label="انتقال پایین"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => onChange(ids.filter(x => x !== id))}
            >
              حذف
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

function TocPreview({ editor }: { editor: Editor }) {
  const [items, setItems] = useState(() => headings(editor.getJSON()));
  useEffect(() => {
    const update = () => setItems(headings(editor.getJSON()));
    editor.on('update', update);
    return () => {
      editor.off('update', update);
    };
  }, [editor]);
  return (
    <ol className="space-y-1 text-xs text-muted-foreground">
      {items.map(item => (
        <li key={item.id}>{item.title}</li>
      ))}
    </ol>
  );
}

export function BlogBlockView({
  node,
  editor,
  getPos,
  updateAttributes,
  deleteNode,
}: NodeViewProps) {
  const type = node.type.name,
    attrs = node.attrs;
  const title = String(attrs.title ?? '');
  function move(delta: number) {
    const pos = getPos();
    if (typeof pos !== 'number') return;
    const $pos = editor.state.doc.resolve(pos);
    const index = $pos.index();
    const parent = $pos.parent;
    const target = index + delta;
    if (target < 0 || target >= parent.childCount) return;
    const sibling = parent.child(target);
    const start = delta < 0 ? pos - sibling.nodeSize : pos;
    const end =
      delta < 0 ? pos + node.nodeSize : pos + node.nodeSize + sibling.nodeSize;
    editor.view.dispatch(
      editor.state.tr.replaceWith(
        start,
        end,
        delta < 0 ? [node, sibling] : [sibling, node],
      ),
    );
  }
  function duplicate() {
    const pos = getPos();
    if (typeof pos === 'number')
      editor.view.dispatch(
        editor.state.tr.insert(pos + node.nodeSize, node.copy(node.content)),
      );
  }
  const items = Array.isArray(attrs.items) ? attrs.items : [];
  return (
    <NodeViewWrapper
      className="my-4 rounded-xl border border-primary/20 bg-primary-3 p-4"
      contentEditable={false}
      dir="rtl"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 font-bold text-primary">
          <span data-drag-handle title="کشیدن بلوک" className="cursor-grab">
            <GripVertical className="size-4" />
          </span>
          {labels[type]}
        </div>
        <div className="flex gap-1">
          {[
            [ArrowUp, 'انتقال بالا', () => move(-1)],
            [ArrowDown, 'انتقال پایین', () => move(1)],
            [Copy, 'کپی بلوک', duplicate],
            [Trash2, 'حذف بلوک', deleteNode],
          ].map(([Icon, label, action]) => {
            const I = Icon as typeof ArrowUp;
            return (
              <button
                key={label as string}
                type="button"
                title={label as string}
                aria-label={label as string}
                className="rounded p-1 hover:bg-white focus-visible:ring-2"
                onClick={action as () => void}
              >
                <I className="size-4" />
              </button>
            );
          })}
        </div>
      </div>
      {type !== 'media' && (
        <label className="mb-2 block text-xs">
          عنوان اختیاری
          <input
            className={field}
            maxLength={200}
            value={title}
            onChange={e => updateAttributes({ title: e.target.value })}
          />
        </label>
      )}
      {type === 'media' && (
        <MediaFields
          item={{ ...emptyMedia(attrs.kind), ...attrs } as MediaItem}
          onChange={v => updateAttributes(v)}
        />
      )}
      {type === 'toc' && <TocPreview editor={editor} />}
      {type === 'barberSlider' && (
        <>
          <label className="mb-2 flex gap-2 text-xs">
            <input
              type="checkbox"
              checked={!!attrs.autoplay}
              onChange={e => updateAttributes({ autoplay: e.target.checked })}
            />
            پخش خودکار
          </label>
          <BarberPicker
            ids={Array.isArray(attrs.ids) ? attrs.ids : []}
            onChange={ids => updateAttributes({ ids })}
          />
        </>
      )}
      {type === 'faq' && (
        <div className="space-y-3">
          {(items as FAQItem[]).map((item, i) => (
            <div key={i} className="space-y-2 rounded-lg border bg-white p-3">
              <input
                className={field}
                maxLength={500}
                placeholder="سوال"
                value={item.question}
                onChange={e =>
                  updateAttributes({
                    items: items.map((x, n) =>
                      n === i ? { ...x, question: e.target.value } : x,
                    ),
                  })
                }
              />
              <textarea
                className={field}
                maxLength={4000}
                placeholder="پاسخ"
                value={item.answer}
                onChange={e =>
                  updateAttributes({
                    items: items.map((x, n) =>
                      n === i ? { ...x, answer: e.target.value } : x,
                    ),
                  })
                }
              />
              <button
                type="button"
                onClick={() =>
                  updateAttributes({ items: items.filter((_, n) => n !== i) })
                }
                className="text-xs text-red-600"
              >
                حذف سوال
              </button>{' '}
              <button
                type="button"
                onClick={() => {
                  if (i > 0) {
                    const a = [...items];
                    [a[i - 1], a[i]] = [a[i], a[i - 1]];
                    updateAttributes({ items: a });
                  }
                }}
                className="text-xs"
              >
                انتقال بالا
              </button>{' '}
              <button
                type="button"
                onClick={() => {
                  if (i < items.length - 1) {
                    const a = [...items];
                    [a[i + 1], a[i]] = [a[i], a[i + 1]];
                    updateAttributes({ items: a });
                  }
                }}
                className="text-xs"
              >
                انتقال پایین
              </button>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={items.length >= 50}
            onClick={() =>
              updateAttributes({
                items: [...items, { question: '', answer: '' }],
              })
            }
          >
            افزودن سوال
          </Button>
        </div>
      )}
      {type === 'gallery' && (
        <div className="space-y-3">
          <GalleryUploads
            items={items as MediaItem[]}
            onChange={next => updateAttributes({ items: next })}
          />
          {(items as MediaItem[]).map((item, i) => (
            <div key={i} className="space-y-2 rounded-lg border bg-white p-3">
              <MediaFields
                item={{ ...emptyMedia(), ...item }}
                onChange={v =>
                  updateAttributes({
                    items: items.map((x, n) => (n === i ? v : x)),
                  })
                }
              />
              <button
                type="button"
                className="text-xs text-red-600"
                onClick={() =>
                  updateAttributes({ items: items.filter((_, n) => n !== i) })
                }
              >
                حذف
              </button>{' '}
              <button
                type="button"
                className="text-xs"
                onClick={() => {
                  if (i > 0) {
                    const a = [...items];
                    [a[i - 1], a[i]] = [a[i], a[i - 1]];
                    updateAttributes({ items: a });
                  }
                }}
              >
                انتقال بالا
              </button>{' '}
              <button
                type="button"
                className="text-xs"
                onClick={() => {
                  if (i < items.length - 1) {
                    const a = [...items];
                    [a[i + 1], a[i]] = [a[i], a[i + 1]];
                    updateAttributes({ items: a });
                  }
                }}
              >
                انتقال پایین
              </button>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={items.length >= 30}
            onClick={() =>
              updateAttributes({ items: [...items, emptyMedia()] })
            }
          >
            افزودن رسانه
          </Button>
        </div>
      )}
    </NodeViewWrapper>
  );
}
