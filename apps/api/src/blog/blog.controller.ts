import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { PublicPageService } from 'src/public-page/public-page.service';

import { BlogDto } from './blog.dto';
import { BlogService } from './blog.service';
import {
  BLOG_IMAGE_LIMIT,
  BLOG_VIDEO_LIMIT,
  BlogMediaService,
} from './blog-media.service';

@Controller('blog')
export class BlogPublicController {
  constructor(
    private readonly blog: BlogService,
    private readonly pages: PublicPageService,
  ) {}
  @Get() list(@Query('page') page?: string) {
    return this.blog.list(false, Number(page));
  }
  @Get('sitemap') sitemap() {
    return this.blog.sitemap();
  }
  @Get('barbers/:id') async barber(@Param('id') id: string) {
    const p = await this.pages.getPublicBarberPage(id);
    return {
      id: p.id,
      slug: p.slug,
      salonName: p.salonName,
      profileImage: p.profileImage,
      city: p.city,
      rating: p.rating,
    };
  }
  @Get(':slug') get(@Param('slug') slug: string) {
    return this.blog.bySlug(slug);
  }
}

@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.Admin)
@Controller('admin/blog')
export class BlogAdminController {
  constructor(
    private readonly blog: BlogService,
    private readonly media: BlogMediaService,
  ) {}
  @Get() list(@Query('page') page?: string, @Query('search') search?: string) {
    return this.blog.list(true, Number(page), search);
  }
  @Post('media')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: Math.max(BLOG_IMAGE_LIMIT, BLOG_VIDEO_LIMIT),
        files: 1,
      },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('فایل ارسال نشده است');
    return this.media.save(file);
  }
  @Get(':id') get(@Param('id', ParseIntPipe) id: number) {
    return this.blog.byId(id);
  }
  @Post() create(@Body() dto: BlogDto) {
    return this.blog.save(dto);
  }
  @Put(':id') update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: BlogDto,
  ) {
    return this.blog.save(dto, id);
  }
  @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) {
    return this.blog.remove(id);
  }
}
