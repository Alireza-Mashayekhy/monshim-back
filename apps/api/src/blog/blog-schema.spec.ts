import { Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DataSource, Table } from 'typeorm';
import { ConnectionMetadataBuilder } from 'typeorm/connection/ConnectionMetadataBuilder';

import { BlogArticle } from './blog.entity';
import { BlogSchemaService, CREATE_BLOG_TABLE } from './blog-schema.service';

describe('blog production schema', () => {
  let metadata: Awaited<
    ReturnType<ConnectionMetadataBuilder['buildEntityMetadatas']>
  >[number];
  beforeAll(async () => {
    const source = new DataSource({ type: 'mysql', entities: [BlogArticle] });
    [metadata] = await new ConnectionMetadataBuilder(
      source,
    ).buildEntityMetadatas([BlogArticle]);
  });

  function setup(tables: (Table | undefined)[], error?: Error) {
    const runner = {
      connect: jest.fn().mockResolvedValue(undefined),
      getTable: jest.fn().mockImplementation(async () => tables.shift()),
      query: error
        ? jest.fn().mockRejectedValue(error)
        : jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
    };
    const source = {
      options: { type: 'mysql' },
      createQueryRunner: () => runner,
      getMetadata: () => metadata,
    } as unknown as DataSource;
    return { runner, service: new BlogSchemaService(source) };
  }

  it('matches the documented SQL and includes all entity columns', () => {
    const sql = readFileSync(join(process.cwd(), 'sql/blog.sql'), 'utf8')
      .replace(/^--.*\n/, '')
      .trim()
      .replace(/;$/, '');
    expect(CREATE_BLOG_TABLE).toBe(sql);
    for (const column of metadata.columns)
      expect(sql).toContain(`\`${column.databaseName}\``);
    expect(sql).toContain('UNIQUE KEY `UQ_blog_slug`');
    expect(sql).toContain('CHARSET=utf8mb4');
  });

  it('creates a missing table and leaves an existing one unchanged', async () => {
    const table = new Table({
      name: 'blog_articles',
      columns: metadata.columns.map(c => ({
        name: c.databaseName,
        type: 'varchar',
      })),
    });
    const created = setup([undefined, table]);
    await created.service.onApplicationBootstrap();
    expect(created.runner.query).toHaveBeenCalledWith(CREATE_BLOG_TABLE);
    expect(created.runner.release).toHaveBeenCalled();
    const existing = setup([table]);
    await existing.service.onApplicationBootstrap();
    expect(existing.runner.query).not.toHaveBeenCalled();
  });

  it('reports missing columns without modifying an existing table', async () => {
    const incomplete = new Table({
      name: 'blog_articles',
      columns: [{ name: 'id', type: 'int' }],
    });
    const existing = setup([incomplete]);
    const log = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    try {
      await existing.service.onApplicationBootstrap();
      expect(existing.runner.query).not.toHaveBeenCalled();
      expect(log).toHaveBeenCalledWith(expect.stringContaining('title'));
    } finally {
      log.mockRestore();
    }
  });

  it('logs failures without preventing the application from starting', async () => {
    const failed = setup([undefined], new Error('CREATE denied'));
    await expect(
      failed.service.onApplicationBootstrap(),
    ).resolves.toBeUndefined();
    expect(failed.runner.release).toHaveBeenCalled();
  });
});
