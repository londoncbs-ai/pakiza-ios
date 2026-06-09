import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { SwipeCard } from './SwipeCard';
import type { PublicProfile } from '@/api/types';
import { colors, fonts, palette } from '@/theme';

export type SwipeAction = 'like' | 'pass' | 'superlike';

const { width: W, height: H } = Dimensions.get('window');
const THRESHOLD = W * 0.28;
const OUT = W * 1.4;

export type SwipeDeckHandle = { rewind: (profile: PublicProfile) => void };

interface Props {
  profiles: PublicProfile[];
  onDecision: (profile: PublicProfile, action: SwipeAction) => void;
  onExhausted?: () => void;
  onOpen?: (profile: PublicProfile) => void;
  onBoost?: () => void;
  onRewind?: () => void;
}

export const SwipeDeck = forwardRef<SwipeDeckHandle, Props>(function SwipeDeck(
  { profiles, onDecision, onExhausted, onOpen, onBoost, onRewind },
  ref
) {
  const [cards, setCards] = useState<PublicProfile[]>(profiles);
  const [index, setIndex] = useState(0);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  // Reset when a fresh feed is loaded.
  useEffect(() => {
    setCards(profiles);
    setIndex(0);
  }, [profiles]);

  useEffect(() => {
    if (index >= cards.length && cards.length > 0) onExhausted?.();
  }, [index, cards.length, onExhausted]);

  // Bring a rewound profile back as the current card.
  useImperativeHandle(ref, () => ({
    rewind: (profile: PublicProfile) => {
      tx.value = 0;
      ty.value = 0;
      setCards((prev) => {
        const nextCards = [...prev];
        nextCards.splice(index, 0, profile);
        return nextCards;
      });
    },
  }));

  const commit = useCallback(
    (action: SwipeAction) => {
      const profile = cards[index];
      tx.value = 0;
      ty.value = 0;
      setIndex((i) => i + 1);
      if (profile) onDecision(profile, action);
    },
    [index, cards, onDecision, tx, ty]
  );

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY;
    })
    .onEnd(() => {
      if (tx.value > THRESHOLD) {
        tx.value = withTiming(OUT, { duration: 250 }, (f) => f && runOnJS(commit)('like'));
      } else if (tx.value < -THRESHOLD) {
        tx.value = withTiming(-OUT, { duration: 250 }, (f) => f && runOnJS(commit)('pass'));
      } else {
        tx.value = withSpring(0);
        ty.value = withSpring(0);
      }
    });

  const fling = (action: SwipeAction) => {
    if (action === 'superlike') {
      ty.value = withTiming(-H * 1.3, { duration: 320 }, (f) => f && runOnJS(commit)('superlike'));
    } else {
      const dir = action === 'like' ? 1 : -1;
      tx.value = withTiming(dir * OUT, { duration: 280 }, (f) => f && runOnJS(commit)(action));
    }
  };

  const topStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { rotate: `${interpolate(tx.value, [-W, W], [-11, 11], Extrapolation.CLAMP)}deg` },
    ],
  }));

  const nextStyle = useAnimatedStyle(() => {
    const progress = Math.min(Math.abs(tx.value) / THRESHOLD, 1);
    return {
      transform: [{ scale: interpolate(progress, [0, 1], [0.94, 1]) }],
      opacity: interpolate(progress, [0, 1], [0.6, 1]),
    };
  });

  const likeStamp = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [0, THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));
  const passStamp = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [-THRESHOLD, 0], [1, 0], Extrapolation.CLAMP),
  }));

  if (index >= cards.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>You’re all caught up</Text>
        <Text style={styles.emptyBody}>
          New people join Pakiza every day. Check back soon for more meaningful matches.
        </Text>
      </View>
    );
  }

  const next = cards[index + 1];

  return (
    <View style={styles.root}>
      <View style={styles.deck}>
        {next ? (
          <Animated.View style={[styles.cardWrap, nextStyle]} pointerEvents="none">
            <SwipeCard profile={next} />
          </Animated.View>
        ) : null}

        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.cardWrap, topStyle]}>
            <SwipeCard profile={cards[index]} />

            {onOpen ? (
              <Pressable
                onPress={() => onOpen(cards[index])}
                hitSlop={8}
                style={styles.infoBtn}
              >
                <Ionicons name="chevron-up" size={18} color={palette.cream} />
                <Text style={styles.infoText}>View profile</Text>
              </Pressable>
            ) : null}

            <Animated.View style={[styles.stamp, styles.stampLike, likeStamp]}>
              <Text style={[styles.stampText, { color: colors.like }]}>LIKE</Text>
            </Animated.View>
            <Animated.View style={[styles.stamp, styles.stampPass, passStamp]}>
              <Text style={[styles.stampText, { color: palette.muted }]}>PASS</Text>
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      </View>

      <View style={styles.actions}>
        {onRewind ? <CircleButton glyph="↺" color={palette.gold} small onPress={onRewind} /> : null}
        <CircleButton glyph="✕" color={palette.sienna} onPress={() => fling('pass')} />
        {onBoost ? <CircleButton glyph="⚡" color={palette.navy} small onPress={onBoost} /> : null}
        <CircleButton glyph="★" color={palette.gold} small onPress={() => fling('superlike')} />
        <CircleButton glyph="♥" color={palette.burgundy} onPress={() => fling('like')} />
      </View>
    </View>
  );
});

function CircleButton({
  glyph,
  color,
  onPress,
  small,
}: {
  glyph: string;
  color: string;
  onPress: () => void;
  small?: boolean;
}) {
  const size = small ? 54 : 66;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, borderColor: color },
        pressed && { transform: [{ scale: 0.92 }], backgroundColor: 'rgba(0,0,0,0.03)' },
      ]}
    >
      <Text style={[styles.circleGlyph, { color, fontSize: small ? 22 : 28 }]}>{glyph}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  deck: { flex: 1 },
  cardWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
    paddingTop: 18,
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.white,
    borderWidth: 2,
    shadowColor: '#3D0010',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  circleGlyph: { fontWeight: '700', marginTop: -1 },
  stamp: {
    position: 'absolute',
    top: 36,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  stampLike: { left: 24, transform: [{ rotate: '-14deg' }], borderColor: colors.like },
  stampPass: { right: 24, transform: [{ rotate: '14deg' }], borderColor: palette.muted },
  stampText: { fontFamily: fonts.bodySemibold, fontSize: 26, letterSpacing: 2 },
  infoBtn: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(26,16,18,0.45)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  infoText: { fontFamily: fonts.bodyMedium, color: palette.cream, fontSize: 12.5 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 30, color: palette.burgundy, marginBottom: 10 },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: palette.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
