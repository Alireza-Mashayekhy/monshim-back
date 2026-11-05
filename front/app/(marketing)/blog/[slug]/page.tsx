import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ArticleContent } from '@/components/blog/article-content';
import { getArticle } from '@/lib/blog/server';
import { publicImageUrl } from '@/lib/images';
import { buildPageMetadata } from '@/lib/seo';
export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return { title: 'مقاله یافت نشد', robots: { index: false } };
  return {
    ...buildPageMetadata({
      title: article.metaTitle || article.title,
      description: article.metaDescription || article.excerpt,
      path: `/blog/${encodeURIComponent(article.slug)}`,
      imageUrl: publicImageUrl(article.cover),
      type: 'article',
      noIndex: !article.indexable,
    }),
    robots: { index: article.indexable, follow: article.follow },
  };
}
export default async function Page({ params }: Props) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();
  return (
    <article dir="rtl" className="custom-container mx-auto max-w-4xl py-10">
      <Link href="/blog" className="text-sm text-primary">
        ← بازگشت به بلاگ
      </Link>
      <h1 className="mt-6 text-3xl font-bold leading-relaxed">
        {article.title}
      </h1>
      {article.excerpt && (
        <p className="mt-4 leading-8 text-muted-foreground">
          {article.excerpt}
        </p>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        {new Date(article.publishedAt || article.createdAt).toLocaleDateString(
          'fa-IR',
        )}
      </p>
      {article.cover && (
        <img
          src={publicImageUrl(article.cover)}
          alt=""
          className="mt-8 max-h-[440px] w-full rounded-xl object-cover"
        />
      )}
      <div className="mt-8">
        <ArticleContent doc={article.content} />
      </div>
    </article>
  );
}
