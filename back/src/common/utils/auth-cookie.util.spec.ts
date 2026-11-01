import {
  ACCESS_TOKEN_TTL_MS,
  REFRESH_TOKEN_TTL_MS,
} from '../config/jwt.config';
import { clearAuthCookies, setAuthCookies } from './auth-cookie.util';

describe('authentication cookie settings', () => {
  const originalEnv = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('uses secure HttpOnly cookies in production with matching logout options', () => {
    process.env.NODE_ENV = 'production';
    const response = { cookie: jest.fn(), clearCookie: jest.fn() } as any;
    setAuthCookies(response, 'access', 'refresh');
    clearAuthCookies(response);
    const common = { httpOnly: true, secure: true, sameSite: 'lax', path: '/' };
    expect(response.cookie).toHaveBeenCalledWith('access_token', 'access', {
      ...common,
      maxAge: ACCESS_TOKEN_TTL_MS,
    });
    expect(response.cookie).toHaveBeenCalledWith('refresh_token', 'refresh', {
      ...common,
      maxAge: REFRESH_TOKEN_TTL_MS,
    });
    expect(response.clearCookie).toHaveBeenCalledWith('access_token', common);
    expect(response.clearCookie).toHaveBeenCalledWith('refresh_token', common);
  });

  it('allows local HTTP development without making cookies readable by JavaScript', () => {
    process.env.NODE_ENV = 'development';
    const response = { cookie: jest.fn() } as any;
    setAuthCookies(response, 'access', 'refresh');
    expect(response.cookie.mock.calls[0][2]).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
    });
  });
});
