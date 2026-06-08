import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class VariantDto {
  @ApiProperty()
  @IsString()
  color: string;

  @ApiProperty()
  @IsString()
  size: string;

  @ApiProperty()
  @IsNumber()
  price: number;

  @ApiProperty()
  @IsNumber()
  stock: number;
}

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  productCode: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsString()
  careInstructionsHtml: string;

  @ApiProperty()
  variants: VariantDto[];

  @ApiProperty()
  suggestedProductIds: number[];

  @ApiProperty()
  categoryIds?: number[];
}
