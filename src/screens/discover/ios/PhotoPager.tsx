import React, { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, withTiming } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import type { Photo } from '@/api/types';
import { Text } from '@/components/Text';
import { photoBlurRadius, sortedPhotos } from '@/lib/photos';
import { durations, fonts, hexA, palette, radii, spacing, tint } from '@/theme';

/**
 * A member's photographs, swiped horizontally.
 *
 * Vertical paging moves between people and horizontal paging moves between one
 * person's pictures, so the two gestures never fight. Nothing here dismisses
 * anybody: a horizontal swipe is a gallery, not a verdict.
 *
 * The indicator is a row of segments that fill as you move, rather than dots,
 * so a member with six photographs still reads at a glance.
 */
export function PhotoPager({
  photos,
  name,
  width,
  height,
}: {
  photos: Photo[] | null | undefined;
  name: string;
  width: number;
  height: number;
}) {
  const list = sortedPhotos(photos);
  const [idx, setIdx] = useState(0);
  // A photograph that fails to load must not leave a blank burgundy slab.
  const [broken, setBroken] = useState<Record<string, true>>({});
  const allBroken = list.length > 0 && list.every((p) => broken[p.id]);

  const scroller = useRef<ScrollView>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width) return;
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== idx) setIdx(next);
  };

  /**
   * Tap the left or right of the photograph to move through it.
   *
   * A horizontal pager nested inside a vertical paging list cannot be relied on
   * to win the swipe, so navigation does not depend on the gesture: the taps
   * always work, and the swipe is a bonus where it does.
   */
  const step = (delta: number) => {
    const next = Math.min(Math.max(idx + delta, 0), list.length - 1);
    if (next === idx) return;
    setIdx(next);
    scroller.current?.scrollTo({ x: next * width, animated: true });
  };

  // A member with no photograph still deserves a composed page rather than a
  // slab of colour: a monogram in a gold ring, on the brand gradient.
  if (list.length === 0 || allBroken) {
    return (
      <LinearGradient
        colors={[palette.burgundy, palette.burgundyDark, palette.burgundyDeep]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={[styles.empty, { width, height }]}
      >
        <View style={styles.ring}>
          <Text style={styles.initial}>{name[0]?.toUpperCase() ?? '?'}</Text>
        </View>
        <Text variant="label" color={tint.onDarkSoft} style={styles.emptyNote}>
          No photograph yet
        </Text>
      </LinearGradient>
    );
  }

  return (
    <View style={{ width, height }}>
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        // Concrete dimensions: a horizontal ScrollView left to infer its height
        // can collapse to nothing inside an absolutely positioned parent.
        style={{ width, height }}
        // A single photograph must not swallow the vertical gesture.
        scrollEnabled={list.length > 1}
      >
        {list.map((p) => (
          <Image
            key={p.id}
            source={{ uri: p.cdn_url }}
            style={{ width, height }}
            contentFit="cover"
            contentPosition="top center"
            transition={180}
            blurRadius={photoBlurRadius(p)}
            recyclingKey={p.id}
            onError={() => setBroken((b) => ({ ...b, [p.id]: true }))}
            accessible={false}
          />
        ))}
      </ScrollView>

      {list.length > 1 ? (
        <View style={styles.segments} pointerEvents="none">
          {list.map((p, i) => (
            <Segment key={p.id} on={i === idx} />
          ))}
        </View>
      ) : null}

      {list[Math.min(idx, list.length - 1)]?.is_blurred_public ? (
        <View style={styles.blur} pointerEvents="none">
          <Ionicons name="eye-off-outline" size={12} color={palette.cream} />
          <Text variant="label" color={palette.cream}>Shared when you match</Text>
        </View>
      ) : null}

      {list.length > 1 ? (
        <>
          <Pressable
            onPress={() => step(-1)}
            accessibilityRole="button"
            accessibilityLabel="Previous photograph"
            style={[styles.tapZone, { left: 0, width: width * 0.32 }]}
          />
          <Pressable
            onPress={() => step(1)}
            accessibilityRole="button"
            accessibilityLabel="Next photograph"
            style={[styles.tapZone, { right: 0, width: width * 0.32 }]}
          />
        </>
      ) : null}
    </View>
  );
}

function Segment({ on }: { on: boolean }) {
  const reduced = useReducedMotion();
  const style = useAnimatedStyle(() => ({
    opacity: reduced ? (on ? 1 : 0.4) : withTiming(on ? 1 : 0.35, { duration: durations.base }),
  }));
  return <Animated.View style={[styles.segment, style]} />;
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center' },
  ring: {
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 1.5,
    borderColor: hexA(palette.gold, 0.55),
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { fontFamily: fonts.display, fontSize: 84, color: palette.goldSoft, includeFontPadding: false },
  emptyNote: { marginTop: spacing.lg },
  tapZone: { position: 'absolute', top: 0, bottom: 0 },
  segments: {
    position: 'absolute',
    top: 12,
    left: 14,
    right: 14,
    flexDirection: 'row',
    gap: 4,
  },
  segment: { flex: 1, height: 3, borderRadius: 2, backgroundColor: palette.cream },
  blur: {
    position: 'absolute',
    top: 28,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: tint.overlayStrong,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
});
