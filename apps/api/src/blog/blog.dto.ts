import {
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class BlogDto {
  @IsString() @MinLength(1) @MaxLength(200) title: string;
  @IsString() @MinLength(1) @MaxLength(180) slug: string;
  @IsString() @MaxLength(2000) excerpt: string;
  @IsObject() content: Record<string, unknown>;
  @IsIn(['draft', 'published']) status: 'draft' | 'published';
  @IsBoolean() featured: boolean;
  @IsOptional() @IsString() @MaxLength(2048) cover: string | null;
  @IsString() @MaxLength(200) metaTitle: string;
  @IsString() @MaxLength(1000) metaDescription: string;
  @IsBoolean() indexable: boolean;
  @IsBoolean() follow: boolean;
}
