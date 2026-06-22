import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { QueryDto } from 'src/common/query';

import { BarberService } from './barber.service';
import { CreateBarberDto } from './dto/create-barber.dto';
import { UpdateBarberDto } from './dto/update-barber.dto';

@Controller('barber')
export class BarberController {
  constructor(private readonly barberService: BarberService) {}

  @Post()
  create(@Body() createBarberDto: CreateBarberDto) {
    return this.barberService.create(createBarberDto);
  }

  @Get()
  findAll(
    @Query() query: QueryDto,
    @Query('categoryIds') categoryIds?: string,
    @Query('colorIds') colorIds?: string,
    @Query('sizeIds') sizeIds?: string,
  ) {
    const filters = {
      categoryIds: categoryIds ? categoryIds.split(',').map(Number) : undefined,
      colorIds: colorIds ? colorIds.split(',').map(Number) : undefined,
      sizeIds: sizeIds ? sizeIds.split(',').map(Number) : undefined,
    };

    return this.barberService.findAll(query, filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.barberService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBarberDto: UpdateBarberDto) {
    return this.barberService.update(+id, updateBarberDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.barberService.remove(+id);
  }
}
