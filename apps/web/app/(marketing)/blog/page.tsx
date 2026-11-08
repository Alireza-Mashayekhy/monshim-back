import Link from 'next/link';

import { getArticles } from '@/lib/blog/server';
import { publicImageUrl } from '@/lib/images';
import { buildPageMetadata } from '@/lib/seo';
export const dynamic = 'force-dynamic';
export const metadata = buildPageMetadata({
  title: 'بلاگ منشیم',
  description: 'مقاله‌ها و راهنماهای خدمات زیبایی و مدیریت سالن در بلاگ منشیم',
  path: '/blog',
});
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Math.min(10000, Number(params.page) || 1));
  const result = await getArticles(page);
  return (
    <div className="custom-container mx-auto max-w-6xl py-12" dir="rtl">
      <h1 className="text-3xl font-bold">بلاگ منشیم</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        راهنماها و مطالب کاربردی زیبایی و مدیریت سالن
      </p>
      {!result ? (
        <p className="mt-10">
          دریافت مقاله‌ها موقتاً ممکن نیست؛ لطفاً دوباره تلاش کنید.
        </p>
      ) : !result.data.length ? (
        <p className="mt-10">هنوز مقاله‌ای منتشر نشده است.</p>
      ) : (
        <>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {result.data.map(a => (
              <Link
                key={a.id}
                href={`/blog/${encodeURIComponent(a.slug)}`}
                className="overflow-hidden rounded-xl border bg-white transition hover:border-primary"
              >
                {a.cover && (
                  <img
                    src={publicImageUrl(a.cover)}
                    alt=""
                    className="h-44 w-full object-cover"
                    loading="lazy"
                  />
                )}
                <div className="p-5">
                  <div className="text-xs text-primary">
                    {a.featured ? 'مقاله ویژه' : 'مقاله'}
                  </div>
                  <h2 className="mt-2 font-bold leading-7">{a.title}</h2>
                  <p className="mt-2 line-clamp-3 text-sm leading-7 text-muted-foreground">
                    {a.excerpt}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-8 flex gap-4 text-sm">
            {page > 1 && <Link href={`/blog?page=${page - 1}`}>صفحه قبل</Link>}
            {page < result.pagination.totalPages && (
              <Link href={`/blog?page=${page + 1}`}>صفحه بعد</Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}
