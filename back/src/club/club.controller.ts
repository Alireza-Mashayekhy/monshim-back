import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

import { ClubService } from './club.service';
import { ClubCustomerQueryDto } from './dto/club-customer-query.dto';
import { CreateClubCustomerDto } from './dto/create-club-customer.dto';
import { CreateCustomerGroupDto } from './dto/create-customer-group.dto';
import { UpdateClubCustomerDto } from './dto/update-club-customer.dto';

@Controller('club')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.Barber, Role.Admin)
export class ClubController {
  constructor(private readonly clubService: ClubService) {}

  @Get('groups')
  listGroups(@Req() req: any) {
    return this.clubService.listGroups(req.user.id);
  }

  @Post('groups')
  createGroup(@Req() req: any, @Body() dto: CreateCustomerGroupDto) {
    return this.clubService.createGroup(req.user.id, dto);
  }

  @Delete('groups/:id')
  deleteGroup(@Req() req: any, @Param('id') id: string) {
    return this.clubService.deleteGroup(req.user.id, id);
  }

  @Get('customers')
  listCustomers(@Req() req: any, @Query() query: ClubCustomerQueryDto) {
    return this.clubService.listCustomers(req.user.id, query);
  }

  @Post('customers')
  addCustomer(@Req() req: any, @Body() dto: CreateClubCustomerDto) {
    return this.clubService.addCustomer(req.user.id, dto);
  }

  @Patch('customers/:id')
  updateCustomer(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateClubCustomerDto,
  ) {
    return this.clubService.updateCustomer(req.user.id, id, dto);
  }

  @Delete('customers/:id')
  removeCustomer(@Req() req: any, @Param('id') id: string) {
    return this.clubService.removeCustomer(req.user.id, id);
  }
}
