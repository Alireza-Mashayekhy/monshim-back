import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ResponseInterceptor } from 'src/common/interceptors/response.interceptor';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { PublicPageService } from 'src/public-page/public-page.service';
import request from 'supertest';
import sharp from 'sharp';
import { promises as fs } from 'fs';
import * as path from 'path';
import { BlogAdminController, BlogPublicController } from './blog.controller';
import { BlogArticle } from './blog.entity';
import { BlogService } from './blog.service';
import { BlogMediaService } from './blog-media.service';

class TestAuth implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    if (!req.headers['x-test-role']) return false;
    req.user = { id: 1, roles: [req.headers['x-test-role']] };
    return true;
  }
}

describe('blog HTTP contract', () => {
  let app: INestApplication;
  let rows: BlogArticle[] = [];
  const repo = {
    create: () => ({}),
    createQueryBuilder: () => {
      let status: string | undefined;
      let search = '';
      let skip = 0;
      let take = 12;
      const qb = {
        select: () => qb,
        where: (_sql: string, params: { status: string }) => {
          status = params.status;
          return qb;
        },
        andWhere: (_sql: string, params: { search: string }) => {
          search = params.search.slice(1, -1);
          return qb;
        },
        orderBy: () => qb,
        skip: (n: number) => {
          skip = n;
          return qb;
        },
        take: (n: number) => {
          take = n;
          return qb;
        },
        getManyAndCount: async () => {
          const matches = rows.filter(
            row =>
              (!status || row.status === status) && row.title.includes(search),
          );
          return [matches.slice(skip, skip + take), matches.length];
        },
      };
      return qb;
    },
    save: async (item: BlogArticle) => {
      if (!item.id) item.id = rows.length + 1;
      rows = [...rows.filter(row => row.id !== item.id), structuredClone(item)];
      return item;
    },
    findOneBy: async (where: Partial<BlogArticle>) =>
      rows.find(row => Object.entries(where).every(([k, v]) => row[k] === v)) ||
      null,
    remove: async (item: BlogArticle) => {
      rows = rows.filter(row => row.id !== item.id);
    },
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [BlogAdminController, BlogPublicController],
      providers: [
        BlogService,
        BlogMediaService,
        { provide: getRepositoryToken(BlogArticle), useValue: repo },
        { provide: PublicPageService, useValue: {} },
      ],
    })
      .overrideGuard(AuthGuard)
      .useClass(TestAuth)
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });
  afterAll(async () => app.close());
  it('blocks guests and non-admin users, saves and republishes in order, then deletes', async () => {
    const payload = {
      title: 'مقاله تست',
      slug: 'test-blog',
      excerpt: 'خلاصه',
      status: 'draft',
      featured: false,
      cover: null,
      metaTitle: '',
      metaDescription: '',
      indexable: true,
      follow: true,
      content: {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'اول' }] },
          {
            type: 'faq',
            attrs: { items: [{ question: 'سوال', answer: 'پاسخ' }] },
          },
          { type: 'paragraph', content: [{ type: 'text', text: 'آخر' }] },
        ],
      },
    };
    await request(app.getHttpServer())
      .post('/api/admin/blog')
      .send(payload)
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/admin/blog')
      .set('x-test-role', 'user')
      .send(payload)
      .expect(403);
    const saved = await request(app.getHttpServer())
      .post('/api/admin/blog')
      .set('x-test-role', 'admin')
      .send(payload)
      .expect(201);
    expect(saved.body.data.content.content.map(x => x.type)).toEqual([
      'paragraph',
      'faq',
      'paragraph',
    ]);
    const adminList = await request(app.getHttpServer())
      .get('/api/admin/blog?search=تست')
      .set('x-test-role', 'admin')
      .expect(200);
    expect(adminList.body.pagination.total).toBe(1);
    expect(adminList.body.data[0].slug).toBe('test-blog');
    const publicDrafts = await request(app.getHttpServer())
      .get('/api/blog')
      .expect(200);
    expect(publicDrafts.body.data).toEqual([]);
    await request(app.getHttpServer()).get('/api/blog/test-blog').expect(404);
    await request(app.getHttpServer())
      .put('/api/admin/blog/1')
      .set('x-test-role', 'admin')
      .send({ ...payload, status: 'published' })
      .expect(200);
    const publicList = await request(app.getHttpServer())
      .get('/api/blog')
      .expect(200);
    expect(publicList.body.data[0].slug).toBe('test-blog');
    const published = await request(app.getHttpServer())
      .get('/api/blog/test-blog')
      .expect(200);
    expect(published.body.data.content.content[1].attrs.items[0].answer).toBe(
      'پاسخ',
    );
    await request(app.getHttpServer())
      .delete('/api/admin/blog/1')
      .set('x-test-role', 'admin')
      .expect(200);
    await request(app.getHttpServer()).get('/api/blog/test-blog').expect(404);
  });
  it('allows only administrators to upload validated image bytes', async () => {
    const png = await sharp({
      create: { width: 4, height: 4, channels: 4, background: '#0b7285' },
    })
      .png()
      .toBuffer();
    await request(app.getHttpServer())
      .post('/api/admin/blog/media')
      .set('x-test-role', 'user')
      .attach('file', png, 'test.png')
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/admin/blog/media')
      .set('x-test-role', 'admin')
      .attach('file', Buffer.from('<script>'), 'fake.png')
      .expect(400);
    const response = await request(app.getHttpServer())
      .post('/api/admin/blog/media')
      .set('x-test-role', 'admin')
      .attach('file', png, 'test.png')
      .expect(201);
    const url: string = response.body.data.url;
    expect(url).toMatch(/^\/uploads\/blog\/[a-f0-9-]+\.webp$/);
    const filename = path.join(process.cwd(), url.replace(/^\//, ''));
    try {
      expect((await sharp(filename).metadata()).format).toBe('webp');
    } finally {
      await fs.unlink(filename);
    }
  });
});
