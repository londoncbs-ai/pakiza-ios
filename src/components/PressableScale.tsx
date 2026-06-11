import React from 'react';
import { Pressable, type PressableProps, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { durations } from '@/theme';
import { haptics } from '@/lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends PressableProps {
  /** Scale to shrink to while pressed. */
  scaleTo?: number;
  /** Fire a light haptic on press-in. Default true. */
  haptic?: boolean;
  style?: ViewStyle | ViewStyle[];
}

/**
 * A Pressable that springs down to `scaleTo` while held - the universal
 * "this is tappable" feedback the app was missing everywhere outside the deck.
 * Respects Reduce Motion. Drop-in replacement for <Pressable>.
 */
export function PressableScale({
  scaleTo = 0.97,
  haptic = true,
  onPressIn,
  onPressOut,
  style,
  children,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const reduced = useReducedMotion();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reduced ? 1 : scale.value }],
  }));

  return (
    <AnimatedPressable
      onPressIn={(e) => {
        scale.value = withTiming(scaleTo, { duration: durations.fast });
        if (haptic) haptics.selection();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withTiming(1, { duration: durations.base });
        onPressOut?.(e);
      }}
      style={[style, animatedStyle]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
