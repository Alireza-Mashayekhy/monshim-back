// src/barber/barber.controller.ts
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
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { QueryDto } from 'src/common/query';

import { BarberService } from './barber.service';
import { ReviewBarberDto } from './dto/review-barber.dto';
import { UpdateBarberDto } from './dto/update-barber.dto';

@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.Admin)
@Controller('admin/barber')
export class BarberAdminController {
  constructor(private readonly barberService: BarberService) {}

  @Get()
  findAll(@Query() query: QueryDto, @Query('cityId') cityId?: number) {
    return this.barberService.findAll(
      query,
      { cityId: cityId || undefined },
      true,
    );
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

  @Patch(':id/review')
  review(@Param('id') id: string, @Body() dto: ReviewBarberDto) {
    return this.barberService.reviewBarber(Number(id), dto);
  }
}
