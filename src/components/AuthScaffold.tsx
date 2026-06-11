import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { BrandBackground } from './BrandBackground';
import { Text } from './Text';
import { Wordmark } from './Wordmark';
import { palette, spacing } from '@/theme';

interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  showBack?: boolean;
  showWordmark?: boolean;
}

export function AuthScaffold({ title, subtitle, children, showBack = true, showWordmark = true }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <BrandBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {showBack && router.canGoBack() ? (
            <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
              <Ionicons name="chevron-back" size={20} color={palette.cream} />
              <Text variant="callout" tone="onDark" style={styles.backText}>
                Back
              </Text>
            </Pressable>
          ) : (
            <View style={{ height: 28 }} />
          )}

          {showWordmark ? (
            <View style={styles.brand}>
              <Wordmark size={40} />
            </View>
          ) : null}

          <Text variant="display" tone="onDark" style={styles.title}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="callout" tone="onDarkMuted" style={styles.subtitle}>
              {subtitle}
            </Text>
          ) : null}

          <View style={styles.form}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </BrandBackground>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: spacing.xl },
  back: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, marginLeft: -4 },
  backText: { marginLeft: 2 },
  brand: { alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.xxl },
  title: { fontSize: 34, lineHeight: 40 },
  subtitle: { marginTop: spacing.sm, marginBottom: spacing.xxl },
  form: { marginTop: spacing.xs },
});
