import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Response } from 'express';
import { BarberService } from 'src/barber/barber.service';
import { Role } from 'src/common/enum/role.enum';
import { OtpService } from 'src/otp/otp.service';
import { ServicesService } from 'src/services/services.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { User } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';

import { RegisterBarberDto } from './dto/register-barber.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { SendVerifyOtp } from './dto/verify-otp.dto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly otpService: OtpService,
    private barberProfileService: BarberService,
    private servicesService: ServicesService,
  ) {}

  async sendCode(sendOtpDto: SendOtpDto) {
    const user = await this.usersService.findWithPhone(sendOtpDto.phone);

    const response = await this.otpService.sendOtp(sendOtpDto.phone);

    const { message, ...payload } = response;

    return {
      message,
      data: {
        ...payload,
        newUser: !user,
      },
    };
  }

  async login(sendVerifyOtp: SendVerifyOtp, response: Response) {
    await this.otpService.verifyOtp(sendVerifyOtp.phone, sendVerifyOtp.code);

    let user = await this.usersService.findWithPhone(sendVerifyOtp.phone);

    if (!user) {
      // ساخت کاربر جدید با نقش پیش‌فرض User و رمز عبور تصادفی (غیرقابل استفاده)
      const randomPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      user = await this.usersService.createWithRoles(
        {
          phone: sendVerifyOtp.phone,
          fullName: `کاربر ${sendVerifyOtp.phone}`,
          password: hashedPassword,
          isActive: true,
        },
        [Role.User, Role.Barber],
      );
    }

    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);
    response.cookie('access_token', accessToken, this.accessCookieOptions);
    response.cookie('refresh_token', refreshToken, this.refreshCookieOptions);

    return { message: 'ورود با موفقیت انجام شد' };
  }

  async registerBarber(dto: RegisterBarberDto, response: Response) {
    // 1. تأیید کد یک‌بارمصرف
    await this.otpService.verifyOtp(dto.phone, dto.code);

    // 2. بررسی عدم تکراری بودن شماره
    const existingUser = await this.usersService.findWithPhone(dto.phone);
    if (existingUser) {
      throw new BadRequestException('این شماره تلفن قبلاً ثبت شده است');
    }

    // 3. هش کردن رمز عبور
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // 4. ایجاد کاربر با دو نقش User و Barber
    const user = await this.usersService.createWithRoles(
      {
        fullName: dto.fullName,
        phone: dto.phone,
        email: dto.email || '',
        password: hashedPassword,
        isActive: true,
        birthDate: dto.birthDate,
      },
      [Role.User, Role.Barber],
    );

    // 5. ایجاد پروفایل آرایشگر (غیرفعال – نیاز به تأیید ادمین)
    const _profile = await this.barberProfileService.create({
      userId: user.id,
      salonName: dto.salonName,
      city: dto.city,
      address: dto.address,
      profileImage: dto.profileImage,
      portfolioImages: dto.portfolioImages || [],
      isApproved: false, // مهم: نیاز به تأیید
      workStartTime: null, // اختیاری
      workEndTime: null,
      bio: '',
    });

    // 6. ایجاد خدمات (اگر در فرم ارسال شده باشند)
    if (dto.services && dto.services.length > 0) {
      for (const svc of dto.services) {
        await this.servicesService.create({
          name: svc.name,
          price: svc.price,
          durationMinutes: svc.durationMinutes,
          barberId: user.id,
          isActive: true,
        });
      }
    }

    // 7. صدور توکن و ذخیره در کوکی
    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);
    response.cookie('access_token', accessToken, this.accessCookieOptions);
    response.cookie('refresh_token', refreshToken, this.refreshCookieOptions);

    return {
      message:
        'ثبت‌نام آرایشگر با موفقیت انجام شد. پس از تأیید ادمین، حساب شما فعال می‌شود.',
    };
  }

  async signUp(createUserDto: CreateUserDto, response: Response) {
    await this.otpService.verifyOtp(createUserDto.phone, createUserDto.code);

    const user = await this.usersService.findWithPhone(createUserDto.phone);

    if (user) {
      throw new BadRequestException('user exist');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const newUser = await this.usersService.create({
      ...createUserDto,
      password: hashedPassword,
    });

    const accessToken = await this.generateAccessToken(newUser);

    const refreshToken = await this.generateRefreshToken(newUser);

    response.cookie('access_token', accessToken, this.accessCookieOptions);

    response.cookie('refresh_token', refreshToken, this.refreshCookieOptions);

    return {
      message: 'sign up successfully',
    };
  }

  async refresh(refreshToken: string, response: Response) {
    const payload = await this.jwtService.verifyAsync(refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET,
    });

    const user = await this.usersService.findOne(payload.sub);

    if (!user) {
      throw new BadRequestException('user not found');
    }

    const newAccessToken = await this.generateAccessToken(user);

    const newRefreshToken = await this.generateRefreshToken(user);

    response.cookie('access_token', newAccessToken, this.accessCookieOptions);

    response.cookie(
      'refresh_token',
      newRefreshToken,
      this.refreshCookieOptions,
    );

    return {
      message: 'token refreshed',
    };
  }

  logout(response: Response) {
    response.clearCookie('access_token');

    response.clearCookie('refresh_token');

    return {
      message: 'logout success',
    };
  }

  private readonly accessCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 15 * 60 * 1000,
  };

  private readonly refreshCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  };

  private async generateAccessToken(user: User) {
    // eslint-disable-next-line unused-imports/no-unused-vars
    const { password, ...payload } = user;

    return this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: '6h',
    });
  }

  private async generateRefreshToken(user: any) {
    return this.jwtService.signAsync(
      {
        sub: user.id,
      },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: '30d',
      },
    );
  }
}
