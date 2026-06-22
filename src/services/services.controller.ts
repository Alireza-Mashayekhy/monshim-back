import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServicesService } from './services.service';

@Controller('services')
@UseGuards(AuthGuard, RolesGuard)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  // ایجاد سرویس جدید (فقط آرایشگر)
  @Post()
  @Roles(Role.Barber)
  create(@Body() createServiceDto: CreateServiceDto, @Req() req) {
    // req.user شامل اطلاعات کاربر فعلی است (آرایشگر)
    createServiceDto.barberId = req.user.id;
    return this.servicesService.create(createServiceDto);
  }

  // دریافت لیست سرویس‌های آرایشگر جاری
  @Get('my-services')
  @Roles(Role.Barber)
  findMyServices(@Req() req) {
    return this.servicesService.findByBarberId(req.user.id);
  }

  // دریافت یک سرویس (همه کاربران)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.servicesService.findOne(id);
  }

  // ویرایش سرویس (فقط مالک)
  @Patch(':id')
  @Roles(Role.Barber)
  update(
    @Param('id') id: string,
    @Body() updateServiceDto: UpdateServiceDto,
    @Req() req,
  ) {
    return this.servicesService.update(id, updateServiceDto, req.user);
  }

  // حذف سرویس (فقط مالک)
  @Delete(':id')
  @Roles(Role.Barber)
  remove(@Param('id') id: string, @Req() req) {
    return this.servicesService.remove(id, req.user);
  }
}
