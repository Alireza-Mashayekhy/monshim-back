'use client';
import { useMutation, useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorMessage } from '@/lib/api-error';
import { type BlogInput, emptyArticle, safeUrl } from '@/lib/blog/types';
import { publicImageUrl } from '@/lib/images';
import { blogApi } from '@/services/features/blog/api';

const Editor = dynamic(() => import('./blog-editor'), {
  ssr: false,
  loading: () => (
    <div className="min-h-[440px] rounded-xl border bg-white p-4">
      در حال آماده‌سازی ویرایشگر...
    </div>
  ),
});
function Form({ initial, id }: { initial: BlogInput; id?: number }) {
  const router = useRouter();
  const [form, setForm] = useState<BlogInput>(initial);
  const [progress, setProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState('');
  const set = (patch: Partial<BlogInput>) => setForm(f => ({ ...f, ...patch }));
  const mutation = useMutation({
    mutationFn: (v: BlogInput) =>
      id ? blogApi.update(id, v) : blogApi.create(v),
    onSuccess: article => {
      toast.success('مقاله ذخیره شد');
      router.replace(`/admin/blog/${article.id}`);
      router.refresh();
    },
    onError: e => toast.error(getApiErrorMessage(e, 'ذخیره مقاله ناموفق بود')),
  });
  return (
    <form
      className="space-y-5"
      onSubmit={e => {
        e.preventDefault();
        mutation.mutate(form);
      }}
      dir="rtl"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/blog" className="text-xs text-primary">
            ← بازگشت به فهرست
          </Link>
          <h1 className="mt-2 text-xl font-bold">
            {id ? 'ویرایش مقاله' : 'مقاله جدید'}
          </h1>
        </div>
        <div className="flex gap-2">
          {id && form.status === 'published' && (
            <Button type="button" variant="outline" asChild>
              <Link
                href={`/blog/${encodeURIComponent(form.slug)}`}
                target="_blank"
              >
                مشاهده مقاله
              </Link>
            </Button>
          )}
          <Button
            type="submit"
            disabled={mutation.isPending || progress !== null}
          >
            {mutation.isPending ? 'در حال ذخیره...' : 'ذخیره مقاله'}
          </Button>
        </div>
      </div>
      <section className="grid gap-4 rounded-xl border bg-white p-5 md:grid-cols-2">
        <h2 className="col-span-full font-bold">مشخصات مقاله</h2>
        <label className="text-sm">
          عنوان *
          <Input
            required
            maxLength={200}
            value={form.title}
            onChange={e => set({ title: e.target.value })}
          />
        </label>
        <label className="text-sm">
          نامک *
          <Input
            required
            dir="ltr"
            maxLength={180}
            value={form.slug}
            onChange={e => set({ slug: e.target.value })}
            placeholder="article-slug"
          />
        </label>
        <p className="col-span-full text-xs text-muted-foreground">
          نامک از حروف، اعداد و خط تیره تشکیل شود.
        </p>
        <label className="col-span-full text-sm">
          خلاصه
          <Textarea
            maxLength={2000}
            value={form.excerpt}
            onChange={e => set({ excerpt: e.target.value })}
          />
        </label>
        <label className="text-sm">
          وضعیت
          <select
            className="mt-1 w-full rounded-lg border p-2"
            value={form.status}
            onChange={e =>
              set({ status: e.target.value as BlogInput['status'] })
            }
          >
            <option value="draft">پیش‌نویس</option>
            <option value="published">منتشر شده</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={e => set({ featured: e.target.checked })}
          />
          مقاله ویژه
        </label>
        <div className="col-span-full space-y-2">
          <label className="block text-sm">
            آدرس تصویر کاور
            <Input
              dir="ltr"
              value={form.cover ?? ''}
              onChange={e => set({ cover: e.target.value || null })}
            />
          </label>
          <label className="inline-block cursor-pointer rounded-lg border px-3 py-2 text-sm">
            انتخاب تصویر کاور
            <input
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              onChange={async e => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (!file.type.startsWith('image/')) {
                  setUploadError('فقط تصویر مجاز است');
                  return;
                }
                setProgress(0);
                setUploadError('');
                try {
                  const url = await blogApi.upload(file, setProgress);
                  set({ cover: url });
                } catch (err) {
                  setUploadError(
                    getApiErrorMessage(err, 'آپلود تصویر ناموفق بود'),
                  );
                } finally {
                  setProgress(null);
                  e.target.value = '';
                }
              }}
            />
          </label>
          {progress !== null && (
            <span className="ms-3 text-sm">{progress}٪</span>
          )}
          {uploadError && (
            <p role="alert" className="text-sm text-red-600">
              {uploadError}
            </p>
          )}
          {safeUrl(form.cover, true) && (
            <img
              src={publicImageUrl(form.cover)}
              alt="پیش‌نمایش کاور"
              className="max-h-40 rounded-lg object-contain"
            />
          )}
        </div>
      </section>
      <section className="space-y-3">
        <div>
          <h2 className="font-bold">محتوای مقاله</h2>
          <p className="text-xs leading-6 text-muted-foreground">
            برای درج سریع از /، برای ویرایش کد از HTML و برای فضای بیشتر از دکمه
            تمام‌صفحه استفاده کنید.
          </p>
        </div>
        <Editor value={form.content} onChange={content => set({ content })} />
      </section>
      <section className="grid gap-4 rounded-xl border bg-white p-5">
        <h2 className="font-bold">تنظیمات سئو</h2>
        <label className="text-sm">
          عنوان سئو (پیشنهادی: ۵۰ تا ۶۰ نویسه)
          <Input
            maxLength={200}
            value={form.metaTitle}
            onChange={e => set({ metaTitle: e.target.value })}
          />
          <span className="text-xs text-muted-foreground">
            {form.metaTitle.length} نویسه؛ در صورت خالی بودن، عنوان مقاله
            استفاده می‌شود.
          </span>
        </label>
        <label className="text-sm">
          توضیح سئو (پیشنهادی: ۱۲۰ تا ۱۶۰ نویسه)
          <Textarea
            maxLength={1000}
            value={form.metaDescription}
            onChange={e => set({ metaDescription: e.target.value })}
          />
          <span className="text-xs text-muted-foreground">
            {form.metaDescription.length} نویسه؛ در صورت خالی بودن، خلاصه مقاله
            استفاده می‌شود.
          </span>
        </label>
        <div className="flex gap-5">
          <label className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.indexable}
              onChange={e => set({ indexable: e.target.checked })}
            />
            Index
          </label>
          <label className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.follow}
              onChange={e => set({ follow: e.target.checked })}
            />
            Follow
          </label>
        </div>
      </section>
    </form>
  );
}
export default function AdminBlogForm({ id }: { id?: number }) {
  const query = useQuery({
    queryKey: ['admin-blog-detail', id],
    queryFn: () => blogApi.get(id!),
    enabled: !!id,
    refetchOnWindowFocus: false,
  });
  if (id && query.isLoading) return <p>در حال دریافت مقاله...</p>;
  if (id && (query.isError || !query.data))
    return (
      <p role="alert">
        مقاله دریافت نشد. <Link href="/admin/blog">بازگشت به فهرست</Link>
      </p>
    );
  if (query.data) {
    const {
      title,
      slug,
      excerpt,
      content,
      status,
      featured,
      cover,
      metaTitle,
      metaDescription,
      indexable,
      follow,
    } = query.data;
    return (
      <Form
        key={id}
        id={id}
        initial={{
          title,
          slug,
          excerpt,
          content,
          status,
          featured,
          cover,
          metaTitle,
          metaDescription,
          indexable,
          follow,
        }}
      />
    );
  }
  return <Form initial={emptyArticle} />;
}
