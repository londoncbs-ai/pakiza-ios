import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Thin, fail-safe haptics wrapper. Every call is fire-and-forget and a no-op
 * on web. Use the semantic helpers rather than reaching for expo-haptics
 * directly so feedback stays consistent:
 *   - selection: toggles, steps, segmented controls
 *   - light: a deliberate choice (express interest / not now / save)
 *   - success: mutual interest, payment confirmed
 *   - warning / error: failed OTP, payment error, blocked action
 */
const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

function safe(run: () => Promise<unknown>) {
  if (!enabled) return;
  run().catch(() => {});
}

export const haptics = {
  /** Pre-warm the Taptic engine before an imminent interaction (iOS). */
  prepare() {
    safe(() => Haptics.selectionAsync());
  },
  selection() {
    safe(() => Haptics.selectionAsync());
  },
  light() {
    safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },
  medium() {
    safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  },
  success() {
    safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },
  warning() {
    safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
  },
  error() {
    safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
  },
} as const;
