import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdatePublicPageSlugDto {
  @ApiProperty({
    example: 'aria-vip-salon',
    description: 'اسلاگ یکتای صفحهٔ اختصاصی آرایشگاه',
  })
  @IsString({ message: 'اسلاگ معتبر نیست' })
  @IsNotEmpty({ message: 'وارد کردن اسلاگ الزامی است' })
  @MaxLength(80, { message: 'اسلاگ نمی‌تواند بیشتر از ۶۰ کاراکتر باشد' })
  slug: string;
}
