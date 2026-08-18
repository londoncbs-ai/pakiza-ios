import React from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet } from 'react-native';

type Props = React.ComponentProps<typeof ScrollView>;

/**
 * Keyboard-aware scroll container for form screens: a plain ScrollView inside
 * a KeyboardAvoidingView (behavior "padding", same as the chat screens), so
 * the scroll area shrinks above the keyboard and every field stays reachable.
 *
 * Built on core components only. react-native-keyboard-aware-scroll-view must
 * not come back here: with edge-to-edge Android the window no longer resizes
 * for the keyboard, its focus tracking calls UIManager APIs the new
 * architecture removed, and on Android it overwrote the caller's paddingBottom
 * with 0 until the first keyboard event - which left form screens (profile
 * setup among them) unable to scroll at all.
 */
export function FormScroll({ children, contentContainerStyle, ...rest }: Props) {
  return (
    <KeyboardAvoidingView style={styles.avoid} behavior="padding">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, contentContainerStyle]}
        {...rest}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  avoid: { flex: 1 },
  content: { flexGrow: 1 },
});
