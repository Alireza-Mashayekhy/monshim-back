import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { ROLES_KEY } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { Repository } from 'typeorm';
import { BlogAdminController } from './blog.controller';
import { sanitizeContent, safeUrl } from './blog-content';
import { BlogService } from './blog.service';
import { BlogArticle } from './blog.entity';
import { BlogMediaService } from './blog-media.service';

const doc = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 2, dir: 'rtl', textAlign: 'right' },
      content: [{ type: 'text', text: 'درود', marks: [{ type: 'bold' }] }],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'منشیم',
          marks: [
            { type: 'link', attrs: { href: '/blog/test', target: '_blank' } },
          ],
        },
      ],
    },
    {
      type: 'faq',
      attrs: {
        title: 'پرسش',
        items: [{ question: 'چطور؟', answer: 'به این شکل' }],
      },
    },
    {
      type: 'barberSlider',
      attrs: { ids: [2, 2, -1, 3], autoplay: true, title: 'آرایشگرها' },
    },
    {
      type: 'media',
      attrs: {
        kind: 'video',
        src: '/uploads/blog/test.mp4',
        poster: '/uploads/blog/poster.webp',
        autoplay: true,
        muted: true,
      },
    },
    { type: 'paragraph' },
  ],
};

describe('blog security and persistence contract', () => {
  it('requires admin authorization for all write/list operations', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, BlogAdminController);
    expect(guards).toEqual(expect.arrayContaining([AuthGuard, RolesGuard]));
    expect(Reflect.getMetadata(ROLES_KEY, BlogAdminController)).toEqual([
      Role.Admin,
    ]);
  });
  it('preserves supported ordered blocks and rejects unsafe URLs', () => {
    const clean = sanitizeContent(doc) as { content: Array<any> };
    expect(clean.content.map(x => x.type)).toEqual([
      'heading',
      'paragraph',
      'faq',
      'barberSlider',
      'media',
      'paragraph',
    ]);
    expect(clean.content[3].attrs.ids).toEqual([2, 3]);
    expect(clean.content[4].attrs.poster).toBe('/uploads/blog/poster.webp');
    expect(clean.content[1].content[0].marks[0].attrs.rel).toBe(
      'noopener noreferrer',
    );
    expect(safeUrl('javascript:alert(1)')).toBe('');
    expect(safeUrl('//evil.test/a')).toBe('');
    expect(safeUrl('http://example.com')).toBe('');
    expect(safeUrl('mailto:hello@example.com')).toBe(
      'mailto:hello@example.com',
    );
    expect(() =>
      sanitizeContent({
        type: 'doc',
        content: [{ type: 'script', attrs: { onload: 'alert(1)' } }],
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      sanitizeContent({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'X',
                marks: [
                  { type: 'link', attrs: { href: 'javascript:alert(1)' } },
                ],
              },
            ],
          },
        ],
      }),
    ).toThrow(BadRequestException);
  });
  it('strips arbitrary style and node attributes and rejects invalid nesting', () => {
    const clean = sanitizeContent({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { onclick: 'x', dir: 'rtl', textAlign: 'right' },
          content: [
            {
              type: 'text',
              text: 'text',
              marks: [
                {
                  type: 'textStyle',
                  attrs: { color: 'red;display:none', fontSize: '999px' },
                },
              ],
            },
          ],
        },
      ],
    }) as { content: any[] };
    expect(clean.content[0].attrs).toEqual({ dir: 'rtl', textAlign: 'right' });
    expect(clean.content[0].content[0].marks[0].attrs).toEqual({
      color: null,
      fontSize: null,
    });
    expect(() =>
      sanitizeContent({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'table' }] }],
      }),
    ).toThrow(BadRequestException);
  });
  it('keeps drafts private and saves sanitized values', async () => {
    const repo = {
      create: jest.fn(() => ({})),
      save: jest.fn(async x => x),
      findOneBy: jest.fn().mockResolvedValue(null),
    };
    const service = new BlogService(repo as unknown as Repository<BlogArticle>);
    await expect(service.bySlug('draft')).rejects.toThrow(NotFoundException);
    expect(repo.findOneBy).toHaveBeenCalledWith({
      slug: 'draft',
      status: 'published',
    });
    const result = await service.save({
      title: ' تست ',
      slug: 'سلام-دنیا',
      excerpt: '',
      content: doc,
      status: 'published',
      featured: false,
      cover: null,
      metaTitle: '',
      metaDescription: '',
      indexable: true,
      follow: true,
    });
    expect(result.title).toBe('تست');
    expect(result.publishedAt).toBeInstanceOf(Date);
    expect((result.content.content as any[])[3].attrs.ids).toEqual([2, 3]);
    await expect(
      service.save({
        title: 'x',
        slug: '../x',
        excerpt: '',
        content: doc,
        status: 'draft',
        featured: false,
        cover: null,
        metaTitle: '',
        metaDescription: '',
        indexable: true,
        follow: true,
      }),
    ).rejects.toThrow(BadRequestException);
    repo.save.mockRejectedValueOnce({ driverError: { code: 'ER_DUP_ENTRY' } });
    await expect(
      service.save({
        title: 'x',
        slug: 'valid',
        excerpt: '',
        content: doc,
        status: 'draft',
        featured: false,
        cover: null,
        metaTitle: '',
        metaDescription: '',
        indexable: true,
        follow: true,
      }),
    ).rejects.toThrow(ConflictException);
  });
  it('rejects spoofed, oversized and unsupported uploads', async () => {
    const service = new BlogMediaService();
    await expect(
      service.save({
        originalname: 'evil.jpg',
        buffer: Buffer.from('<script>alert(1)</script>'),
        size: 25,
      } as Express.Multer.File),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.save({
        originalname: 'evil.mp4',
        buffer: Buffer.from('<html>'),
        size: 6,
      } as Express.Multer.File),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.save({
        originalname: 'image.png',
        buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
      } as Express.Multer.File),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.save({
        originalname: '../evil.svg',
        buffer: Buffer.from('<svg>'),
      } as Express.Multer.File),
    ).rejects.toThrow(BadRequestException);
  });
});
