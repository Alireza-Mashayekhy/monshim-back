import type { BlogArticle, BlogInput } from '@/lib/blog/types';
import { api } from '@/services/api/client';
import type { ApiListResponse, ApiSingleResponse } from '@/services/api/types';

export const blogApi = {
  list: async (page = 1, search = '') =>
    (
      await api.get<ApiListResponse<BlogArticle>>('/admin/blog', {
        params: { page, search },
      })
    ).data,
  get: async (id: number) =>
    (await api.get<ApiSingleResponse<BlogArticle>>(`/admin/blog/${id}`)).data
      .data,
  create: async (value: BlogInput) =>
    (await api.post<ApiSingleResponse<BlogArticle>>('/admin/blog', value)).data
      .data,
  update: async (id: number, value: BlogInput) =>
    (await api.put<ApiSingleResponse<BlogArticle>>(`/admin/blog/${id}`, value))
      .data.data,
  remove: async (id: number) => api.delete(`/admin/blog/${id}`),
  upload: async (file: File, onProgress: (percent: number) => void) => {
    const images = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/avif',
    ];
    const videos = ['video/mp4', 'video/webm', 'video/ogg', 'video/x-m4v'];
    if (![...images, ...videos].includes(file.type))
      throw new Error('فرمت فایل مجاز نیست');
    const imageLimit = Number(process.env.NEXT_PUBLIC_BLOG_IMAGE_MAX_MB) || 5;
    const videoLimit = Number(process.env.NEXT_PUBLIC_BLOG_VIDEO_MAX_MB) || 50;
    if (
      file.size >
      (images.includes(file.type) ? imageLimit : videoLimit) * 1024 * 1024
    )
      throw new Error('حجم فایل بیش از حد مجاز است');
    const form = new FormData();
    form.append('file', file);
    const result = await api.post<ApiSingleResponse<{ url: string }>>(
      '/admin/blog/media',
      form,
      {
        onUploadProgress: e => {
          if (e.total) onProgress(Math.round((e.loaded / e.total) * 100));
        },
      },
    );
    return result.data.data.url;
  },
};
