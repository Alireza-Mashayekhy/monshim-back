import { notFound } from 'next/navigation';

import AdminBlogForm from '@/components/blog/admin-blog-form';
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || Number(id) < 1) notFound();
  return <AdminBlogForm id={Number(id)} />;
}
