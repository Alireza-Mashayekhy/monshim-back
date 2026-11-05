import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicPageModule } from 'src/public-page/public-page.module';
import { BlogAdminController, BlogPublicController } from './blog.controller';
import { BlogArticle } from './blog.entity';
import { BlogMediaService } from './blog-media.service';
import { BlogService } from './blog.service';

@Module({
  imports: [TypeOrmModule.forFeature([BlogArticle]), PublicPageModule],
  controllers: [BlogAdminController, BlogPublicController],
  providers: [BlogService, BlogMediaService],
})
export class BlogModule {}
