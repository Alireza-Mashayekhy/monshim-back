import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(6, { message: 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد' })
  newPassword: string;

  @IsString()
  @IsNotEmpty({ message: 'کد تأیید الزامی است' })
  code: string;
}

export class RequestChangePasswordOtpDto {
  // بدون body؛ شماره از توکن کاربر خوانده می‌شود
  // کلاس خالی برای مستندسازی swagger
}
