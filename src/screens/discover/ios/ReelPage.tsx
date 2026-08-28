import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import type { MyProfile, PublicProfile } from '@/api/types';
import { ProfileBadges } from '@/components/PlanBadge';
import { PressableScale } from '@/components/PressableScale';
import { SafetySheet } from '@/components/SafetySheet';
import { Text } from '@/components/Text';
import { FactGrid } from './FactGrid';
import { PhotoPager } from './PhotoPager';
import { commonGround } from '@/lib/commonGround';
import { photoBlurRadius, sortedPhotos } from '@/lib/photos';
import { haptics } from '@/lib/haptics';
import { colors, fonts, hexA, palette, radii, spacing, springs, tint, useTheme } from '@/theme';

/** How far the photograph drifts against the scroll. Subtle on purpose. */
const PARALLAX = 0.1;
/** Fallback share of the page for the photograph, until the bar has measured. */
const PHOTO_RATIO = 0.75;

/**
 * One member, filling the screen.
 *
 * The photograph takes everything the bar does not, and the bar is sized by its
 * own contents, so it can neither clip a button nor open up a field of empty
 * space. It holds the two decisions worth making deliberately - express
 * interest, and save - and an instruction to pull it up for the whole profile.
 *
 * Scrolling on records a pass, so the outcome is drawn LIVE as the page leaves:
 * a colour wash and a word that both track the scroll itself, reaching full
 * strength while the page is still on screen. Nothing plays after the fact,
 * because an animation the member has already scrolled past teaches nothing.
 */
export function ReelPage({
  profile,
  mine,
  prefsSet,
  height,
  width,
  index,
  scrollY,
  first,
  outcome,
  busy,
  canSave,
  saved,
  onInterest,
  onSave,
  onRemoved,
  onExpandedChange,
}: {
  profile: PublicProfile;
  mine: MyProfile | null;
  prefsSet: boolean;
  height: number;
  width: number;
  index: number;
  scrollY: SharedValue<number>;
  first: boolean;
  /** What leaving this page will mean. Interest is sent before the scroll. */
  outcome: 'interest' | 'pass';
  busy?: boolean;
  canSave: boolean;
  saved: boolean;
  onInterest: () => void;
  onSave: () => void;
  onRemoved: () => void;
  onExpandedChange: (open: boolean) => void;
}) {
  const { c, isDark } = useTheme();
  const reduced = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);

  // The bar sits under the photograph in normal flow and the photograph takes
  // whatever is left, so no arithmetic can disagree with the layout. Only the
  // photograph is measured, and only so the pager has concrete pixels.
  const [photoH, setPhotoH] = useState(Math.round(height * PHOTO_RATIO));
  const driftH = Math.round(photoH * (1 + PARALLAX * 2));

  const open = useSharedValue(0);

  const setExpandedJS = useCallback(
    (v: boolean) => {
      setExpanded(v);
      onExpandedChange(v);
    },
    [onExpandedChange]
  );

  const expand = useCallback(() => {
    haptics.selection();
    setExpandedJS(true);
    open.value = reduced ? 1 : withSpring(1, springs.calm);
  }, [open, reduced, setExpandedJS]);

  const collapse = useCallback(() => {
    setExpandedJS(false);
    open.value = reduced ? 0 : withSpring(0, springs.calm);
  }, [open, reduced, setExpandedJS]);

  // Scrolling away must not leave a profile standing open behind you.
  useEffect(() => () => { open.value = 0; }, [open]);

  // ── Motion ───────────────────────────────────────────────────────────────
  const offset = useDerivedValue(() => scrollY.value - index * height);

  /**
   * 0 while this page is settled, 1 by the time it is a third of the way out.
   * It has to peak early: past halfway the top of the page is already above the
   * viewport, and an overlay the member cannot see is not feedback.
   */
  const leaving = useDerivedValue(() =>
    height === 0 ? 0 : interpolate(offset.value, [0, height * 0.3], [0, 1], Extrapolation.CLAMP)
  );

  const photoStyle = useAnimatedStyle(() => {
    if (reduced || height === 0) return {};
    const drift = interpolate(offset.value, [-height, 0, height], [-photoH * PARALLAX, 0, photoH * PARALLAX]);
    const push = interpolate(open.value, [0, 1], [1, 0.94]); // settles back as the profile rises
    return { transform: [{ translateY: drift }, { scale: push }] };
  });

  const photoDim = useAnimatedStyle(() => ({ opacity: open.value * 0.45 }));

  // The outcome, drawn live against the scroll.
  const washStyle = useAnimatedStyle(() => ({ opacity: leaving.value * 0.5 }));
  const verdictStyle = useAnimatedStyle(() => ({
    opacity: interpolate(leaving.value, [0.12, 0.5], [0, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(leaving.value, [0.12, 0.6], [0.94, 1], Extrapolation.CLAMP) }],
  }));

  // Fully below the screen when closed. Parking it at `height - barH` put its
  // own header exactly over the bar and hid the buttons underneath it.
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(open.value, [0, 1], [height, 0]) }],
  }));

  const barStyle = useAnimatedStyle(() => ({
    opacity: interpolate(open.value, [0, 0.35], [1, 0], Extrapolation.CLAMP),
  }));

  /**
   * The profile opens on a TAP, never a drag.
   *
   * Dragging up to open and scrolling up to move on are the same gesture on the
   * same surface, so no amount of arbitration stops a member confusing them -
   * and getting it wrong passed the very person they were trying to read. The
   * vertical drag now belongs to paging alone.
   *
   * Only the open sheet drags, downward, to close. The list is frozen while it
   * is open, so nothing contends with it.
   */
  const sheetPan = Gesture.Pan()
    .activeOffsetY([12, 1e9])
    .onUpdate((e) => {
      if (e.translationY <= 0) return;
      open.value = Math.max(0, 1 - e.translationY / Math.max(height, 1));
    })
    .onEnd((e) => {
      const stayOpen = !(e.translationY > height * 0.2 || e.velocityY > 800);
      open.value = withSpring(stayOpen ? 1 : 0, springs.calm);
      runOnJS(setExpandedJS)(stayOpen);
    });

  // ── Content ──────────────────────────────────────────────────────────────
  const sub = [profile.occupation, profile.city].filter(Boolean).join('  ·  ');
  const ground = commonGround(mine, profile, prefsSet);
  const firstName = profile.display_name.split(' ')[0];
  const photos = sortedPhotos(profile.photos);

  const sentInterest = outcome === 'interest';
  const washColor = sentInterest ? palette.gold : colors.danger;
  const verdictWord = sentInterest ? 'Interest sent' : 'Not a match';
  const verdictInk = sentInterest ? palette.burgundyDeep : palette.cream;

  return (
    <View style={{ height, overflow: 'hidden' }}>
      <View
        style={styles.photoBox}
        onLayout={(e: LayoutChangeEvent) => setPhotoH(Math.round(e.nativeEvent.layout.height))}
      >
        <Animated.View
          style={[styles.photoLayer, { height: driftH, top: -(driftH - photoH) / 2 }, photoStyle]}
        >
          <PhotoPager photos={profile.photos} name={profile.display_name} width={width} height={driftH} />
        </Animated.View>

        <LinearGradient
          colors={[hexA(palette.burgundyDeep, 0), hexA(palette.burgundyDeep, 0.28), hexA(palette.burgundyDeep, 0.66)]}
          locations={[0, 0.6, 1]}
          style={styles.scrim}
          pointerEvents="none"
        />

        <Animated.View style={[StyleSheet.absoluteFill, styles.black, photoDim]} pointerEvents="none" />

        <View style={styles.badgeCol} pointerEvents="none">
          <ProfileBadges profile={profile} />
        </View>

        {first ? <ScrollHint /> : null}

        {/* The outcome, tracking the scroll rather than following it. It stays
            on the photograph so the bar and its buttons are never tinted, and
            sits low, because the bottom of the photograph is the last part
            still on screen while the page is leaving. */}
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: washColor }, washStyle]}
          pointerEvents="none"
        />
        <Animated.View style={[styles.verdictWrap, verdictStyle]} pointerEvents="none">
          <View style={[styles.verdict, { backgroundColor: washColor }]}>
            <Text variant="label" color={verdictInk} style={styles.verdictText}>
              {verdictWord}
            </Text>
          </View>
        </Animated.View>
      </View>

      {/* The bar: sized by its contents */}
      <Animated.View style={barStyle} pointerEvents={expanded ? 'none' : 'auto'}>
          <LinearGradient
            colors={isDark ? [c.surface, c.surface] : [c.surface, c.surfaceAlt]}
            style={[styles.bar, { borderTopColor: hexA(palette.gold, 0.55) }]}
          >
            <Pressable
              onPress={expand}
              accessibilityRole="button"
              accessibilityLabel={`Open ${profile.display_name}'s profile`}
            >
              <View style={[styles.grab, { backgroundColor: c.borderStrong }]} />
              <View style={styles.nameRow}>
                <Text variant="heading" tone="accent" numberOfLines={1} style={styles.name}>
                  {profile.display_name}
                </Text>
                {profile.age ? <Text variant="subhead" tone="muted">{profile.age}</Text> : null}
              </View>
              {sub ? <Text variant="callout" tone="muted" numberOfLines={1}>{sub}</Text> : null}
            </Pressable>

            <Decisions
              profile={profile}
              busy={busy}
              canSave={canSave}
              saved={saved}
              sent={sentInterest}
              onInterest={onInterest}
              onSave={onSave}
            />

            <Pressable onPress={expand} hitSlop={8} style={styles.hintRow} accessibilityRole="button">
              <Ionicons name="person-circle-outline" size={15} color={c.accent} />
              <Text variant="footnote" tone="accent">{`Tap to read ${firstName}'s full profile`}</Text>
            </Pressable>
        </LinearGradient>
      </Animated.View>

      {/* The profile, grown from the bar */}
      <Animated.View style={[styles.sheet, { height }, sheetStyle]} pointerEvents={expanded ? 'auto' : 'none'}>
        <LinearGradient
          colors={isDark ? [c.surface, c.surface] : [c.surface, c.surfaceAlt]}
          style={[styles.sheetInner, { borderTopColor: hexA(palette.gold, 0.55) }]}
        >
          {/* Only the handle and the heading drag the sheet. Anything else and
              the body could not be scrolled. */}
          <GestureDetector gesture={sheetPan}>
            <View>
              <View style={[styles.grab, { backgroundColor: c.borderStrong }]} />
              <View style={styles.sheetHead}>
              <View style={{ flex: 1 }}>
                <Text variant="title" tone="accent" numberOfLines={1}>
                  {profile.display_name}
                  {profile.age ? <Text variant="heading" tone="muted">{`  ${profile.age}`}</Text> : null}
                </Text>
                {sub ? <Text variant="callout" tone="muted" numberOfLines={1}>{sub}</Text> : null}
              </View>
                <PressableScale
                  scaleTo={0.94}
                  hitSlop={10}
                  onPress={collapse}
                  accessibilityRole="button"
                  accessibilityLabel="Close profile"
                  style={[styles.close, { backgroundColor: c.accentFaint }]}
                >
                  <Ionicons name="chevron-down" size={18} color={c.accent} />
                </PressableScale>
              </View>
            </View>
          </GestureDetector>

          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetScroll}
          >
              {expanded ? (
                <Animated.View entering={reduced ? undefined : FadeIn.duration(220).delay(90)}>
                  {photos.length > 0 ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.gallery}
                    >
                      {photos.map((ph) => (
                        <Image
                          key={ph.id}
                          source={{ uri: ph.cdn_url }}
                          style={styles.galleryShot}
                          contentFit="cover"
                          contentPosition="top center"
                          transition={160}
                          blurRadius={photoBlurRadius(ph)}
                        />
                      ))}
                    </ScrollView>
                  ) : null}

                  {ground.length > 0 ? (
                    <View style={[styles.ground, { backgroundColor: c.accentFaint, borderColor: hexA(palette.gold, 0.3) }]}>
                      {ground.slice(0, 5).map((g) => (
                        <View key={g.key} style={styles.groundRow}>
                          <Ionicons name={g.icon} size={17} color={c.accent} />
                          <Text variant="callout" style={styles.groundText}>{g.text}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {profile.bio ? (
                    <View style={[styles.quote, { backgroundColor: c.goldFaint }]}>
                      <Text variant="heading" style={styles.quoteText}>{`“${profile.bio.trim()}”`}</Text>
                    </View>
                  ) : null}

                  <FactGrid profile={profile} mine={mine} style={{ marginTop: spacing.lg }} />

                  <Pressable onPress={() => setSafetyOpen(true)} style={styles.report} hitSlop={8}>
                    <Ionicons name="flag-outline" size={14} color={c.textSubtle} />
                    <Text variant="footnote" tone="subtle">{`Report or block ${firstName}`}</Text>
                  </Pressable>
                </Animated.View>
              ) : null}
            </ScrollView>

            <View style={[styles.sheetActions, { borderTopColor: c.border }]}>
              <Decisions
                profile={profile}
                busy={busy}
                canSave={canSave}
                saved={saved}
                sent={sentInterest}
                onInterest={onInterest}
                onSave={onSave}
              />
            </View>
        </LinearGradient>
      </Animated.View>

      <SafetySheet
        userId={profile.user_id}
        name={profile.display_name}
        visible={safetyOpen}
        onClose={() => setSafetyOpen(false)}
        onActioned={() => {
          setSafetyOpen(false);
          onRemoved();
        }}
      />
    </View>
  );
}

/**
 * The two deliberate choices. Passing is the scroll, so it is not a button:
 * what is left is the one worth making and the way to keep somebody for later.
 * Both are present whether the profile is open or closed.
 */
function Decisions({
  profile,
  busy,
  canSave,
  saved,
  sent,
  onInterest,
  onSave,
}: {
  profile: PublicProfile;
  busy?: boolean;
  canSave: boolean;
  saved: boolean;
  sent: boolean;
  onInterest: () => void;
  onSave: () => void;
}) {
  const { c } = useTheme();
  return (
    <View style={styles.acts}>
      <PressableScale
        scaleTo={0.96}
        onPress={onInterest}
        disabled={busy || sent}
        accessibilityRole="button"
        accessibilityLabel={sent ? 'Interest already sent' : `Express interest in ${profile.display_name}`}
        style={styles.interestWrap}
      >
        <LinearGradient
          colors={sent ? [palette.gold, palette.goldSoft] : [palette.burgundy, palette.burgundyDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.interest}
        >
          <Ionicons
            name={sent ? 'checkmark-circle' : 'mail-outline'}
            size={17}
            color={sent ? palette.burgundyDeep : palette.cream}
          />
          <Text
            variant="callout"
            color={sent ? palette.burgundyDeep : palette.cream}
            style={styles.interestText}
          >
            {sent ? 'Interest sent' : 'Express interest'}
          </Text>
        </LinearGradient>
      </PressableScale>

      <PressableScale
        scaleTo={0.94}
        onPress={onSave}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={saved ? `${profile.display_name} is saved` : `Save ${profile.display_name}`}
        style={[
          styles.save,
          { backgroundColor: saved ? c.accent : c.surface, borderColor: saved ? c.accent : c.borderStrong },
        ]}
      >
        <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={19} color={saved ? palette.cream : c.accent} />
        {!canSave ? (
          <View style={[styles.lock, { backgroundColor: c.accent, borderColor: c.surface }]}>
            <Ionicons name="lock-closed" size={7} color={palette.cream} />
          </View>
        ) : null}
      </PressableScale>
    </View>
  );
}

/** A chevron that breathes, shown once on the first person. */
function ScrollHint() {
  const reduced = useReducedMotion();
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    y.value = withRepeat(withTiming(-5, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [y, reduced]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <Animated.View style={[styles.hint, style]} pointerEvents="none">
      <Ionicons name="chevron-up" size={13} color={palette.cream} />
      <Text variant="footnote" color={palette.cream}>Scroll up to pass</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  photoBox: { flex: 1, width: '100%', overflow: 'hidden', backgroundColor: palette.burgundyDark },
  photoLayer: { position: 'absolute', left: 0, right: 0 },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '40%' },
  black: { backgroundColor: '#000' },

  badgeCol: { position: 'absolute', top: 30, left: 14, alignItems: 'flex-start', gap: 6 },
  hint: {
    position: 'absolute',
    top: 30,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: tint.overlayStrong,
    borderRadius: radii.pill,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },

  verdictWrap: { position: 'absolute', left: 0, right: 0, bottom: 24, alignItems: 'center' },
  verdict: { borderRadius: radii.pill, paddingHorizontal: 20, paddingVertical: 10 },
  verdictText: { fontSize: 14, letterSpacing: 1.4 },

  bar: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: 8,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  grab: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  name: { flexShrink: 1 },
  hintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },

  acts: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  interestWrap: { flex: 1, height: 50, borderRadius: radii.pill, overflow: 'hidden' },
  interest: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  interestText: { fontFamily: fonts.bodySemibold },
  save: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lock: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  sheetInner: {
    flex: 1,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    paddingTop: 8,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  close: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  sheetScroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  gallery: { gap: spacing.sm, paddingBottom: spacing.lg },
  galleryShot: { width: 132, height: 176, borderRadius: radii.md },

  ground: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  groundRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 9 },
  groundText: { flex: 1, lineHeight: 21 },

  quote: {
    marginTop: spacing.lg,
    borderRadius: radii.lg,
    borderLeftWidth: 1.5,
    borderLeftColor: hexA(palette.gold, 0.45),
    paddingVertical: spacing.md,
    paddingRight: spacing.md,
    paddingLeft: 14,
  },
  quoteText: { lineHeight: 30 },

  report: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.xl,
  },
  sheetActions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
