/**
 * Hide-from-contacts privacy feature.
 *
 * Reads the phone book ON DEVICE, normalizes each number to E.164 and
 * SHA-256 hashes it; only the hashes are uploaded. The server compares a
 * viewer's own number (hashed the same way) against this set and hides the
 * member from anyone they know. Names and raw numbers never leave the phone.
 *
 * Normalization must mirror the backend exactly: '+' followed by digits
 * only (see backend hash_phone). Local-format numbers are converted using
 * the member's own country calling code.
 */
import * as Contacts from 'expo-contacts';
import * as Crypto from 'expo-crypto';

import { profilesApi } from '../api/profiles';

const MAX_HASHES = 5000;

/** Common calling codes, longest first so greedy matching works. */
const CALLING_CODES = [
  '880', '971', '966', '965', '974', '973', '968', '961', '962', '963',
  '964', '212', '213', '216', '218', '220', '234', '254', '255', '256',
  '92', '91', '90', '93', '94', '60', '62', '63', '65', '66', '81', '82',
  '84', '86', '20', '27', '30', '31', '32', '33', '34', '36', '39', '40',
  '41', '43', '44', '45', '46', '47', '48', '49', '61', '64', '7', '1',
];

export function callingCodeOf(ownPhone: string | null | undefined): string {
  if (!ownPhone || !ownPhone.startsWith('+')) return '44';
  const digits = ownPhone.slice(1);
  return CALLING_CODES.find((cc) => digits.startsWith(cc)) ?? '44';
}

export function normalizePhone(raw: string, ownCc: string): string | null {
  let s = raw.replace(/[\s().\-]/g, '');
  if (!s) return null;
  if (s.startsWith('00')) s = '+' + s.slice(2);
  if (s.startsWith('0')) s = '+' + ownCc + s.slice(1);
  if (!s.startsWith('+')) s = '+' + ownCc + s;
  if (!/^\+\d{7,15}$/.test(s)) return null;
  return s;
}

export type ContactSyncResult = { synced: number } | 'permission-denied';

/**
 * Read, hash and upload the contact set. Pass promptIfNeeded=false for
 * silent background refreshes (e.g. app launch) so we never surprise the
 * user with a permission dialog outside the settings toggle.
 */
export async function syncContactHashes(
  ownPhone: string | null | undefined,
  promptIfNeeded = true,
): Promise<ContactSyncResult> {
  let perm = await Contacts.getPermissionsAsync();
  if (!perm.granted) {
    if (!promptIfNeeded) return 'permission-denied';
    perm = await Contacts.requestPermissionsAsync();
    if (!perm.granted) return 'permission-denied';
  }

  const { data } = await Contacts.getContactsAsync({
    fields: [Contacts.Fields.PhoneNumbers],
  });

  const cc = callingCodeOf(ownPhone);
  const numbers = new Set<string>();
  for (const contact of data) {
    for (const p of contact.phoneNumbers ?? []) {
      const normalized = normalizePhone(p.number ?? '', cc);
      if (normalized) numbers.add(normalized);
    }
  }

  const own = ownPhone ? normalizePhone(ownPhone, cc) : null;
  if (own) numbers.delete(own);

  const list = [...numbers].slice(0, MAX_HASHES);
  const hashes = await Promise.all(
    list.map((n) =>
      Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, n),
    ),
  );

  await profilesApi.syncContactHashes(hashes);
  return { synced: hashes.length };
}
