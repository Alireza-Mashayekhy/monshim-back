import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { QueryDto } from 'src/common/query';

import { BarberService } from './barber.service';
import { UpdateBarberDto } from './dto/update-barber.dto';

@Controller('barber')
@UseGuards(AuthGuard)
export class BarberController {
  constructor(private readonly barberService: BarberService) {}

  // @Post()
  // create(@Body() createBarberDto: CreateBarberDto) {
  //   return this.barberService.create(createBarberDto);
  // }

  @Get()
  findAll(@Query() query: QueryDto, @Query('cityId') cityId?: number) {
    const filters = {
      cityId: cityId || undefined,
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
