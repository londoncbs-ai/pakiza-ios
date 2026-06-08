import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { BrandBackground } from './BrandBackground';
import { Wordmark } from './Wordmark';
import { fonts, palette, spacing } from '@/theme';

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
              <Text style={styles.backText}>‹  Back</Text>
            </Pressable>
          ) : (
            <View style={{ height: 24 }} />
          )}

          {showWordmark ? (
            <View style={styles.brand}>
              <Wordmark size={40} />
            </View>
          ) : null}

          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

          <View style={styles.form}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </BrandBackground>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: spacing.xl },
  back: { paddingVertical: 6 },
  backText: { color: 'rgba(245,240,230,0.85)', fontFamily: fonts.bodyMedium, fontSize: 15 },
  brand: { alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.xl },
  title: {
    fontFamily: fonts.display,
    color: palette.cream,
    fontSize: 36,
    lineHeight: 40,
  },
  subtitle: {
    fontFamily: fonts.body,
    color: 'rgba(245,240,230,0.75)',
    fontSize: 15,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    lineHeight: 21,
  },
  form: { marginTop: spacing.sm },
});
