import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { BarberService } from 'src/barber/barber.service';
import {
  ACCESS_TOKEN_EXPIRES_IN,
  getAccessTokenSecret,
  getRefreshTokenSecret,
  REFRESH_TOKEN_EXPIRES_IN,
} from 'src/common/config/jwt.config';
import { Role } from 'src/common/enum/role.enum';
import {
  clearAuthCookies,
  setAuthCookies,
} from 'src/common/utils/auth-cookie.util';
import { isDuplicateEntryError } from 'src/common/utils/db-error.util';
import { normalizeRoles } from 'src/common/utils/roles.util';
import { OtpService } from 'src/otp/otp.service';
import { ReferralService } from 'src/referral/referral.service';
import { ServicesService } from 'src/services/services.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { User } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';
import { DataSource } from 'typeorm';

import { RegisterBarberDto } from './dto/register-barber.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { SendVerifyOtp } from './dto/verify-otp.dto';

const INVALID_REFRESH_TOKEN_MESSAGE = 'توکن تازه‌سازی نامعتبر است';
const EXPIRED_SESSION_MESSAGE =
  'نشست شما منقضی شده است. لطفاً دوباره وارد شوید';
const PHONE_ALREADY_REGISTERED_MESSAGE = 'این شماره تلفن قبلاً ثبت شده است';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly otpService: OtpService,
    private readonly barberProfileService: BarberService,
    private readonly servicesService: ServicesService,
    private readonly referralService: ReferralService,
    private readonly dataSource: DataSource,
  ) {}

  async getProfile(userId: number) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }
    return user;
  }

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

  async verifyCode(sendVerifyOtp: SendVerifyOtp) {
    await this.otpService.verifyOtp(
      sendVerifyOtp.phone,
      sendVerifyOtp.code,
      false,
    );

    const user = await this.usersService.findWithPhone(sendVerifyOtp.phone);

    if (user && !user.isActive) {
      throw new ForbiddenException(
        'حساب کاربری شما غیرفعال است. با پشتیبانی تماس بگیرید',
      );
    }

    return {
      message: 'کد تأیید معتبر است',
      data: { valid: true, newUser: !user },
    };
  }

  async login(sendVerifyOtp: SendVerifyOtp, response: Response) {
    await this.otpService.verifyOtp(sendVerifyOtp.phone, sendVerifyOtp.code);

    const user = await this.usersService.findWithPhone(sendVerifyOtp.phone);

    if (!user) {
      return {
        message:
          'این شماره هنوز ثبت‌نام نشده است. لطفاً برای تکمیل ثبت‌نام نام و تاریخ تولد را وارد کنید',
        data: { newUser: true, phone: sendVerifyOtp.phone },
      };
    }

    if (!user.isActive) {
      throw new ForbiddenException(
        'حساب کاربری شما غیرفعال است. با پشتیبانی تماس بگیرید',
      );
    }

    await this.issueTokens(user, response);

    return { message: 'ورود با موفقیت انجام شد', data: { newUser: false } };
  }

  async registerBarber(dto: RegisterBarberDto, response: Response) {
    const existingUser = await this.usersService.findWithPhone(dto.phone);
    if (existingUser) {
      throw new ConflictException(PHONE_ALREADY_REGISTERED_MESSAGE);
    }
    let referredByUserId: number | null = null;
    if (dto.referralCode?.trim()) {
      const referrerProfile =
        await this.barberProfileService.findByReferralCode(
          dto.referralCode.trim().toUpperCase(),
        );

      if (!referrerProfile) {
        throw new BadRequestException('کد معرف وارد شده معتبر نیست');
      }

      referredByUserId = referrerProfile.userId;
    }

    // ۳. تأیید کد یکبارمصرف
    await this.otpService.verifyOtp(dto.phone, dto.code);

    // ۴. ایجاد کاربر، پروفایل، خدمات و رکورد دعوت به صورت تراکنشی
    let user: User;
    try {
      user = await this.dataSource.transaction(async manager => {
        const createdUser = await this.usersService.createWithRoles(
          {
            fullName: dto.fullName,
            phone: dto.phone,
            isActive: true,
            birthDate: dto.birthDate,
          },
          [Role.User, Role.Barber],
          manager,
        );

        await this.barberProfileService.create(
          {
            userId: createdUser.id,
            salonName: dto.salonName,
            provinceId: dto.provinceId,
            cityId: dto.cityId,
            address: dto.address,
            profileImage: dto.profileImage,
            portfolioImages: dto.portfolioImages || [],
            isApproved: false,
            bio: '',
            referredBy: referredByUserId ?? undefined,
          },
          manager,
        );

        if (dto.services && dto.services.length > 0) {
          for (const svc of dto.services) {
            await this.servicesService.create(
              {
                name: svc.name,
                price: svc.price,
                durationMinutes: svc.durationMinutes,
                barberId: createdUser.id,
                isActive: true,
              },
              manager,
            );
          }
        }

        if (referredByUserId) {
          await this.referralService.createReferral(
            referredByUserId,
            createdUser.id,
            manager,
          );
        }

        return createdUser;
      });
    } catch (error) {
      if (isDuplicateEntryError(error)) {
        throw new ConflictException(PHONE_ALREADY_REGISTERED_MESSAGE);
      }

      this.logger.error(`registerBarber failed: ${String(error)}`);
      throw error;
    }

    // ۵. صدور توکن
    await this.issueTokens(user, response);

    return {
      message:
        'ثبت‌نام آرایشگر با موفقیت انجام شد. پس از تأیید ادمین، حساب شما فعال می‌شود.',
    };
  }

  async signUp(createUserDto: CreateUserDto, response: Response) {
    await this.otpService.verifyOtp(createUserDto.phone, createUserDto.code);

    const existingUser = await this.usersService.findWithPhone(
      createUserDto.phone,
    );

    if (existingUser) {
      throw new ConflictException(PHONE_ALREADY_REGISTERED_MESSAGE);
    }

    await this.otpService.verifyOtp(createUserDto.phone, createUserDto.code);

    let newUser: User;
    try {
      newUser = await this.usersService.create(createUserDto);
    } catch (error) {
      if (isDuplicateEntryError(error)) {
        throw new ConflictException(PHONE_ALREADY_REGISTERED_MESSAGE);
      }
      throw error;
    }

    if (!newUser.isActive) {
      throw new ForbiddenException(
        'حساب کاربری شما غیرفعال است. با پشتیبانی تماس بگیرید',
      );
    }

    await this.issueTokens(newUser, response);

    return { message: 'ثبت‌نام با موفقیت انجام شد' };
  }

  async refresh(refreshToken: string | undefined, response: Response) {
    if (!refreshToken) {
      clearAuthCookies(response);
      throw new UnauthorizedException('توکن تازه‌سازی ارسال نشده است');
    }

    let payload: { sub?: number | string };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: getRefreshTokenSecret(),
      });
    } catch (error) {
      this.logger.debug(`refresh token rejected: ${String(error)}`);
      clearAuthCookies(response);

      const isExpired =
        (error as { name?: string })?.name === 'TokenExpiredError';
      throw new UnauthorizedException(
        isExpired ? EXPIRED_SESSION_MESSAGE : INVALID_REFRESH_TOKEN_MESSAGE,
      );
    }

    const userId = Number(payload?.sub);

    if (!Number.isInteger(userId) || userId <= 0) {
      clearAuthCookies(response);
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN_MESSAGE);
    }

    const user = await this.usersService.findOne(userId);

    if (!user) {
      clearAuthCookies(response);
      throw new UnauthorizedException('کاربر یافت نشد');
    }

    if (!user.isActive) {
      clearAuthCookies(response);
      throw new ForbiddenException(
        'حساب کاربری شما غیرفعال است. با پشتیبانی تماس بگیرید',
      );
    }

    await this.issueTokens(user, response);

    return { message: 'نشست شما با موفقیت تازه‌سازی شد' };
  }

  logout(response: Response) {
    clearAuthCookies(response);

    return { message: 'خروج با موفقیت انجام شد' };
  }

  private async issueTokens(user: User, response: Response) {
    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);

    setAuthCookies(response, accessToken, refreshToken);
  }

  private async generateAccessToken(user: User) {
    return this.jwtService.signAsync(
      {
        id: user.id,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        roles: normalizeRoles(user.roles),
        isActive: user.isActive,
      },
      {
        secret: getAccessTokenSecret(),
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
      },
    );
  }

  private async generateRefreshToken(user: User) {
    return this.jwtService.signAsync(
      { sub: user.id },
      {
        secret: getRefreshTokenSecret(),
        expiresIn: REFRESH_TOKEN_EXPIRES_IN,
      },
    );
  }
}
