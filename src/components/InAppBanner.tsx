import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import type { RealtimeNotification } from '@/store/realtime';
import { Text } from '@/components/Text';
import { haptics } from '@/lib/haptics';
import { radii, shadow, spacing, useTheme } from '@/theme';

const VISIBLE_MS = 4000;

const ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  match: 'heart',
  new_message: 'chatbubble',
  like: 'thumbs-up',
  superlike: 'star',
  profile_view: 'eye',
  wali_request: 'people',
  system: 'megaphone',
  moderation: 'shield',
  meeting_request: 'calendar',
  meeting_accepted: 'checkmark-circle',
  meeting_declined: 'close-circle',
  meeting_scheduled: 'calendar-outline',
  meeting_update: 'sync',
  support: 'headset',
};

export function InAppBanner({
  notif,
  onDismiss,
}: {
  notif: RealtimeNotification | null;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { c, isDark } = useTheme();

  const translateY = useRef(new Animated.Value(-140)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = (immediate = false) => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    if (immediate) {
      onDismiss();
      return;
    }
    Animated.parallel([
      Animated.timing(translateY, { toValue: -140, duration: 200, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) onDismiss();
    });
  };

  // Animate in whenever a new notification arrives.
  useEffect(() => {
    if (!notif) return;
    haptics.light();
    translateY.setValue(-140);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 260, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start();

    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => dismiss(), VISIBLE_MS);

    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notif]);

  if (!notif) return null;

  const link = notif.payload;
  const meetingId = link?.meeting_id;
  const convId = link?.conversation_id;

  const open = () => {
    // Same branching as notifications.tsx open().
    if (meetingId && link?.tab === 'chat') {
      router.push({ pathname: '/meeting/[id]/chat', params: { id: String(meetingId) } });
    } else if (link?.screen === 'meeting' && meetingId) {
      router.push({ pathname: '/meeting/[id]', params: { id: String(meetingId) } });
    } else if (convId) {
      router.push({ pathname: '/chat/[id]', params: { id: String(convId) } });
    } else if (meetingId) {
      router.push({ pathname: '/meeting/[id]', params: { id: String(meetingId) } });
    } else if (link?.screen === 'support') {
      router.push('/support');
    } else if (link?.screen === 'match' || link?.screen === 'likes') {
      router.push('/(app)/matches');
    }
    dismiss(true);
  };

  const icon = ICON[notif.type] ?? 'notifications';

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingTop: insets.top + spacing.xs }]}
    >
      <Animated.View
        style={[
          styles.card,
          { backgroundColor: c.surface, borderColor: c.border, transform: [{ translateY }], opacity },
          !isDark && shadow.card,
        ]}
      >
        <Pressable onPress={open} style={styles.pressable}>
          <View style={[styles.iconWrap, { backgroundColor: c.accentFaint }]}>
            <Ionicons name={icon} size={20} color={c.accent} />
          </View>
          <View style={styles.body}>
            <Text variant="subhead" tone="default" numberOfLines={1}>
              {notif.title}
            </Text>
            {notif.body ? (
              <Text variant="footnote" tone="muted" numberOfLines={2} style={styles.bodyText}>
                {notif.body}
              </Text>
            ) : null}
          </View>
          <Pressable onPress={() => dismiss()} hitSlop={10} style={styles.close}>
            <Ionicons name="close" size={18} color={c.textSubtle} />
          </Pressable>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    zIndex: 1000,
  },
  card: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pressable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  body: { flex: 1 },
  bodyText: { marginTop: 1 },
  close: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.xs },
});
