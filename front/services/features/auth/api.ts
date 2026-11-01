import { getErrorStatus } from '@/lib/api-error';
import { extractUser } from '@/lib/roles';
import { api, refreshSessionRequest } from '@/services/api/client';
import { endpoints } from '@/services/api/endpoints';
import {
  markSessionChanged,
  withSessionMutation,
} from '@/services/api/session-coordination';
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

const AUTH_REQUEST_TIMEOUT_MS = 30_000;
const REGISTRATION_TIMEOUT_MS = 120_000;

export function login(dto: LoginDto) {
  return withSessionMutation(async () => {
    const { data } = await api.post<ApiSingleResponse<LoginResponse>>(
      endpoints.auth.login,
      dto,
      { timeout: AUTH_REQUEST_TIMEOUT_MS },
    );
    // A new OTP user still has to register: no cookies were issued yet.
    if (data.data?.newUser === false) markSessionChanged();
    return data;
  });
}

export function loginWithPassword(dto: LoginWithPasswordDto) {
  return withSessionMutation(async () => {
    const { data } = await api.post<ApiSingleResponse<LoginResponse>>(
      endpoints.auth.loginWithPassword,
      dto,
      { timeout: AUTH_REQUEST_TIMEOUT_MS },
    );
    markSessionChanged();
    return data;
  });
}

export async function requestChangePasswordCode() {
  const { data } = await api.post(endpoints.auth.requestChangePasswordCode);
  return data;
}

export async function changePassword(dto: {
  newPassword: string;
  code: string;
}) {
  const { data } = await api.post(endpoints.auth.changePassword, dto);
  return data;
}

export async function sendOtp(dto: sendOtpDto) {
  const { data } = await api.post<ApiSingleResponse<sendOtpResponse>>(
    endpoints.auth.otp,
    dto,
    { timeout: AUTH_REQUEST_TIMEOUT_MS },
  );
  return data;
}

export async function verifyOtp(dto: VerifyOtpDto) {
  const { data } = await api.post<unknown>(endpoints.auth.verifyOtp, dto);
  return data;
}

export function signUp(dto: SignUpDto) {
  return withSessionMutation(async () => {
    const { data } = await api.post<ApiSingleResponse<unknown>>(
      endpoints.auth.signUp,
      dto,
      { timeout: AUTH_REQUEST_TIMEOUT_MS },
    );
    markSessionChanged();
    return data;
  });
}

export function registerBarber(dto: FormData) {
  return withSessionMutation(async () => {
    const { data } = await api.post(endpoints.auth.registerBarber, dto, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: REGISTRATION_TIMEOUT_MS,
    });
    markSessionChanged();
    return data;
  });
}

/** Fetch and normalize the current user; only a confirmed 401 means guest. */
export async function fetchMe(
  signal?: AbortSignal,
): Promise<ApiSingleResponse<UserResponse | null>> {
  try {
    const { data } = await api.get(endpoints.auth.me, {
      signal,
      timeout: AUTH_REQUEST_TIMEOUT_MS,
    });
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

export function logout() {
  return withSessionMutation(async () => {
    // Do not claim logout succeeded if the server did not clear the HttpOnly
    // cookies (including an unexpected 401 or a network failure).
    const { data } = await api.post(endpoints.auth.logout, undefined, {
      timeout: AUTH_REQUEST_TIMEOUT_MS,
    });
    markSessionChanged();
    return data;
  });
}
