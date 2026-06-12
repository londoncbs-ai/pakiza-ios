/**
 * Dismissible feature hints. Each hint is keyed and, once dismissed, stays
 * dismissed across launches (persisted to AsyncStorage). Use via useHint(key).
 */
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'pakiza.hint.';

export function useHint(key: string): { dismissed: boolean; dismiss: () => void } {
  // Start hidden until we have read storage, so a dismissed hint never flashes.
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(PREFIX + key)
      .then((v) => {
        if (active) setDismissed(v === '1');
      })
      .catch(() => {
        if (active) setDismissed(false);
      });
    return () => {
      active = false;
    };
  }, [key]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    AsyncStorage.setItem(PREFIX + key, '1').catch(() => {});
  }, [key]);

  return { dismissed, dismiss };
}
