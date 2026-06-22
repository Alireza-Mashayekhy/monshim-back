import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { CreateUserDto } from 'src/users/dto/create-user.dto';

import { AuthService } from './auth.service';
import { RegisterBarberDto } from './dto/register-barber.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { SendVerifyOtp } from './dto/verify-otp.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/send-otp')
  sendOtp(@Body() sendOtpDto: SendOtpDto) {
    return this.authService.sendCode(sendOtpDto);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() request: Request & { user: any }) {
    return {
      data: request.user,
    };
  }

  @Post('/login')
  login(
    @Body() sendVerifyOtp: SendVerifyOtp,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.login(sendVerifyOtp, response);
  }

  @Post('/sign-up')
  signUp(
    @Body() createUserDto: CreateUserDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.signUp(createUserDto, response);
  }

  @Post('/refresh')
  refresh(
    @Req() request: Request,
    @Res({ passthrough: true })
    response: Response,
  ) {
    return this.authService.refresh(request.cookies.refresh_token, response);
  }

  @Post('register-barber')
  registerBarber(
    @Body() dto: RegisterBarberDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.registerBarber(dto, response);
  }

  @Post('/logout')
  logout(
    @Res({ passthrough: true })
    response: Response,
  ) {
    return this.authService.logout(response);
  }
}
