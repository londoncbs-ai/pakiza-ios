import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { getSearchDisplayTitle, getSearchStatusConfig, matchAdvisorsApi } from '@/api/matchAdvisors';
import type { MatchAdvisorOffer, MatchAdvisorRequest } from '@/api/types';
import { Button } from '@/components/Button';
import { ErrorState } from '@/components/ErrorState';
import { Screen } from '@/components/Screen';
import { SkeletonList } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { presentStripePayment } from '@/lib/stripeSheet';
import { palette, radii, shadow, spacing, useTheme } from '@/theme';

export default function RequestDetailsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c, isDark } = useTheme();

  const [req, setReq] = useState<MatchAdvisorRequest | null>(null);
  const [offers, setOffers] = useState<MatchAdvisorOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rename search title state
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renamingTitle, setRenamingTitle] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);

  // Complete search state
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [completing, setCompleting] = useState(false);

  // Stripe payments state
  const [payingDeposit, setPayingDeposit] = useState(false);
  const [payingFinal, setPayingFinal] = useState(false);

  const loadData = async () => {
    if (!params.id) return;
    try {
      setLoading(true);
      setError(null);
      const [r, o] = await Promise.all([
        matchAdvisorsApi.getRequest(params.id),
        matchAdvisorsApi.listOffers(params.id),
      ]);
      setReq(r);
      setOffers(o);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [params.id]);

  const handleCancel = () => {
    Alert.alert(
      'Cancel Matchmaking Search',
      'Are you sure you want to cancel this search request? Your £250 initial deposit was allocated to advisor time and is non-refundable, but you will not be charged the final £250 success fee.',
      [
        { text: 'Keep Search Active', style: 'cancel' },
        {
          text: 'Yes, Cancel Search',
          style: 'destructive',
          onPress: async () => {
            try {
              await matchAdvisorsApi.updateRequest(params.id!, { status: 'cancelled' });
              loadData();
            } catch (err) {
              Alert.alert('Error', errorMessage(err));
            }
          },
        },
      ]
    );
  };

  const handleOpenRename = () => {
    if (!req) return;
    setRenamingTitle(getSearchDisplayTitle(req));
    setShowRenameModal(true);
  };

  const handleSaveTitle = async () => {
    if (!params.id || !renamingTitle.trim()) return;
    setSavingTitle(true);
    try {
      const updated = await matchAdvisorsApi.updateRequest(params.id, {
        request_title: renamingTitle.trim(),
      });
      setReq(updated);
      setShowRenameModal(false);
    } catch (err) {
      Alert.alert('Error', errorMessage(err, 'Could not update title'));
    } finally {
      setSavingTitle(false);
    }
  };

  const handlePayDeposit = async () => {
    if (!req) return;
    setPayingDeposit(true);
    try {
      const session = await matchAdvisorsApi.checkoutDeposit(req.id);
      const paymentIntentId = await presentStripePayment(session);
      const updated = await matchAdvisorsApi.confirmDeposit(req.id, paymentIntentId);
      setReq(updated);
      Alert.alert('Deposit Confirmed', 'Alhamdulillah! Your £250 deposit has been secured. Your Match Advisor will proceed with your search.');
    } catch (err: any) {
      if (err?.name === 'PaymentCancelledError') return;
      Alert.alert('Payment Error', errorMessage(err, 'Could not complete deposit payment.'));
    } finally {
      setPayingDeposit(false);
    }
  };

  const handlePayFinal = async () => {
    if (!req) return;
    setPayingFinal(true);
    try {
      const session = await matchAdvisorsApi.checkoutFinal(req.id);
      const paymentIntentId = await presentStripePayment(session);
      const updated = await matchAdvisorsApi.confirmFinal(req.id, paymentIntentId);
      setReq(updated);
      Alert.alert('Payment Complete', 'Thank you! The final £250 success fee has been confirmed to conclude your case.');
    } catch (err: any) {
      if (err?.name === 'PaymentCancelledError') return;
      Alert.alert('Payment Error', errorMessage(err, 'Could not complete final payment.'));
    } finally {
      setPayingFinal(false);
    }
  };

  const handleCompleteSearch = async () => {
    if (!assignedOffer) {
      Alert.alert('Notice', 'No assigned advisor offer found to complete.');
      return;
    }
    setCompleting(true);
    try {
      await matchAdvisorsApi.completeOffer(assignedOffer.id, rating);
      setShowCompleteModal(false);
      Alert.alert('Search Completed!', 'Alhamdulillah! Your search has been marked as complete. Thank you for your feedback.');
      loadData();
    } catch (err) {
      Alert.alert('Error', errorMessage(err, 'Could not complete search.'));
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <SkeletonList />
      </Screen>
    );
  }

  if (error || !req) {
    return (
      <Screen>
        <ErrorState message={error || 'Case not found'} onRetry={loadData} />
      </Screen>
    );
  }

  const isCancelled = req.status === 'cancelled';
  const isCompleted = req.status === 'completed';
  const assignedOffer = offers.find((o) => o.id === req.selected_offer_id) || offers[0] || null;
  const statusCfg = getSearchStatusConfig(req.status);

  // Determine active step (1: Deposit Secured, 2: Advisor Consultation, 3: Sourcing Candidates, 4: Partner Found)
  // Keyed off req.status (the source of truth used everywhere else), not the
  // narrower offer.status enum, which has no 'active' equivalent and was
  // making this regress to "Advisor Consultation" once the deposit was paid.
  let currentStep = 2;
  if (isCompleted) currentStep = 4;
  else if (isCancelled) currentStep = 1;
  else if (req.status === 'active') currentStep = 3;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: insets.top + spacing.sm,
          paddingBottom: insets.bottom + spacing.xxxl,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.topHeader}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color={c.text} />
          </Pressable>
          <View style={styles.headerTitleWrap}>
            <Pressable onPress={handleOpenRename} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text variant="heading" style={{ fontWeight: '800', flexShrink: 1 }} numberOfLines={1}>
                {getSearchDisplayTitle(req)}
              </Text>
              <Ionicons name="pencil" size={15} color={c.accent} />
            </Pressable>
            <Text variant="footnote" tone="muted">
              Case Ref: #{String(req.id).slice(0, 8).toUpperCase()}
            </Text>
          </View>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: statusCfg.bg },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: statusCfg.color },
              ]}
            />
            <Text
              variant="label"
              style={{
                fontSize: 10,
                fontWeight: '800',
                color: statusCfg.color,
                letterSpacing: 0.5,
              }}
            >
              {statusCfg.short}
            </Text>
          </View>
        </View>

        {/* Announcement Banner if not active */}
        {isCancelled && (
          <View
            style={{
              backgroundColor: 'rgba(194, 65, 12, 0.08)',
              borderRadius: radii.md,
              padding: spacing.md,
              borderWidth: 1,
              borderColor: 'rgba(194, 65, 12, 0.25)',
              marginBottom: spacing.md,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Ionicons name="alert-circle" size={18} color={palette.sienna} />
              <Text variant="subhead" style={{ fontWeight: '700', color: palette.sienna }}>Search Cancelled</Text>
            </View>
            <Text variant="footnote" tone="muted">
              This matchmaking case is no longer active. £250 deposit settled in accordance with platform terms.
            </Text>
          </View>
        )}
        {isCompleted && (
          <View
            style={{
              backgroundColor: 'rgba(217, 119, 6, 0.08)',
              borderRadius: radii.md,
              padding: spacing.md,
              borderWidth: 1,
              borderColor: 'rgba(217, 119, 6, 0.25)',
              marginBottom: spacing.md,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Ionicons name="checkmark-done-circle" size={18} color={palette.gold} />
              <Text variant="subhead" style={{ fontWeight: '700', color: palette.burgundy }}>Search Completed & Closed</Text>
            </View>
            <Text variant="footnote" tone="muted">
              Alhamdulillah! Match confirmed and case successfully concluded.
            </Text>
          </View>
        )}
        {req.status === 'expired' && (
          <View
            style={{
              backgroundColor: 'rgba(100, 116, 139, 0.08)',
              borderRadius: radii.md,
              padding: spacing.md,
              borderWidth: 1,
              borderColor: 'rgba(100, 116, 139, 0.25)',
              marginBottom: spacing.md,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Ionicons name="time" size={18} color="#64748b" />
              <Text variant="subhead" style={{ fontWeight: '700', color: '#64748b' }}>Search Inactive</Text>
            </View>
            <Text variant="footnote" tone="muted">
              The representation period for this search has concluded.
            </Text>
          </View>
        )}

        {/* 4-Step Milestone Stepper */}
        <View
          style={[
            styles.card,
            { backgroundColor: c.surface, borderColor: c.border },
            !isDark ? shadow.soft : undefined,
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
            <Text variant="subhead" style={{ fontWeight: '800' }}>Search Progress</Text>
            <Text variant="footnote" tone="muted">Standard 30-Day Representation</Text>
          </View>

          <View style={styles.stepperContainer}>
            {/* Step 1 */}
            <View style={styles.stepItem}>
              <View style={[styles.stepDot, { backgroundColor: c.success }]}>
                <Ionicons name="checkmark" size={14} color="#FFF" />
              </View>
              <Text variant="label" style={[styles.stepText, { color: c.text, fontWeight: '700' }]}>
                Deposit Secured
              </Text>
              <Text variant="footnote" tone="muted" style={{ fontSize: 10 }}>£250 Paid</Text>
            </View>

            <View style={[styles.stepConnector, { backgroundColor: currentStep >= 2 ? c.success : c.border }]} />

            {/* Step 2 */}
            <View style={styles.stepItem}>
              <View style={[styles.stepDot, { backgroundColor: currentStep >= 2 ? (currentStep === 2 ? palette.burgundy : c.success) : c.border }]}>
                {currentStep > 2 ? (
                  <Ionicons name="checkmark" size={14} color="#FFF" />
                ) : (
                  <Text variant="label" style={{ color: '#FFF', fontWeight: '800', fontSize: 11 }}>2</Text>
                )}
              </View>
              <Text variant="label" style={[styles.stepText, { color: currentStep >= 2 ? c.text : c.textMuted, fontWeight: '700' }]}>
                Consultation
              </Text>
              <Text variant="footnote" tone="muted" style={{ fontSize: 10 }}>1-on-1 Direct</Text>
            </View>

            <View style={[styles.stepConnector, { backgroundColor: currentStep >= 3 ? c.success : c.border }]} />

            {/* Step 3 */}
            <View style={styles.stepItem}>
              <View style={[styles.stepDot, { backgroundColor: currentStep >= 3 ? (currentStep === 3 ? palette.burgundy : c.success) : c.border }]}>
                {currentStep > 3 ? (
                  <Ionicons name="checkmark" size={14} color="#FFF" />
                ) : (
                  <Text variant="label" style={{ color: '#FFF', fontWeight: '800', fontSize: 11 }}>3</Text>
                )}
              </View>
              <Text variant="label" style={[styles.stepText, { color: currentStep >= 3 ? c.text : c.textMuted, fontWeight: '700' }]}>
                Sourcing
              </Text>
              <Text variant="footnote" tone="muted" style={{ fontSize: 10 }}>Vetting</Text>
            </View>

            <View style={[styles.stepConnector, { backgroundColor: currentStep >= 4 ? c.success : c.border }]} />

            {/* Step 4 */}
            <View style={styles.stepItem}>
              <View style={[styles.stepDot, { backgroundColor: currentStep >= 4 ? c.success : c.border }]}>
                {currentStep >= 4 ? (
                  <Ionicons name="checkmark" size={14} color="#FFF" />
                ) : (
                  <Text variant="label" style={{ color: '#FFF', fontWeight: '800', fontSize: 11 }}>4</Text>
                )}
              </View>
              <Text variant="label" style={[styles.stepText, { color: currentStep >= 4 ? c.text : c.textMuted, fontWeight: '700' }]}>
                Completed
              </Text>
              <Text variant="footnote" tone="muted" style={{ fontSize: 10 }}>£250 Balance</Text>
            </View>
          </View>
        </View>

        {/* Assigned Match Advisor Card */}
        <View style={{ marginTop: spacing.lg }}>
          <Text variant="subhead" tone="muted" style={styles.sectionHeader}>
            ASSIGNED MATCH ADVISOR
          </Text>

          {assignedOffer ? (
            <View
              style={[
                styles.card,
                { backgroundColor: c.surface, borderColor: c.border },
                !isDark ? shadow.card : undefined,
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                {assignedOffer.advisor_photo_url ? (
                  <Image
                    source={{ uri: assignedOffer.advisor_photo_url }}
                    style={{ width: 56, height: 56, borderRadius: 28 }}
                    contentFit="cover"
                  />
                ) : (
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: palette.burgundy,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="shield-checkmark" size={26} color={palette.cream} />
                  </View>
                )}

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text variant="subhead" style={{ fontWeight: '800', fontSize: 17 }}>
                      {assignedOffer.advisor_name || 'Your Match Advisor'}
                    </Text>
                    <Ionicons name="checkmark-circle" size={18} color={c.success} />
                  </View>
                  <Text variant="footnote" tone="accent" style={{ marginTop: 2 }}>
                    Private Matchmaking Representative
                  </Text>
                  <Text variant="footnote" tone="muted" style={{ marginTop: 2 }}>
                    Active 1-on-1 Consultation & Candidate Search
                  </Text>
                </View>
              </View>

              <Button
                label="Open Advisor Chat"
                variant="primary"
                style={{ marginTop: spacing.md }}
                onPress={() =>
                  router.push({
                    pathname: '/advisor-chat/[offerId]',
                    params: {
                      offerId: assignedOffer.id,
                      name: assignedOffer.advisor_name || 'Match Advisor',
                      photo: assignedOffer.advisor_photo_url || '',
                    },
                  } as any)
                }
              />
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text variant="subhead" style={{ fontWeight: '700', color: palette.burgundy }}>
                Advisor Assignment Underway
              </Text>
              <Text variant="footnote" tone="muted" style={{ marginTop: 4 }}>
                Your private case has been initialized. A verified Match Advisor is being assigned to review your criteria.
              </Text>
            </View>
          )}
        </View>

        {/* Search Criteria & Preferences Card */}
        <View style={{ marginTop: spacing.lg }}>
          <Text variant="subhead" tone="muted" style={styles.sectionHeader}>
            SEARCH CRITERIA & PREFERENCES
          </Text>

          <View
            style={[
              styles.card,
              { backgroundColor: c.surface, borderColor: c.border },
              !isDark ? shadow.soft : undefined,
            ]}
          >
            <View style={styles.criteriaRow}>
              <View style={styles.criteriaIconWrap}>
                <Ionicons name="heart-outline" size={18} color={palette.burgundy} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="label" tone="muted">PARTNER QUALITIES SOUGHT</Text>
                <Text variant="body" style={{ marginTop: 3, lineHeight: 21 }}>
                  {req.partner_preferences || 'Not specified'}
                </Text>
              </View>
            </View>

            {req.deal_breakers ? (
              <View style={[styles.criteriaRow, { marginTop: spacing.md }]}>
                <View style={styles.criteriaIconWrap}>
                  <Ionicons name="alert-circle-outline" size={18} color={palette.sienna} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="label" tone="muted">DEAL BREAKERS</Text>
                  <Text variant="body" style={{ marginTop: 3, lineHeight: 21 }}>
                    {req.deal_breakers}
                  </Text>
                </View>
              </View>
            ) : null}

            <View style={[styles.criteriaRow, { marginTop: spacing.md }]}>
              <View style={styles.criteriaIconWrap}>
                <Ionicons name="location-outline" size={18} color={c.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="label" tone="muted">PREFERRED LOCATION</Text>
                <Text variant="subhead" style={{ fontWeight: '700', marginTop: 2 }}>
                  {req.preferred_location || 'Flexible / Any Location'}
                </Text>
              </View>
            </View>

            <View style={[styles.criteriaRow, { marginTop: spacing.md }]}>
              <View style={styles.criteriaIconWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={palette.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="label" tone="muted">PRIVACY PROTECTION</Text>
                <Text variant="footnote" tone="default" style={{ marginTop: 2, fontWeight: '600' }}>
                  100% Confidential Private Mode
                </Text>
                <Text variant="footnote" tone="muted" style={{ marginTop: 2 }}>
                  Your profile is hidden from the public discover feed. Only candidates approved by your advisor can see you.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Guaranteed Flat Fee Breakdown Card */}
        <View style={{ marginTop: spacing.lg }}>
          <Text variant="subhead" tone="muted" style={styles.sectionHeader}>
            FEE STRUCTURE & ESCROW
          </Text>

          <View
            style={[
              styles.card,
              { backgroundColor: c.surfaceAlt, borderColor: c.border },
              !isDark ? shadow.soft : undefined,
            ]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
              <Text variant="subhead" style={{ fontWeight: '700' }}>Standard Representation Fee</Text>
              <Text variant="heading" style={{ fontWeight: '800', color: palette.burgundy }}>£500.00</Text>
            </View>

            <View style={[styles.feeRow, { borderBottomColor: c.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name={req?.deposit_paid ? "checkmark-circle" : "time-outline"} size={16} color={req?.deposit_paid ? c.success : palette.burgundy} />
                <Text variant="footnote" style={{ fontWeight: '600' }}>Initial Deposit {req?.deposit_paid ? '(Paid)' : '(Unpaid)'}</Text>
              </View>
              <Text variant="footnote" style={{ fontWeight: '800', color: req?.deposit_paid ? c.success : palette.burgundy }}>£250.00</Text>
            </View>

            <View style={styles.feeRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name={req?.final_paid ? "checkmark-circle" : "time-outline"} size={16} color={req?.final_paid ? c.success : palette.gold} />
                <Text variant="footnote" style={{ fontWeight: '600' }}>Success Balance {req?.final_paid ? '(Paid)' : '(Due on Partner Found)'}</Text>
              </View>
              <Text variant="footnote" style={{ fontWeight: '800', color: req?.final_paid ? c.success : c.text }}>£250.00</Text>
            </View>

            <Text variant="footnote" tone="muted" style={{ marginTop: spacing.xs, lineHeight: 16 }}>
              The final £250 balance is only charged once your advisor successfully introduces you to your confirmed partner.
            </Text>

            {req && !req.deposit_paid && !isCancelled && (
              <View style={{ marginTop: spacing.md }}>
                <Button
                  label="Pay £250 Initial Deposit via Card"
                  variant="primary"
                  loading={payingDeposit}
                  onPress={handlePayDeposit}
                />
              </View>
            )}

            {req && isCompleted && !req.final_paid && (
              <View style={{ marginTop: spacing.md }}>
                <Button
                  label="Pay £250 Success Balance via Card"
                  variant="primary"
                  loading={payingFinal}
                  onPress={handlePayFinal}
                />
              </View>
            )}
          </View>
        </View>

        {/* Case Actions */}
        {!isCancelled && !isCompleted && (
          <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
            {assignedOffer && (
              <Button
                label="Mark Search Completed (Partner Found)"
                variant="primary"
                onPress={() => setShowCompleteModal(true)}
              />
            )}
            <Button
              label="Cancel Search Request"
              variant="outlineAccent"
              style={{ borderColor: palette.sienna }}
              onPress={handleCancel}
            />
            <Text variant="footnote" tone="muted" style={{ textAlign: 'center', marginTop: spacing.xs, fontSize: 11 }}>
              Deposit covers initial advisor research and onboarding.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Complete Search Rating Modal */}
      <Modal
        visible={showCompleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCompleteModal(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: spacing.lg,
          }}
          onPress={() => setShowCompleteModal(false)}
        >
          <Pressable
            style={{
              width: '100%',
              maxWidth: 400,
              backgroundColor: c.surface,
              borderRadius: radii.card,
              padding: spacing.xl,
              borderWidth: 1,
              borderColor: c.border,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: 'rgba(217, 119, 6, 0.12)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: spacing.sm,
                }}
              >
                <Ionicons name="checkmark-done" size={28} color={palette.gold} />
              </View>
              <Text variant="subhead" style={{ fontWeight: '800', textAlign: 'center' }}>
                Complete Matchmaking Search
              </Text>
              <Text variant="footnote" tone="muted" style={{ textAlign: 'center', marginTop: 4 }}>
                Alhamdulillah! Confirming completion will conclude your search and record your review for{' '}
                {assignedOffer?.advisor_name || 'your advisor'}.
              </Text>
            </View>

            <View style={{ alignItems: 'center', marginVertical: spacing.md }}>
              <Text variant="label" tone="muted" style={{ marginBottom: spacing.xs }}>
                RATE YOUR ADVISOR
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Pressable key={star} onPress={() => setRating(star)}>
                    <Ionicons
                      name={star <= rating ? 'star' : 'star-outline'}
                      size={32}
                      color={star <= rating ? palette.gold : c.textMuted}
                    />
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
              <Button
                label={completing ? 'Completing...' : 'Confirm & Complete Search'}
                variant="primary"
                onPress={handleCompleteSearch}
                disabled={completing}
              />
              <Button
                label="Cancel"
                variant="ghost"
                onPress={() => setShowCompleteModal(false)}
                disabled={completing}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Rename Search Modal */}
      <Modal
        visible={showRenameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRenameModal(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: spacing.lg,
          }}
          onPress={() => setShowRenameModal(false)}
        >
          <Pressable
            style={{
              width: '100%',
              maxWidth: 400,
              backgroundColor: c.surface,
              borderRadius: radii.card,
              padding: spacing.xl,
              borderWidth: 1,
              borderColor: c.border,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text variant="heading" style={{ fontWeight: '800', marginBottom: spacing.xs }}>
              Rename Search Case
            </Text>
            <Text variant="footnote" tone="muted" style={{ marginBottom: spacing.lg }}>
              Give this case a distinctive name to easily identify it in your cases.
            </Text>

            <TextField
              label="Case Name"
              value={renamingTitle}
              onChangeText={setRenamingTitle}
              placeholder="e.g. London • Sunni Professional"
              autoFocus
            />

            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
              <Button
                label="Cancel"
                variant="outline"
                style={{ flex: 1 }}
                onPress={() => setShowRenameModal(false)}
              />
              <Button
                label="Save Name"
                variant="primary"
                style={{ flex: 1 }}
                loading={savingTitle}
                onPress={handleSaveTitle}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backBtn: {
    marginRight: spacing.sm,
    padding: spacing.xs,
    marginLeft: -spacing.xs,
  },
  headerTitleWrap: {
    flex: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    gap: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  sectionHeader: {
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  card: {
    padding: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  stepItem: {
    alignItems: 'center',
    width: 68,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepConnector: {
    flex: 1,
    height: 2,
    marginBottom: 18,
    marginHorizontal: 2,
  },
  stepText: {
    fontSize: 10,
    textAlign: 'center',
  },
  criteriaRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  criteriaIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(128, 0, 32, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
});
