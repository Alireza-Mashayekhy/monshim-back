import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { BlogArticle } from './blog.entity';

// Keep this in sync with back/sql/blog.sql. CREATE IF NOT EXISTS is safe when
// multiple instances start together, and explicitly supports Persian text.
export const CREATE_BLOG_TABLE = `CREATE TABLE IF NOT EXISTS \`blog_articles\` (
  \`id\` int NOT NULL AUTO_INCREMENT,
  \`title\` varchar(200) NOT NULL,
  \`slug\` varchar(180) NOT NULL,
  \`excerpt\` text NOT NULL,
  \`content\` json NOT NULL,
  \`status\` varchar(16) NOT NULL DEFAULT 'draft',
  \`featured\` tinyint NOT NULL DEFAULT 0,
  \`cover\` varchar(2048) DEFAULT NULL,
  \`metaTitle\` varchar(200) NOT NULL DEFAULT '',
  \`metaDescription\` text NOT NULL,
  \`indexable\` tinyint NOT NULL DEFAULT 1,
  \`follow\` tinyint NOT NULL DEFAULT 1,
  \`publishedAt\` datetime DEFAULT NULL,
  \`createdAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`), UNIQUE KEY \`UQ_blog_slug\` (\`slug\`), KEY \`IDX_blog_status_created\` (\`status\`, \`createdAt\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

@Injectable()
export class BlogSchemaService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BlogSchemaService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.dataSource.options.type !== 'mysql') return;
    const runner = this.dataSource.createQueryRunner();
    try {
      await runner.connect();
      let table = await runner.getTable('blog_articles');
      if (!table) {
        await runner.query(CREATE_BLOG_TABLE);
        this.logger.log(
          'Blog table created or already created by another instance.',
        );
        table = await runner.getTable('blog_articles');
      }
      // Do not silently alter an existing table or populate missing NOT NULL
      // columns: that requires a reviewed migration and a backup.
      const columns = new Set(table?.columns.map(column => column.name));
      const missing = this.dataSource
        .getMetadata(BlogArticle)
        .columns.map(column => column.databaseName)
        .filter(name => !columns.has(name));
      if (missing.length) {
        this.logger.error(
          `Blog table is missing columns: ${missing.join(', ')}. Apply a reviewed migration; back/sql/blog.sql does not modify existing tables.`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Blog schema check failed; verify database permissions and apply back/sql/blog.sql if needed: ${String(error)}`,
      );
    } finally {
      try {
        await runner.release();
      } catch (error) {
        this.logger.error(
          `Could not release blog schema connection: ${String(error)}`,
        );
      }
    }
  }
}
