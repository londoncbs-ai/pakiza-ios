import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { Button } from './Button';
import { Text } from './Text';
import { Wordmark } from './Wordmark';
import type { PublicProfile } from '@/api/types';
import { palette, spacing, tint } from '@/theme';

/**
 * Replaces the gamified "It's a match" celebration with a calm, intentional
 * moment. The primary path is to begin a considered conversation - never
 * "keep browsing".
 */
export function InterestModal({
  profile,
  onClose,
  onMessage,
}: {
  profile: PublicProfile | null;
  onClose: () => void;
  onMessage?: () => void;
}) {
  const photo = profile?.photos?.find((p) => p.is_primary)?.cdn_url ?? profile?.photos?.[0]?.cdn_url;
  const firstName = profile?.display_name?.split(' ')[0] ?? 'they';

  return (
    <Modal visible={!!profile} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.avatarWrap}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text variant="display" color={palette.rose}>{firstName[0]}</Text>
            </View>
          )}
          <View style={styles.crest}>
            <Ionicons name="sparkles" size={16} color={palette.cream} />
          </View>
        </View>

        <Text variant="title" color={palette.cream} center style={styles.title}>
          A mutual interest
        </Text>
        <Text variant="body" color={tint.onDarkSoft} center style={styles.sub}>
          You and {firstName} have both expressed interest. Begin with a thoughtful introduction, with intention and respect.
        </Text>

        <View style={styles.actions}>
          <Button label="Begin the conversation" variant="secondary" onPress={onMessage ?? onClose} />
          <Button label="Maybe later" variant="outline" onPress={onClose} style={{ marginTop: spacing.md }} />
        </View>

        <View style={styles.brand}>
          <Wordmark size={24} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: tint.overlayStrong,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  avatarWrap: { marginBottom: spacing.xl },
  avatar: {
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 3,
    borderColor: palette.rose,
  },
  avatarPlaceholder: { backgroundColor: palette.burgundy, alignItems: 'center', justifyContent: 'center' },
  crest: {
    position: 'absolute',
    bottom: -6,
    left: 48, // (132 avatar - 36 crest) / 2
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.rose,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {},
  sub: { marginTop: spacing.sm, marginBottom: spacing.xl, maxWidth: 320, lineHeight: 23 },
  actions: { width: '100%' },
  brand: { marginTop: spacing.xxl, opacity: 0.7 },
});
