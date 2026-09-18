import { getErrorStatus } from '@/lib/api-error';
import { extractUser } from '@/lib/roles';
import {
  api,
  refreshSessionRequest,
  waitForSessionRefresh,
} from '@/services/api/client';
import { endpoints } from '@/services/api/endpoints';
import { ApiSingleResponse } from '@/services/api/types';

import {
  LoginDto,
  LoginResponse,
  LoginWithPasswordDto,
  sendOtpDto,
  sendOtpResponse,
  SignUpDto,
  UserResponse,
  VerifyOtpDto,
} from './types';

export async function login(dto: LoginDto) {
  await waitForSessionRefresh();
  const { data } = await api.post<ApiSingleResponse<LoginResponse>>(
    endpoints.auth.login,
    dto,
  );

  return data;
}

export async function loginWithPassword(dto: LoginWithPasswordDto) {
  await waitForSessionRefresh();
  const { data } = await api.post<ApiSingleResponse<LoginResponse>>(
    endpoints.auth.loginWithPassword,
    dto,
  );

  return data;
}

export async function sendOtp(dto: sendOtpDto) {
  const { data } = await api.post<ApiSingleResponse<sendOtpResponse>>(
    endpoints.auth.otp,
    dto,
  );

  return data;
}

export async function verifyOtp(dto: VerifyOtpDto) {
  const { data } = await api.post<unknown>(endpoints.auth.verifyOtp, dto);
  return data;
}

export async function signUp(dto: SignUpDto) {
  await waitForSessionRefresh();
  const { data } = await api.post<ApiSingleResponse<LoginResponse>>(
    endpoints.auth.signUp,
    dto,
  );

  return data;
}

export async function registerBarber(dto: FormData) {
  await waitForSessionRefresh();
  const { data } = await api.post(endpoints.auth.registerBarber, dto, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return data;
}

/**
 * دریافت اطلاعات کاربر جاری.
 * پاسخ همیشه نرمال می‌شود: یک کاربر با نقش‌های آرایه‌ای
 * (گاهی بک‌اند آرایه برمی‌گرداند یا نقش‌ها رشته‌ی جداشده با کاما هستند)
 */
export async function fetchMe(
  signal?: AbortSignal,
): Promise<ApiSingleResponse<UserResponse | null>> {
  try {
    const { data } = await api.get(endpoints.auth.me, { signal });
    const user = extractUser(data);
    if (!user) throw new Error('Invalid user response');
    return { ...data, data: user };
  } catch (error) {
    if (getErrorStatus(error) === 401)
      return { status: 401, message: '', data: null };
    throw error;
  }
}

export const refreshSession = refreshSessionRequest;

export async function logout() {
  await waitForSessionRefresh();
  try {
    const { data } = await api.post(endpoints.auth.logout);
    return data;
  } catch (error) {
    // Already signed out is a successful local logout, not an unrecoverable UI.
    if (getErrorStatus(error) === 401) return;
    throw error;
  }
}
