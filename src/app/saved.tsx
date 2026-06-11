import { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { matchesApi } from '@/api/matches';
import type { PublicProfile } from '@/api/types';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { IntroductionCard } from '@/components/IntroductionCard';
import { InterestModal } from '@/components/InterestModal';
import { PressableScale } from '@/components/PressableScale';
import { Text } from '@/components/Text';
import { haptics } from '@/lib/haptics';
import { savedStore } from '@/lib/savedStore';
import { palette, radii, shadow, spacing, surfaces } from '@/theme';

export default function Saved() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [items, setItems] = useState<PublicProfile[]>([]);
  const [opened, setOpened] = useState<PublicProfile | null>(null);
  const [matched, setMatched] = useState<PublicProfile | null>(null);

  const refresh = useCallback(() => {
    savedStore.list().then(setItems);
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const remove = useCallback(async (userId: string) => {
    await savedStore.remove(userId);
    setOpened((o) => (o?.user_id === userId ? null : o));
    refresh();
  }, [refresh]);

  const onInterest = useCallback(async (p: PublicProfile) => {
    try {
      const res = await matchesApi.like(p.user_id);
      await savedStore.remove(p.user_id);
      setOpened(null);
      refresh();
      if (res.is_matched) {
        haptics.success();
        setMatched(res.matched_profile ?? p);
      } else {
        haptics.light();
      }
    } catch (err: any) {
      const sc = err?.response?.status;
      if (sc === 429 || sc === 403 || sc === 402) {
        haptics.warning();
        setOpened(null);
        router.push('/premium');
      }
    }
  }, [refresh, router]);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ width: 30 }}>
          <Ionicons name="chevron-back" size={26} color={palette.burgundy} />
        </Pressable>
        <Text variant="heading" tone="burgundy">Saved</Text>
        <View style={{ width: 30 }} />
      </View>

      {items.length === 0 ? (
        <EmptyState
          icon="bookmark-outline"
          title="Nothing saved yet"
          message="Tap Save on someone in Discover to set them aside and revisit them here when you're ready."
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}>
          <Text variant="footnote" tone="muted" style={{ marginBottom: spacing.md }}>
            People you've set aside to consider. They won't know you saved them.
          </Text>
          {items.map((p) => {
            const photo = p.photos?.find((x) => x.is_primary)?.cdn_url ?? p.photos?.[0]?.cdn_url;
            return (
              <PressableScale key={p.user_id} style={styles.row} onPress={() => setOpened(p)} haptic={false}>
                {photo ? (
                  <Image source={{ uri: photo }} style={styles.thumb} contentFit="cover" />
                ) : (
                  <View style={[styles.thumb, styles.ph]}>
                    <Text variant="title" color={palette.goldSoft}>{p.display_name[0]}</Text>
                  </View>
                )}
                <View style={styles.rowBody}>
                  <Text variant="subhead" tone="default">
                    {p.display_name}{p.age ? `, ${p.age}` : ''}
                  </Text>
                  {p.city ? <Text variant="footnote" tone="muted">{p.city}</Text> : null}
                  {p.compatibility != null ? (
                    <Text variant="footnote" tone="gold" style={{ marginTop: 2 }}>{p.compatibility}% match</Text>
                  ) : null}
                </View>
                <Pressable onPress={() => remove(p.user_id)} hitSlop={10} style={styles.removeBtn}>
                  <Ionicons name="close" size={18} color={palette.muted} />
                </Pressable>
              </PressableScale>
            );
          })}
        </ScrollView>
      )}

      {/* Full review of a saved profile */}
      <Modal visible={!!opened} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpened(null)}>
        {opened ? (
          <View style={styles.sheet}>
            <View style={[styles.sheetHeader, { paddingTop: spacing.md }]}>
              <Pressable onPress={() => setOpened(null)} hitSlop={12}>
                <Ionicons name="chevron-down" size={26} color={palette.burgundy} />
              </Pressable>
            </View>
            <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
              <IntroductionCard profile={opened} onActioned={() => setOpened(null)} />
            </View>
            <View style={[styles.sheetBar, { paddingBottom: insets.bottom + spacing.sm }]}>
              <Button label="Remove" variant="ghost" onPress={() => remove(opened.user_id)} style={{ flex: 1 }} />
              <Button label="Express interest" variant="primary" onPress={() => onInterest(opened)} style={{ flex: 1.4 }} />
            </View>
          </View>
        ) : null}
      </Modal>

      <InterestModal
        profile={matched}
        onClose={() => setMatched(null)}
        onMessage={() => { setMatched(null); router.push('/(app)/messages'); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: surfaces.raised,
    borderRadius: radii.lg,
    padding: spacing.sm,
    marginBottom: spacing.md,
    ...shadow.soft,
  },
  thumb: { width: 60, height: 76, borderRadius: radii.md },
  ph: { backgroundColor: palette.burgundy, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, marginLeft: spacing.md },
  removeBtn: { padding: spacing.sm },
  sheet: { flex: 1, backgroundColor: palette.cream },
  sheetHeader: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  sheetBar: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});
