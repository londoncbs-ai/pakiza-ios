import { api } from './client';

/** Backend SocialAuthResponse: tokens + first-time/profile hints. */
export interface SocialAuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  is_new_user: boolean;
  profile_complete: boolean;
}

export const socialApi = {
  /** Exchange a Google ID token for an app token pair. */
  google(id_token: string) {
    return api.post<SocialAuthResponse>('/auth/google', { id_token }).then((r) => r.data);
  },
  /** Exchange an Apple identity token for an app token pair. */
  apple(identity_token: string) {
    return api.post<SocialAuthResponse>('/auth/apple', { identity_token }).then((r) => r.data);
  },
};
