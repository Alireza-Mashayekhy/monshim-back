import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

import { MAX_PUBLIC_PAGE_SLUG_LENGTH } from '../slug.util';

export class UpdatePublicPageSlugDto {
  @ApiProperty({
    example: 'aria-vip-salon',
    description:
      'اسلاگ یکتای صفحهٔ اختصاصی آرایشگاه؛ فقط یک بار قابل ثبت است و پس از ثبت قابل تغییر نیست',
  })
  @IsString({ message: 'اسلاگ معتبر نیست' })
  @IsNotEmpty({ message: 'وارد کردن اسلاگ الزامی است' })
  @MaxLength(MAX_PUBLIC_PAGE_SLUG_LENGTH, {
    message: `اسلاگ نمی‌تواند بیشتر از ${MAX_PUBLIC_PAGE_SLUG_LENGTH} کاراکتر باشد`,
  })
  slug: string;
}
