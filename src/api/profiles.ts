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
  getById(userId: string) {
    return api.get<PublicProfile>(`/profiles/${userId}`).then((r) => r.data);
  },
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

  /** Hide-from-contacts: upload the full replacement set of SHA-256 hashes. */
  syncContactHashes(hashes: string[]) {
    return api.put('/profiles/me/contact-hashes', { hashes }).then((r) => r.data);
  },

  clearContactHashes() {
    return api.delete('/profiles/me/contact-hashes').then((r) => r.data);
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
        timeout: 120000,
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
      .post('/profiles/me/verify-selfie', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 })
      .then((r) => r.data);
  },

  /** Start a liveness challenge: an ordered list of poses to capture. */
  startLiveness() {
    return api
      .post<{ challenge_id: string; expires_in: number; steps: { key: string; prompt: string }[] }>(
        '/profiles/me/liveness/start',
      )
      .then((r) => r.data);
  },

  /** Submit one photo per liveness step, in order; the first is the selfie that is matched. */
  verifySelfieLive(challengeId: string, uris: string[]) {
    const form = new FormData();
    form.append('challenge_id', challengeId);
    uris.forEach((uri, i) => {
      form.append('files', { uri, name: `pose-${i}.jpg`, type: 'image/jpeg' } as any);
    });
    return api
      .post('/profiles/me/verify-selfie-live', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 })
      .then((r) => r.data);
  },

  /** Upload a photo of a government ID for our team to check. */
  verifyId(uri: string, documentType: 'passport' | 'driving_licence' | 'national_id') {
    const form = new FormData();
    const name = uri.split('/').pop() || 'id.jpg';
    const ext = (name.split('.').pop() || 'jpg').toLowerCase();
    form.append('file', { uri, name, type: ext === 'png' ? 'image/png' : 'image/jpeg' } as any);
    form.append('document_type', documentType);
    return api
      .post('/profiles/me/verify-id', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 })
      .then((r) => r.data);
  },
};
