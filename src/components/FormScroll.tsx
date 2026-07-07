import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

type Props = React.ComponentProps<typeof KeyboardAwareScrollView>;

/**
 * Keyboard-aware scroll container for form screens. Unlike a plain
 * KeyboardAvoidingView, it scrolls the focused input into view, so fields
 * near the bottom of a long form are never hidden behind the keyboard.
 *
 * Accepts all ScrollView props; project defaults (extra scroll height,
 * persist taps, hidden indicator) can be overridden per call site.
 */
export function FormScroll({ children, contentContainerStyle, ...rest }: Props) {
  return (
    <KeyboardAwareScrollView
      enableOnAndroid
      extraScrollHeight={Platform.OS === 'ios' ? 32 : 24}
      keyboardShouldPersistTaps="handled"
      keyboardOpeningTime={0}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      {...rest}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
});
