import { api } from './client';
import type { RegisterResponse, TokenResponse } from './types';

export const authApi = {
  register(phone: string | null, password: string, email?: string) {
    return api
      .post<RegisterResponse>('/auth/register', {
        phone: phone || undefined, // optional while SMS verification is disabled
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

  /** Permanent self-serve account deletion (password re-confirmed server-side). */
  deleteAccount(password: string, reason?: string) {
    return api
      .delete<{ message: string }>('/auth/me', {
        data: { password, reason: reason || undefined },
      })
      .then((r) => r.data);
  },

  // ── Password reset (email link based: the new password is set on the web page) ──
  forgotPassword(email: string) {
    return api.post<{ message: string }>('/auth/forgot-password', { email }).then((r) => r.data);
  },

  /** Account-level verification state; never 404s (works before the profile exists). */
  me() {
    return api
      .get<{
        phone: string | null;
        phone_verified: boolean;
        phone_verification_required: boolean;
        email: string | null;
        email_verified: boolean;
        is_selfie_verified: boolean;
        profile_complete: boolean;
        has_primary_photo: boolean;
      }>('/auth/me')
      .then((r) => r.data);
  },

  // ── Email verification (link/token based) ───────────────────────────────────
  sendEmailVerification() {
    return api.post('/auth/send-email-verification').then((r) => r.data);
  },

  verifyEmail(token: string) {
    return api.post('/auth/verify-email', { token }).then((r) => r.data);
  },

  // ── Add a phone to an account that has none (signup allows skipping it) ──────
  addPhone(phone: string) {
    return api.post<RegisterResponse>('/auth/add-phone', { phone }).then((r) => r.data);
  },

  verifyPhone(phone: string, otp: string) {
    return api.post('/auth/verify-phone', { phone, otp }).then((r) => r.data);
  },
};
