import { api } from './client';
import type { CreateProfileInput, MyProfile, PublicProfile } from './types';

export const profilesApi = {
  /** Own profile. Returns null on 404 (no profile created yet). */
  async getMine(): Promise<MyProfile | null> {
    try {
      const { data } = await api.get<MyProfile>('/profiles/me');
      return data;
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  },

  create(input: CreateProfileInput) {
    return api.post<MyProfile>('/profiles/me', input).then((r) => r.data);
  },

  discover(page = 1, pageSize = 15) {
    return api
      .get<PublicProfile[]>('/matches/discover', { params: { page, page_size: pageSize } })
      .then((r) => r.data);
  },
};
