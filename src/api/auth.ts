import { api } from './client';
import type { RegisterResponse, TokenResponse } from './types';

export const authApi = {
  register(phone: string, password: string, email?: string) {
    return api
      .post<RegisterResponse>('/auth/register', {
        phone,
        password,
        email: email || undefined,
      })
      .then((r) => r.data);
  },

  resendOtp(phone: string) {
    return api.post<RegisterResponse>('/auth/resend-otp', { phone }).then((r) => r.data);
  },

  verifyOtp(phone: string, otp: string) {
    return api
      .post<TokenResponse>('/auth/verify-otp', { phone, otp })
      .then((r) => r.data);
  },

  login(identifier: string, password: string) {
    return api
      .post<TokenResponse>('/auth/login', { identifier, password })
      .then((r) => r.data);
  },

  logout(refresh_token: string) {
    return api.post('/auth/logout', { refresh_token }).then((r) => r.data);
  },

  changePassword(current_password: string, new_password: string) {
    return api
      .post('/auth/change-password', { current_password, new_password })
      .then((r) => r.data);
  },

  changeEmail(new_email: string, current_password: string) {
    return api
      .post('/auth/change-email', { new_email, current_password })
      .then((r) => r.data);
  },
};
