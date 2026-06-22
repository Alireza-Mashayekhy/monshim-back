import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { FilesService } from 'src/files/files.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';

import { AuthService } from './auth.service';
import { RegisterBarberDto } from './dto/register-barber.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { SendVerifyOtp } from './dto/verify-otp.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly filesService: FilesService,
  ) {}

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
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'profileImage', maxCount: 1 },
      { name: 'portfolio', maxCount: 10 },
    ]),
  )
  async registerBarber(
    @UploadedFiles()
    files: {
      profileImage?: Express.Multer.File[];
      portfolio?: Express.Multer.File[];
    },
    @Body('data') data: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    let dto: RegisterBarberDto;
    try {
      dto = JSON.parse(data);
    } catch (error) {
      console.log(error);
      throw new BadRequestException('Invalid JSON data');
    }

    // ذخیره عکس پروفایل (اگر ارسال شده باشد)
    if (files.profileImage && files.profileImage.length > 0) {
      const profilePath = this.filesService.saveFile(
        files.profileImage[0],
        'profiles',
      );
      dto.profileImage = profilePath;
    }

    // ذخیره نمونه کارها (در صورت ارسال)
    if (files.portfolio && files.portfolio.length > 0) {
      const portfolioPaths = this.filesService.saveMultipleFiles(
        files.portfolio,
        'portfolio',
      );
      dto.portfolioImages = portfolioPaths;
    }

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
