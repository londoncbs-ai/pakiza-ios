import { api } from './client';
import type {
  CreateProfileInput,
  MyProfile,
  PartnerPreferences,
  Photo,
  PublicProfile,
  UpdateProfileInput,
} from './types';

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

  update(patch: UpdateProfileInput) {
    return api.patch<MyProfile>('/profiles/me', patch).then((r) => r.data);
  },

  getPreferences() {
    return api.get<PartnerPreferences>('/profiles/me/preferences').then((r) => r.data);
  },

  updatePreferences(patch: Partial<PartnerPreferences>) {
    return api.patch<PartnerPreferences>('/profiles/me/preferences', patch).then((r) => r.data);
  },

  discover(page = 1, pageSize = 15) {
    return api
      .get<PublicProfile[]>('/matches/discover', { params: { page, page_size: pageSize } })
      .then((r) => r.data);
  },

  /** Upload a photo (multipart). `uri` is a local file URI from the image picker. */
  uploadPhoto(uri: string) {
    const form = new FormData();
    const name = uri.split('/').pop() || 'photo.jpg';
    const ext = (name.split('.').pop() || 'jpg').toLowerCase();
    form.append('file', {
      uri,
      name,
      type: ext === 'png' ? 'image/png' : 'image/jpeg',
    } as any);
    return api
      .post<Photo>('/profiles/me/photos', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  deletePhoto(photoId: string) {
    return api.delete(`/profiles/me/photos/${photoId}`).then((r) => r.data);
  },

  /** Upload a live selfie to verify it matches the primary profile photo. */
  verifySelfie(uri: string) {
    const form = new FormData();
    const name = uri.split('/').pop() || 'selfie.jpg';
    const ext = (name.split('.').pop() || 'jpg').toLowerCase();
    form.append('file', { uri, name, type: ext === 'png' ? 'image/png' : 'image/jpeg' } as any);
    return api
      .post('/profiles/me/verify-selfie', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data);
  },
};
