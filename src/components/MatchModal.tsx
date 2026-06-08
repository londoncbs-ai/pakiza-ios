import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { Button } from './Button';
import { Wordmark } from './Wordmark';
import type { PublicProfile } from '@/api/types';
import { fonts, palette, spacing } from '@/theme';

export function MatchModal({
  profile,
  onClose,
}: {
  profile: PublicProfile | null;
  onClose: () => void;
}) {
  const photo = profile?.photos?.find((p) => p.is_primary)?.cdn_url ?? profile?.photos?.[0]?.cdn_url;

  return (
    <Modal visible={!!profile} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Text style={styles.heart}>♥</Text>
        <Text style={styles.title}>It’s a match</Text>
        <Text style={styles.sub}>
          You and {profile?.display_name} have shown interest in one another.
        </Text>

        {photo ? <Image source={{ uri: photo }} style={styles.avatar} contentFit="cover" /> : null}

        <View style={styles.actions}>
          <Button label="Send a hello" variant="secondary" onPress={onClose} />
          <Button label="Keep browsing" variant="outline" onPress={onClose} style={{ marginTop: spacing.md }} />
        </View>

        <View style={styles.brand}>
          <Wordmark size={26} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(61,0,16,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  heart: { fontSize: 56, color: palette.gold, marginBottom: spacing.sm },
  title: { fontFamily: fonts.display, fontSize: 48, color: palette.cream },
  sub: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: 'rgba(245,240,230,0.8)',
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: palette.gold,
    marginBottom: spacing.xxl,
  },
  actions: { width: '100%' },
  brand: { marginTop: spacing.xxl, opacity: 0.7 },
});
