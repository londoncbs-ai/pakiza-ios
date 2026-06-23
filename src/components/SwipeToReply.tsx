import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { haptics } from '@/lib/haptics';
import { palette } from '@/theme';

interface SwipeToReplyProps {
  /** True for the current user's own bubble (it sits on the right). */
  mine: boolean;
  /** Fired once when the bubble is dragged past the reply threshold. */
  onReply: () => void;
  children: ReactNode;
}

const THRESHOLD = 56;
const MAX_DRAG = 84;

/**
 * Wraps a message bubble in a horizontal pan. Dragging it inward past a small
 * threshold reveals a reply chevron, fires a light haptic and calls onReply on
 * release; the bubble then springs back. Vertical scrolling is unaffected -
 * the gesture only activates on a clear horizontal drag. Respects Reduce Motion.
 */
export function SwipeToReply({ mine, onReply, children }: SwipeToReplyProps) {
  const reduced = useReducedMotion();
  const tx = useSharedValue(0);
  const triggered = useSharedValue(false);

  // Own bubbles swipe left (negative); peer bubbles swipe right (positive).
  const dir = mine ? -1 : 1;

  const fire = () => {
    haptics.light();
    onReply();
  };

  const pan = Gesture.Pan()
    .activeOffsetX(mine ? -12 : 12)
    .failOffsetX(mine ? 12 : -12)
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      const raw = e.translationX * dir;
      const clamped = Math.max(0, Math.min(raw, MAX_DRAG));
      tx.value = clamped * dir;
      if (clamped >= THRESHOLD && !triggered.value) {
        triggered.value = true;
        runOnJS(fire)();
      } else if (clamped < THRESHOLD) {
        triggered.value = false;
      }
    })
    .onEnd(() => {
      triggered.value = false;
      tx.value = reduced ? 0 : withTiming(0, { duration: 160 });
    });

  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
  }));

  const iconStyle = useAnimatedStyle(() => {
    const progress = Math.min(1, Math.abs(tx.value) / THRESHOLD);
    return { opacity: progress, transform: [{ scale: 0.7 + progress * 0.3 }] };
  });

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.icon, mine ? styles.iconMine : styles.iconTheirs, iconStyle]}>
        <Ionicons name="arrow-undo" size={18} color={palette.burgundy} />
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={bubbleStyle}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { justifyContent: 'center' },
  icon: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  iconMine: { right: 8 },
  iconTheirs: { left: 8 },
});
