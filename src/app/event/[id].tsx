import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { eventsApi } from '@/api/events';
import { errorMessage } from '@/api/client';
import type { EventCategory, EventItem, RSVPStatus } from '@/api/types';
import { Button } from '@/components/Button';
import { ErrorState } from '@/components/ErrorState';
import { Screen } from '@/components/Screen';
import { Skeleton } from '@/components/Skeleton';
import { Surface } from '@/components/Surface';
import { Text } from '@/components/Text';
import { haptics } from '@/lib/haptics';
import { palette, radii, spacing, tint, useTheme } from '@/theme';

const CATEGORY_LABELS: Record<EventCategory, string> = {
  matrimonial_meet: 'Curated introductions',
  speed_matching: 'Speed matching',
  webinar: 'Webinar',
  workshop: 'Workshop',
  community: 'Community',
  family: 'Families welcome',
};

const HERO_HEIGHT = 240;

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function rsvpLabel(status: RSVPStatus): string {
  return status === 'going' ? "You're going" : "You're interested";
}

/** A single icon + label + value row inside the info card. */
function InfoRow({
  icon,
  label,
  value,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) {
  const { c } = useTheme();
  return (
    <View
      style={[
        styles.infoRow,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
      ]}
    >
      <View style={[styles.infoIcon, { backgroundColor: c.accentFaint }]}>
        <Ionicons name={icon} size={18} color={c.accent} />
      </View>
      <View style={styles.infoText}>
        <Text variant="footnote" tone="muted">{label}</Text>
        <Text variant="callout" tone="default" style={{ marginTop: 1 }}>{value}</Text>
      </View>
    </View>
  );
}

export default function EventDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const data = await eventsApi.get(id);
      setEvent(data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onRsvp = async (status: RSVPStatus) => {
    if (!id || acting) return;
    setActing(true);
    try {
      const updated = await eventsApi.rsvp(id, status);
      setEvent(updated);
      haptics.success();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setActing(false);
    }
  };

  const onCancel = async () => {
    if (!id || acting) return;
    setActing(true);
    try {
      const updated = await eventsApi.cancelRsvp(id);
      setEvent(updated);
      haptics.light();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setActing(false);
    }
  };

  const BackButton = () => (
    <Pressable
      onPress={() => router.back()}
      hitSlop={12}
      style={[styles.backBtn, { top: insets.top + spacing.sm }]}
    >
      <Ionicons name="chevron-back" size={24} color={palette.cream} />
    </Pressable>
  );

  if (loading) {
    return (
      <Screen>
        <BackButton />
        <ScrollView showsVerticalScrollIndicator={false} scrollEnabled={false}>
          <Skeleton height={HERO_HEIGHT} radius={0} />
          <View style={styles.content}>
            <Skeleton width="40%" height={13} style={{ marginBottom: spacing.sm }} />
            <Skeleton width="80%" height={28} radius={radii.sm} style={{ marginBottom: spacing.xl }} />
            <Skeleton height={220} radius={radii.lg} style={{ marginBottom: spacing.xl }} />
            <Skeleton width="50%" height={20} radius={radii.sm} style={{ marginBottom: spacing.md }} />
            <Skeleton height={14} style={{ marginBottom: spacing.sm }} />
            <Skeleton height={14} style={{ marginBottom: spacing.sm }} />
            <Skeleton width="70%" height={14} />
          </View>
        </ScrollView>
      </Screen>
    );
  }

  if (error || !event) {
    return (
      <Screen>
        <BackButton />
        <View style={styles.errorWrap}>
          <ErrorState message={error ?? 'Event not found.'} onRetry={() => { setLoading(true); load(); }} />
        </View>
      </Screen>
    );
  }

  const place = event.is_online
    ? 'Online'
    : [event.location_name, event.city].filter(Boolean).join(', ') || 'Location to be confirmed';
  const timeRange = event.ends_at
    ? `${formatTime(event.starts_at)} - ${formatTime(event.ends_at)}`
    : formatTime(event.starts_at);
  const capacityValue =
    event.capacity != null
      ? `${event.going_count} going · ${event.capacity} places`
      : `${event.going_count} going`;
  const paragraphs = event.description.split('\n\n').filter((p) => p.trim().length > 0);

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
      >
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: palette.burgundyDark }]}>
          {event.cover_image_url ? (
            <Image
              source={{ uri: event.cover_image_url }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={180}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.heroFallback]}>
              <Ionicons name="calendar-outline" size={48} color={tint.onDarkFaint} />
            </View>
          )}
        </View>

        <BackButton />

        <View style={styles.content}>
          <Text variant="footnote" tone="accent" style={{ marginBottom: spacing.xs }}>
            {CATEGORY_LABELS[event.category]}
          </Text>
          <Text variant="title" tone="default" style={{ marginBottom: spacing.xl }}>
            {event.title}
          </Text>

          {/* Info card */}
          <Surface style={styles.infoCard} elevated>
            <InfoRow icon="calendar-outline" label="Date" value={formatFullDate(event.starts_at)} />
            <InfoRow icon="time-outline" label="Time" value={timeRange} />
            <InfoRow icon="location-outline" label={event.is_online ? 'Format' : 'Location'} value={place} />
            {event.host_name ? <InfoRow icon="person-outline" label="Host" value={event.host_name} /> : null}
            {event.price_label ? <InfoRow icon="pricetag-outline" label="Price" value={event.price_label} /> : null}
            <InfoRow icon="people-outline" label="Attendance" value={capacityValue} last />
          </Surface>

          {/* About */}
          {paragraphs.length > 0 ? (
            <View style={styles.about}>
              <Text variant="heading" tone="accent" style={{ marginBottom: spacing.md }}>
                About this event
              </Text>
              {paragraphs.map((p, i) => (
                <Text
                  key={i}
                  variant="body"
                  tone="default"
                  style={i < paragraphs.length - 1 ? styles.paragraph : styles.paragraphLast}
                >
                  {p}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky RSVP bar */}
      <View
        style={[
          styles.bar,
          {
            backgroundColor: c.surface,
            borderTopColor: c.border,
            paddingBottom: insets.bottom > 0 ? insets.bottom : spacing.lg,
          },
        ]}
      >
        {event.my_rsvp ? (
          <View style={styles.barGoing}>
            <View style={styles.statusRow}>
              <Ionicons name="checkmark-circle" size={22} color={c.success} />
              <Text variant="subhead" tone="default">{rsvpLabel(event.my_rsvp)}</Text>
            </View>
            <Button
              label="Cancel RSVP"
              variant="ghost"
              onPress={onCancel}
              loading={acting}
              style={styles.cancelBtn}
            />
          </View>
        ) : (
          <View style={styles.barActions}>
            <Pressable
              onPress={() => onRsvp('interested')}
              disabled={acting}
              style={({ pressed }) => [
                styles.interestedBtn,
                { borderColor: c.borderStrong, backgroundColor: c.surfaceAlt },
                pressed && !acting && { opacity: 0.85 },
                acting && { opacity: 0.5 },
              ]}
            >
              <Ionicons name="star-outline" size={18} color={c.accent} />
              <Text variant="subhead" tone="accent">Interested</Text>
            </Pressable>
            <Button
              label="I'm going"
              variant="primary"
              onPress={() => onRsvp('going')}
              loading={acting}
              style={styles.goingBtn}
            />
          </View>
        )}
      </View>

      {acting ? (
        <View style={styles.actingOverlay} pointerEvents="none">
          <ActivityIndicator color={palette.burgundy} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', height: HERO_HEIGHT },
  heroFallback: { alignItems: 'center', justifyContent: 'center' },
  backBtn: {
    position: 'absolute',
    left: spacing.lg,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: tint.overlaySoft,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  infoCard: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: { flex: 1 },
  about: { marginBottom: spacing.lg },
  paragraph: { lineHeight: 24, marginBottom: spacing.md },
  paragraphLast: { lineHeight: 24 },
  errorWrap: { flex: 1 },
  bar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  barActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  interestedBtn: {
    flex: 1,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1.5,
  },
  goingBtn: { flex: 1 },
  barGoing: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cancelBtn: { height: 44, paddingHorizontal: 16 },
  actingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
