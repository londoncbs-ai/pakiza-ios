import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

import { Text } from '@/components/Text';
import { formatDuration } from '@/hooks/useAudioRecorder';
import { palette, radii, spacing, useTheme } from '@/theme';

interface VoiceMessageProps {
  /** Presigned GET url for the audio file. */
  url: string | null;
  /** Recorded length, used for the label and as a progress fallback. */
  durationSecs: number | null;
  /** True for the current user's own bubble (tints controls onto burgundy). */
  mine: boolean;
}

/**
 * A voice-note bubble body: a play/pause control, a thin progress bar and a
 * mm:ss label. Streams from a presigned url via expo-audio; the player is torn
 * down on unmount.
 */
export function VoiceMessage({ url, durationSecs, mine }: VoiceMessageProps) {
  const { c } = useTheme();
  const player = useAudioPlayer(url ? { uri: url } : null);
  const status = useAudioPlayerStatus(player);

  // Ensure playback is audible even when the iOS hardware mute switch is on, for
  // recipients who have never recorded (recording is what otherwise primes this).
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  // When playback reaches the end, rewind so the next tap replays from the start.
  useEffect(() => {
    if (status.didJustFinish) {
      player.pause();
      player.seekTo(0);
    }
  }, [status.didJustFinish, player]);

  const total = status.duration && status.duration > 0 ? status.duration : durationSecs ?? 0;
  const progress = useMemo(() => {
    if (!total) return 0;
    return Math.min(1, Math.max(0, status.currentTime / total));
  }, [status.currentTime, total]);

  const playing = status.playing;
  const label = playing && status.currentTime > 0 ? status.currentTime : durationSecs ?? total;

  const fg = mine ? palette.cream : c.text;
  const track = mine ? 'rgba(251,247,239,0.28)' : c.border;
  const fill = mine ? palette.cream : c.accent;

  const toggle = () => {
    if (!url) return;
    if (playing) player.pause();
    else player.play();
  };

  return (
    <View style={styles.row}>
      <Pressable onPress={toggle} hitSlop={8} disabled={!url} style={styles.control}>
        <Ionicons name={playing ? 'pause' : 'play'} size={18} color={fg} />
      </Pressable>
      <View style={styles.body}>
        <View style={[styles.track, { backgroundColor: track }]}>
          <View style={[styles.fill, { backgroundColor: fill, width: `${progress * 100}%` }]} />
        </View>
        <Text variant="footnote" color={mine ? palette.cream : c.textMuted} style={styles.time}>
          {formatDuration(label)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: 168 },
  control: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  track: { height: 4, borderRadius: radii.pill, overflow: 'hidden' },
  fill: { height: 4, borderRadius: radii.pill },
  time: { marginTop: 5 },
});
