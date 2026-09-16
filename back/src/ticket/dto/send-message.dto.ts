// src/ticket/dto/send-message.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({
    description: 'متن پیام جدید در گفتگو',
    example: 'ممنون، مشکل من حل شد.',
  })
  @IsString()
  @IsNotEmpty({ message: 'متن پیام الزامی است' })
  @MaxLength(5000, { message: 'متن پیام نمی‌تواند بیشتر از ۵۰۰۰ کاراکتر باشد' })
  message: string;
}
