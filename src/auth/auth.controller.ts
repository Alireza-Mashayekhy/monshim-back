import {
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
import { memoryStorage } from 'multer';
import { IMAGE_MAX_SIZE_BYTES } from 'src/common/constants/constants';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { ParseJsonPipe } from 'src/common/pipes/parse-json.pipe';
import { extractRefreshToken } from 'src/common/utils/auth-cookie.util';
import { FilesService } from 'src/files/files.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';

import { AuthService } from './auth.service';
import { RegisterBarberDto } from './dto/register-barber.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { SendVerifyOtp } from './dto/verify-otp.dto';

interface RegisterBarberFiles {
  profileImage?: Express.Multer.File[];
  portfolio?: Express.Multer.File[];
}

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
  async me(@Req() request: Request & { user: { id: number } }) {
    const user = await this.authService.getProfile(request.user.id);
    return {
      data: user,
    };
  }

  @Post('/verify-otp')
  verifyOtp(@Body() sendVerifyOtp: SendVerifyOtp) {
    return this.authService.verifyCode(sendVerifyOtp);
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
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.refresh(extractRefreshToken(request), response);
  }

  @Post('register-barber')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'profileImage', maxCount: 1 },
        { name: 'portfolio', maxCount: 10 },
      ],
      {
        storage: memoryStorage(),
        limits: { fileSize: IMAGE_MAX_SIZE_BYTES, files: 11 },
      },
    ),
  )
  async registerBarber(
    @UploadedFiles() files: RegisterBarberFiles | undefined,
    @Body('data', new ParseJsonPipe(RegisterBarberDto)) rawDto: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const dto = rawDto as RegisterBarberDto;
    const savedFiles: string[] = [];
    try {
      delete dto.profileImage;
      delete dto.portfolioImages;

      if (files?.profileImage?.length) {
        dto.profileImage = await this.filesService.saveFile(
          files.profileImage[0],
          'profiles',
        );
        savedFiles.push(dto.profileImage);
      }

      if (files?.portfolio?.length) {
        dto.portfolioImages = await this.filesService.saveMultipleFiles(
          files.portfolio,
          'portfolio',
        );
        savedFiles.push(...dto.portfolioImages);
      }
      return await this.authService.registerBarber(dto, response);
    } catch (error) {
      // اگر ثبت‌نام ناموفق بود، فایل‌های ذخیره‌شده بی‌استفاده نمانند
      this.filesService.deleteFiles(savedFiles);
      throw error;
    }
  }

  @Post('/logout')
  logout(@Res({ passthrough: true }) response: Response) {
    return this.authService.logout(response);
  }
}
