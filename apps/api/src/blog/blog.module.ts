import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicPageModule } from 'src/public-page/public-page.module';

import { BlogAdminController, BlogPublicController } from './blog.controller';
import { BlogArticle } from './blog.entity';
import { BlogService } from './blog.service';
import { BlogMediaService } from './blog-media.service';
import { BlogSchemaService } from './blog-schema.service';

@Module({
  imports: [TypeOrmModule.forFeature([BlogArticle]), PublicPageModule],
  controllers: [BlogAdminController, BlogPublicController],
  providers: [BlogService, BlogMediaService, BlogSchemaService],
})
export class BlogModule {}
