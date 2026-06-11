/**
 * Local "Save to revisit" shortlist - the considered middle-state between
 * Express interest and Not now. Stored on-device (AsyncStorage) as full
 * profile snapshots so the Saved screen can render without a refetch.
 *
 * This is intentionally local for now; a server-synced shortlist (cross-device)
 * is a fast follow.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PublicProfile } from '@/api/types';

const KEY = 'pakiza.saved_profiles';
const MAX = 100;

type Listener = (count: number) => void;
const listeners = new Set<Listener>();

async function readAll(): Promise<PublicProfile[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PublicProfile[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(items: PublicProfile[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX)));
  listeners.forEach((fn) => fn(Math.min(items.length, MAX)));
}

export const savedStore = {
  list: readAll,

  async count(): Promise<number> {
    return (await readAll()).length;
  },

  async isSaved(userId: string): Promise<boolean> {
    return (await readAll()).some((p) => p.user_id === userId);
  },

  /** Add to the front, de-duplicated by user_id. */
  async add(profile: PublicProfile) {
    const items = await readAll();
    if (items.some((p) => p.user_id === profile.user_id)) return;
    await writeAll([profile, ...items]);
  },

  async remove(userId: string) {
    const items = await readAll();
    await writeAll(items.filter((p) => p.user_id !== userId));
  },

  /** Subscribe to count changes (for the Saved badge). Returns an unsubscribe fn. */
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
