import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

import { CreatePublicPageDiscountDto } from './dto/create-public-page-discount.dto';
import { UpdatePublicPageDiscountDto } from './dto/update-public-page-discount.dto';
import { PublicPageService } from './public-page.service';

@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.Admin)
@Controller('admin/public-page/discounts')
export class PublicPageDiscountAdminController {
  constructor(private readonly publicPageService: PublicPageService) {}

  @Get()
  list() {
    return this.publicPageService.listDiscountCodes();
  }

  @Post()
  create(@Body() dto: CreatePublicPageDiscountDto) {
    return this.publicPageService.createDiscountCode(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePublicPageDiscountDto) {
    return this.publicPageService.updateDiscountCode(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.publicPageService.deleteDiscountCode(id);
  }
}
