import { useCallback, useState, useRef } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter, Stack } from 'expo-router';

import { errorMessage } from '@/api/client';
import { inboxApi } from '@/api/inbox';
import { profilesApi } from '@/api/profiles';
import { ProfileDetail } from '@/components/ProfileDetail';
import { matchAdvisorsApi, getSearchDisplayTitle, findOngoingRequest } from '@/api/matchAdvisors';
import type { MatchAdvisorOffer, MatchAdvisorOfferMessage, MatchAdvisorRequest, PublicProfile } from '@/api/types';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PressableScale } from '@/components/PressableScale';
import { SkeletonList } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { useAuth } from '@/store/auth';
import { palette, radii, shadow, spacing, useTheme } from '@/theme';

function formatTime(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function OfferChatScreen() {
  const params = useLocalSearchParams<{
    offerId?: string;
    id?: string;
    name?: string;
    photo?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c, isDark } = useTheme();
  const { userId } = useAuth();

  const initialOfferId =
    params.offerId && params.offerId !== '[offerId]' && params.offerId !== ':offerId'
      ? params.offerId
      : params.id && params.id !== '[offerId]'
      ? params.id
      : null;

  const [resolvedOfferId, setResolvedOfferId] = useState<string | null>(initialOfferId);
  const resolvedOfferIdRef = useRef<string | null>(initialOfferId);
  resolvedOfferIdRef.current = resolvedOfferId;

  const [offer, setOffer] = useState<MatchAdvisorOffer | null>(null);
  const [req, setReq] = useState<MatchAdvisorRequest | null>(null);
  const [messages, setMessages] = useState<MatchAdvisorOfferMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inputText, setInputText] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<PublicProfile | null>(null);
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [completing, setCompleting] = useState(false);

  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const advisorDisplayName = offer?.advisor_name || params.name || 'Match Advisor';
  const advisorAvatar = offer?.advisor_photo_url || params.photo || null;

  const load = useCallback(async () => {
    let targetId = resolvedOfferIdRef.current;

    // If ID is missing or placeholder, resolve from user's active request
    if (!targetId) {
      try {
        const myRequests = await matchAdvisorsApi.getMyRequests();
        const ongoing = findOngoingRequest(myRequests);
        const activeReq =
          (ongoing?.selected_offer_id ? ongoing : null) ||
          myRequests.find((r) => r.selected_offer_id && r.status === 'completed') ||
          myRequests.find((r) => r.selected_offer_id);

        if (activeReq?.selected_offer_id) {
          targetId = activeReq.selected_offer_id;
          resolvedOfferIdRef.current = targetId;
          setResolvedOfferId(targetId);
        }
      } catch (reqErr) {
        console.warn('Could not auto-resolve advisor offer ID:', reqErr);
      }
    }

    if (!targetId) {
      setLoading(false);
      setError('No active Match Advisor case found. Please book an advisor first.');
      return;
    }

    try {
      const [offerData, messagesData] = await Promise.all([
        matchAdvisorsApi.getOffer(targetId).catch(() => null),
        matchAdvisorsApi.getOfferMessages(targetId),
      ]);
      if (offerData) {
        setOffer(offerData);
        if (offerData.request_id) {
          matchAdvisorsApi.getRequest(offerData.request_id).then(setReq).catch(() => null);
        }
      }
      setMessages(messagesData || []);
      setError(null);
    } catch (err) {
      console.warn('Chat load err:', err);
      // Fallback: if getOffer fails, try just messages
      try {
        const messagesData = await matchAdvisorsApi.getOfferMessages(targetId);
        setMessages(messagesData || []);
        setError(null);
      } catch (innerErr) {
        setError(errorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      const interval = setInterval(load, 2500);
      return () => clearInterval(interval);
    }, [load])
  );

  const handleAgreeToMatch = (candidateId: string, candidateName: string) => {
    const targetId = resolvedOfferIdRef.current;
    if (!targetId) return;

    Alert.alert(
      'Agree to Match?',
      `Would you like your Match Advisor to officially connect you with ${candidateName}? Once connected, a direct chat will open between you.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Connect Us',
          onPress: async () => {
            const content = `CLIENT_AGREED_MATCH|${candidateId}|${candidateName}`;
            const tempId = `temp-${Date.now()}`;
            const optimisticMsg: MatchAdvisorOfferMessage = {
              id: tempId,
              offer_id: targetId,
              sender_id: userId || 'me',
              sender_role: 'user',
              type: 'TEXT',
              content,
              created_at: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, optimisticMsg]);
            try {
              await matchAdvisorsApi.sendOfferMessage(targetId, {
                type: 'TEXT',
                content,
              });
              load();
              Alert.alert(
                'Agreement Sent!',
                `You agreed to match with ${candidateName}. Your advisor has been notified to introduce you.`
              );
            } catch (err) {
              setMessages((prev) => prev.filter((m) => m.id !== tempId));
              Alert.alert('Error', errorMessage(err, 'Could not send agreement.'));
            }
          },
        },
      ]
    );
  };

  const handleCompleteSearch = async () => {
    const targetId = resolvedOfferIdRef.current;
    if (!targetId) return;
    setCompleting(true);
    try {
      await matchAdvisorsApi.completeOffer(targetId, rating);
      setShowCompleteModal(false);
      setShowCaseModal(false);
      Alert.alert(
        'Search Completed!',
        'Alhamdulillah! Your matchmaking search has been marked complete. Thank you for your review.'
      );
      load();
    } catch (err) {
      Alert.alert('Error', errorMessage(err, 'Could not complete search.'));
    } finally {
      setCompleting(false);
    }
  };

  const navigateToDirectChat = async (candidateName?: string) => {
    try {
      const items = await inboxApi.list();
      const matchChat = items.find(
        (i) => i.kind === 'chat' && candidateName && i.title.toLowerCase().includes(candidateName.toLowerCase())
      ) || items.find((i) => i.kind === 'chat');
      if (matchChat?.param_id) {
        router.push({ pathname: '/chat/[id]', params: { id: matchChat.param_id } } as never);
        return;
      }
    } catch {
      // ignore
    }
    router.push('/(app)/messages' as never);
  };

  const handleSend = async () => {
    const textToSend = inputText.trim();
    const targetId = resolvedOfferIdRef.current;
    if (!textToSend || sending || !targetId) return;

    // Optimistic message
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: MatchAdvisorOfferMessage = {
      id: tempId,
      offer_id: targetId,
      sender_id: userId || 'me',
      sender_role: 'user',
      type: 'TEXT',
      content: textToSend,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');

    try {
      setSending(true);
      const newMessage = await matchAdvisorsApi.sendOfferMessage(targetId, {
        type: 'TEXT',
        content: textToSend,
      });
      // Replace optimistic message with actual backend response
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...newMessage, sender_role: 'user' } : m))
      );
    } catch (err) {
      console.error('Send message failed:', err);
      // Rollback optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: MatchAdvisorOfferMessage }) => {
    const isMe = item.sender_id === userId || item.sender_role === 'user';

    // Candidate Recommendation Card
    if (item.content?.startsWith('PROFILE_RECOMMENDATION|')) {
      const parts = item.content.split('|');
      const profileId = parts[1];
      const name = parts[2] || 'Recommended Match';

      const hasAgreed = messages.some((m) => m.content?.startsWith(`CLIENT_AGREED_MATCH|${profileId}`));
      const isMatched = messages.some((m) => m.content?.startsWith(`ADVISOR_CREATED_MATCH|${profileId}`));

      return (
        <View style={{ marginVertical: spacing.sm, alignItems: 'center' }}>
          <PressableScale
            onPress={async () => {
              try {
                const p = await profilesApi.getById(profileId);
                setSelectedProfile(p);
              } catch (err) {
                Alert.alert('Error', 'Could not load profile details');
              }
            }}
            style={[
              {
                backgroundColor: c.surface,
                padding: spacing.md,
                borderRadius: radii.card,
                borderWidth: 1.5,
                borderColor: isMatched ? palette.gold : c.border,
                alignItems: 'center',
                width: '85%',
              },
              !isDark ? shadow.card : {},
            ]}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: isMatched ? 'rgba(217, 119, 6, 0.15)' : c.surfaceAlt,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: spacing.xs,
              }}
            >
              <Ionicons
                name={isMatched ? 'sparkles' : 'heart'}
                size={26}
                color={isMatched ? palette.gold : palette.burgundy}
              />
            </View>
            <Text variant="subhead" style={{ fontWeight: '800', textAlign: 'center', fontSize: 16 }}>
              {name}
            </Text>
            <Text variant="footnote" tone="muted" style={{ marginTop: 2, textAlign: 'center' }}>
              Candidate recommended by your advisor
            </Text>

            {isMatched ? (
              <View
                style={{
                  marginTop: spacing.sm,
                  backgroundColor: 'rgba(217, 119, 6, 0.12)',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: radii.pill,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Ionicons name="sparkles" size={14} color={palette.gold} />
                <Text variant="label" style={{ color: palette.burgundy, fontWeight: '800', fontSize: 11 }}>
                  MATCH CONNECTED
                </Text>
              </View>
            ) : hasAgreed ? (
              <View
                style={{
                  marginTop: spacing.sm,
                  backgroundColor: 'rgba(34, 197, 94, 0.12)',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: radii.pill,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Ionicons name="checkmark-circle" size={14} color={c.success} />
                <Text variant="label" style={{ color: c.success, fontWeight: '800', fontSize: 11 }}>
                  YOU AGREED TO MATCH
                </Text>
              </View>
            ) : null}

            <View style={{ marginTop: spacing.md, width: '100%', gap: spacing.xs }}>
              <Button
                label="View Profile"
                variant={hasAgreed || isMatched ? 'primary' : 'outline'}
                onPress={async () => {
                  try {
                    const p = await profilesApi.getById(profileId);
                    setSelectedProfile(p);
                  } catch (err) {
                    Alert.alert('Error', 'Could not load profile details');
                  }
                }}
              />

              {isMatched ? (
                <Button
                  label="Open Direct Chat"
                  variant="primary"
                  onPress={() => navigateToDirectChat(name)}
                />
              ) : !hasAgreed ? (
                <Button
                  label="Agree to Match"
                  variant="primary"
                  onPress={() => handleAgreeToMatch(profileId, name)}
                />
              ) : null}
            </View>
          </PressableScale>
        </View>
      );
    }

    // Client Agreed Message
    if (item.content?.startsWith('CLIENT_AGREED_MATCH|')) {
      const parts = item.content.split('|');
      const candidateName = parts[2] || 'candidate';
      return (
        <View style={{ marginVertical: spacing.xs, alignItems: 'center' }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              borderColor: 'rgba(34, 197, 94, 0.3)',
              borderWidth: 1,
              borderRadius: radii.pill,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              gap: 6,
            }}
          >
            <Ionicons name="checkmark-circle" size={16} color={c.success} />
            <Text variant="footnote" style={{ color: c.success, fontWeight: '700' }}>
              You agreed to connect with {candidateName}
            </Text>
          </View>
        </View>
      );
    }

    // Advisor Created Match Message
    if (item.content?.startsWith('ADVISOR_CREATED_MATCH|')) {
      const parts = item.content.split('|');
      const candidateName = parts[2] || 'your match';
      return (
        <View style={{ marginVertical: spacing.sm, alignItems: 'center' }}>
          <View
            style={[
              {
                backgroundColor: c.surface,
                borderColor: palette.gold,
                borderWidth: 1.5,
                borderRadius: radii.card,
                padding: spacing.md,
                alignItems: 'center',
                width: '85%',
              },
              !isDark ? shadow.card : {},
            ]}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(217, 119, 6, 0.15)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing.xs,
              }}
            >
              <Ionicons name="sparkles" size={22} color={palette.gold} />
            </View>
            <Text variant="subhead" style={{ fontWeight: '800', textAlign: 'center', color: palette.burgundy }}>
              Official Match Created!
            </Text>
            <Text variant="footnote" tone="muted" style={{ textAlign: 'center', marginTop: 3 }}>
              Your advisor has connected you with {candidateName}. A direct conversation is now active.
            </Text>
            <Button
              label="Open Chats"
              variant="primary"
              style={{ marginTop: spacing.sm, width: '100%' }}
              onPress={() => navigateToDirectChat(candidateName)}
            />
          </View>
        </View>
      );
    }

    // Advisor Requested Completion
    if (item.content === 'ADVISOR_REQUESTED_COMPLETION') {
      const isAlreadyCompleted = offer?.status === 'completed';
      return (
        <View style={{ marginVertical: spacing.sm, alignItems: 'center' }}>
          <View
            style={[
              {
                backgroundColor: c.surface,
                borderColor: palette.burgundy,
                borderWidth: 1.5,
                borderRadius: radii.card,
                padding: spacing.md,
                alignItems: 'center',
                width: '85%',
              },
              !isDark ? shadow.card : {},
            ]}
          >
            <Ionicons name="ribbon-outline" size={30} color={palette.burgundy} style={{ marginBottom: spacing.xs }} />
            <Text variant="subhead" style={{ fontWeight: '800', textAlign: 'center' }}>
              Completion Requested
            </Text>
            <Text variant="footnote" tone="muted" style={{ textAlign: 'center', marginTop: 3 }}>
              Your Match Advisor has requested to conclude this search. Have you found a suitable match?
            </Text>
            {!isAlreadyCompleted && (
              <Button
                label="Confirm & Conclude Search"
                variant="primary"
                style={{ marginTop: spacing.sm, width: '100%' }}
                onPress={() => setShowCompleteModal(true)}
              />
            )}
          </View>
        </View>
      );
    }

    // User or Advisor Confirmed Completion
    if (
      item.content === 'USER_CONFIRMED_COMPLETION' ||
      item.content === 'ADVISOR_CONFIRMED_COMPLETION' ||
      item.content === 'ADMIN_CONFIRMED_COMPLETION'
    ) {
      return (
        <View style={{ marginVertical: spacing.sm, alignItems: 'center' }}>
          <View
            style={{
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              borderColor: 'rgba(34, 197, 94, 0.3)',
              borderWidth: 1.5,
              borderRadius: radii.card,
              padding: spacing.md,
              alignItems: 'center',
              width: '85%',
            }}
          >
            <Ionicons name="checkmark-done-circle" size={32} color={c.success} style={{ marginBottom: 4 }} />
            <Text variant="subhead" style={{ fontWeight: '800', textAlign: 'center', color: c.success }}>
              Search Completed
            </Text>
            <Text variant="footnote" tone="muted" style={{ textAlign: 'center', marginTop: 2 }}>
              Alhamdulillah! Matchmaking search has concluded successfully.
            </Text>
          </View>
        </View>
      );
    }


    if (item.type === 'PROPOSAL' || item.type === ('SYSTEM' as any)) {
      const isSearchActive =
        offer?.status === 'accepted' || offer?.status === 'paid' || offer?.status === 'completed';

      return (
        <View style={styles.proposalContainer}>
          <View
            style={[
              styles.proposalCard,
              { backgroundColor: c.surface, borderColor: c.border },
              !isDark ? shadow.card : {},
            ]}
          >
            {/* Agreement Header */}
            <View style={[styles.proposalHeader, { borderBottomColor: c.border }]}>
              <View style={[styles.proposalBadgeIcon, { backgroundColor: c.accentFaint }]}>
                <Ionicons name="shield-checkmark" size={18} color={palette.burgundy} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text variant="subhead" style={{ color: palette.burgundy, fontWeight: '700' }}>
                  Matchmaking Agreement
                </Text>
                <Text variant="footnote" tone="muted">
                  Private & Verified Matchmaking
                </Text>
              </View>
              <View
                style={[
                  styles.statusTag,
                  { backgroundColor: isSearchActive ? 'rgba(34, 197, 94, 0.12)' : 'rgba(128, 0, 32, 0.08)' },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: isSearchActive ? c.success : palette.burgundy },
                  ]}
                />
                <Text
                  variant="label"
                  style={{
                    color: isSearchActive ? c.success : palette.burgundy,
                    fontWeight: '700',
                    fontSize: 10,
                  }}
                >
                  {isSearchActive ? 'ACTIVE SEARCH' : 'ASSIGNED'}
                </Text>
              </View>
            </View>

            {/* Agreement Details */}
            <View style={{ padding: spacing.md }}>
              <Text variant="body" tone="default" style={{ marginBottom: spacing.md, lineHeight: 20 }}>
                {item.content ||
                  'Your dedicated Match Advisor is assigned to your case. They will review preferences, conduct thorough matchmaking, and introduce hand-picked candidates.'}
              </Text>

              {/* Fee Breakdown Cards */}
              <View style={[styles.feeRow, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                <View style={styles.feeItem}>
                  <Text variant="label" tone="muted" style={{ textTransform: 'uppercase', fontSize: 10 }}>
                    Total Flat Fee
                  </Text>
                  <Text variant="subhead" style={{ fontWeight: '800', color: palette.burgundy, marginTop: 2 }}>
                    £500
                  </Text>
                </View>

                <View style={[styles.feeDivider, { backgroundColor: c.border }]} />

                <View style={styles.feeItem}>
                  <Text variant="label" tone="muted" style={{ textTransform: 'uppercase', fontSize: 10 }}>
                    Deposit (Paid)
                  </Text>
                  <Text variant="subhead" style={{ fontWeight: '800', color: c.success, marginTop: 2 }}>
                    £250 Secured
                  </Text>
                </View>

                <View style={[styles.feeDivider, { backgroundColor: c.border }]} />

                <View style={styles.feeItem}>
                  <Text variant="label" tone="muted" style={{ textTransform: 'uppercase', fontSize: 10 }}>
                    Success Fee
                  </Text>
                  <Text variant="subhead" style={{ fontWeight: '800', color: c.text, marginTop: 2 }}>
                    £250 Due Later
                  </Text>
                </View>
              </View>

              <View style={styles.guaranteeNote}>
                <Ionicons name="information-circle-outline" size={14} color={c.textMuted} style={{ marginRight: 4 }} />
                <Text variant="footnote" tone="muted" style={{ flex: 1, fontSize: 11 }}>
                  Success balance of £250 is only payable once a spouse/partner is found and agreed.
                </Text>
              </View>

            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}>
        {!isMe && (
          <View style={styles.bubbleAvatarWrap}>
            {advisorAvatar ? (
              <Image source={{ uri: advisorAvatar }} style={styles.bubbleAvatar} contentFit="cover" />
            ) : (
              <View style={[styles.bubbleAvatarPlaceholder, { backgroundColor: c.accentFaint }]}>
                <Text variant="label" style={{ color: palette.burgundy, fontWeight: '700' }}>
                  {advisorDisplayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={[styles.messageContentCol, isMe ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
          <View
            style={[
              styles.messageBubble,
              isMe
                ? [styles.bubbleMe, { backgroundColor: palette.burgundy }]
                : [styles.bubbleOther, { backgroundColor: c.surface, borderColor: c.border }],
            ]}
          >
            <Text
              variant="body"
              style={[
                styles.messageText,
                { color: isMe ? palette.cream : c.text },
              ]}
            >
              {item.content}
            </Text>
          </View>

          {/* Time & status */}
          <View style={[styles.timeRow, isMe ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
            <Text variant="footnote" tone="subtle" style={styles.timeText}>
              {!isMe && (item.sender_name || advisorDisplayName) ? `${item.sender_name || advisorDisplayName} • ` : ''}
              {formatTime(item.created_at)}
            </Text>
            {isMe && (
              <Ionicons
                name="checkmark-done"
                size={14}
                color={c.accent}
                style={{ marginLeft: 3 }}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: c.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Premium Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs, borderBottomColor: c.border, backgroundColor: c.surface }]}>
        <PressableScale onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </PressableScale>

        {/* Advisor Avatar */}
        <View style={styles.headerAvatarContainer}>
          {advisorAvatar ? (
            <Image source={{ uri: advisorAvatar }} style={styles.headerAvatar} contentFit="cover" />
          ) : (
            <View style={[styles.headerAvatarPlaceholder, { backgroundColor: palette.burgundy }]}>
              <Text variant="subhead" style={{ color: palette.cream, fontWeight: '700' }}>
                {advisorDisplayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Advisor Title & Details */}
        <View style={styles.headerDetails}>
          <View style={styles.headerNameRow}>
            <Text variant="subhead" style={{ fontWeight: '700', color: c.text }} numberOfLines={1}>
              {advisorDisplayName}
            </Text>
            <Ionicons name="checkmark-circle" size={16} color={palette.burgundy} style={{ marginLeft: 4 }} />
          </View>
          <Text variant="footnote" tone="muted" numberOfLines={1}>
            Dedicated Match Advisor • Active Case
          </Text>
        </View>

        {/* Safety / Info Pill */}
        <View style={[styles.headerBadge, { backgroundColor: c.accentFaint }]}>
          <Ionicons name="shield-checkmark" size={13} color={palette.burgundy} style={{ marginRight: 3 }} />
          <Text variant="label" style={{ color: palette.burgundy, fontWeight: '700', fontSize: 11 }}>
            Verified
          </Text>
        </View>

        {/* Case Info / Manage Button */}
        <PressableScale
          onPress={() => setShowCaseModal(true)}
          style={[styles.headerBadge, { backgroundColor: c.accentFaint, marginLeft: 6 }]}
        >
          <Ionicons name="clipboard-outline" size={13} color={palette.burgundy} style={{ marginRight: 3 }} />
          <Text variant="label" style={{ color: palette.burgundy, fontWeight: '700', fontSize: 11 }}>
            Manage
          </Text>
        </PressableScale>
      </View>

      {/* Main Chat Body */}
      {loading && !offer && messages.length === 0 ? (
        <View style={{ flex: 1, padding: spacing.lg }}>
          <SkeletonList />
        </View>
      ) : error && messages.length === 0 ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <FlatList
          ref={flatListRef}
          inverted
          data={[...messages].reverse()}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.lg }}
          renderItem={renderMessage}
          ListEmptyComponent={
            <View style={{ transform: [{ scaleY: -1 }], paddingVertical: spacing.xxl }}>
              <EmptyState
                icon="chatbubbles-outline"
                title="Your Match Advisor is Assigned"
                message="Send a message to share your partner preferences, values, or questions."
              />
            </View>
          }
        />
      )}

      {/* Composer Input Bar */}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: c.surface,
            borderTopColor: c.border,
            paddingBottom: Math.max(insets.bottom, spacing.md),
          },
        ]}
      >
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: c.surfaceAlt,
              color: c.text,
              borderColor: c.border,
            },
          ]}
          placeholder="Message your Match Advisor..."
          placeholderTextColor={c.textSubtle}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={1000}
        />
        <PressableScale
          style={[
            styles.sendButton,
            {
              backgroundColor: inputText.trim() && !sending ? palette.burgundy : c.border,
            },
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
        >
          <Ionicons
            name="arrow-up"
            size={20}
            color={inputText.trim() && !sending ? palette.cream : c.textSubtle}
          />
        </PressableScale>
      </View>
    
      <Modal visible={!!selectedProfile} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedProfile(null)}>
        {selectedProfile && (
          <ProfileDetail
            profile={selectedProfile}
            onClose={() => setSelectedProfile(null)}
          />
        )}
      </Modal>

      {/* Case Details & Management Sheet Modal */}
      <Modal
        visible={showCaseModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCaseModal(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}
          onPress={() => setShowCaseModal(false)}
        >
          <Pressable
            style={{
              backgroundColor: c.surface,
              borderTopLeftRadius: radii.card,
              borderTopRightRadius: radii.card,
              padding: spacing.lg,
              paddingBottom: Math.max(insets.bottom, spacing.lg),
              maxHeight: '85%',
            }}
            onPress={(e: any) => e.stopPropagation()}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
              <View style={{ flex: 1, paddingRight: spacing.sm }}>
                <Text variant="subhead" style={{ fontWeight: '800' }} numberOfLines={1}>
                  {req ? getSearchDisplayTitle(req) : 'Matchmaking Case'}
                </Text>
                <Text variant="footnote" tone="muted">
                  Case Ref: #{String(offer?.request_id || offer?.id || '').slice(0, 8).toUpperCase()}
                </Text>
              </View>
              <PressableScale onPress={() => setShowCaseModal(false)}>
                <Ionicons name="close" size={24} color={c.text} />
              </PressableScale>
            </View>

            {req?.partner_preferences ? (
              <View style={{ marginBottom: spacing.md, backgroundColor: c.surfaceAlt, padding: spacing.md, borderRadius: radii.md }}>
                <Text variant="label" tone="muted" style={{ fontSize: 10 }}>PARTNER PREFERENCES</Text>
                <Text variant="body" style={{ marginTop: 2, fontSize: 13, lineHeight: 18 }}>
                  {req.partner_preferences}
                </Text>
              </View>
            ) : null}

            {req?.preferred_location ? (
              <View style={{ marginBottom: spacing.md, backgroundColor: c.surfaceAlt, padding: spacing.md, borderRadius: radii.md }}>
                <Text variant="label" tone="muted" style={{ fontSize: 10 }}>PREFERRED LOCATION</Text>
                <Text variant="subhead" style={{ marginTop: 2, fontWeight: '700', fontSize: 13 }}>
                  {req.preferred_location}
                </Text>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
              <View style={{ flex: 1, backgroundColor: c.surfaceAlt, padding: spacing.sm, borderRadius: radii.sm, alignItems: 'center' }}>
                <Text variant="label" tone="muted" style={{ fontSize: 9 }}>STATUS</Text>
                <Text variant="subhead" style={{ fontWeight: '800', color: offer?.status === 'completed' ? c.success : palette.burgundy, fontSize: 12, marginTop: 2 }}>
                  {offer?.status === 'completed' ? 'COMPLETED' : 'ACTIVE SEARCH'}
                </Text>
              </View>
              <View style={{ flex: 1, backgroundColor: c.surfaceAlt, padding: spacing.sm, borderRadius: radii.sm, alignItems: 'center' }}>
                <Text variant="label" tone="muted" style={{ fontSize: 9 }}>DEPOSIT</Text>
                <Text variant="subhead" style={{ fontWeight: '800', color: c.success, fontSize: 12, marginTop: 2 }}>
                  £250 Secured
                </Text>
              </View>
              <View style={{ flex: 1, backgroundColor: c.surfaceAlt, padding: spacing.sm, borderRadius: radii.sm, alignItems: 'center' }}>
                <Text variant="label" tone="muted" style={{ fontSize: 9 }}>SUCCESS FEE</Text>
                <Text variant="subhead" style={{ fontWeight: '800', color: c.text, fontSize: 12, marginTop: 2 }}>
                  £250 Due
                </Text>
              </View>
            </View>

            <View style={{ gap: spacing.sm }}>
              {offer?.status !== 'completed' && (
                <Button
                  label="Search Completed (Partner Found)"
                  variant="primary"
                  onPress={() => {
                    setShowCaseModal(false);
                    setShowCompleteModal(true);
                  }}
                />
              )}

              {offer?.request_id && (
                <Button
                  label="View Full Case Hub & Criteria"
                  variant="outline"
                  onPress={() => {
                    setShowCaseModal(false);
                    router.push({
                      pathname: '/requests/[id]',
                      params: { id: offer.request_id },
                    } as any);
                  }}
                />
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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
            onPress={(e: any) => e.stopPropagation()}
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
                Alhamdulillah! Confirming completion will conclude your search and record your review for {advisorDisplayName}.
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

    </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.xs,
  },
  headerAvatarContainer: {
    position: 'relative',
    marginRight: spacing.sm,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerDetails: {
    flex: 1,
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    marginLeft: spacing.xs,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    alignItems: 'flex-end',
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  bubbleAvatarWrap: {
    marginRight: spacing.xs,
    marginBottom: 16,
  },
  bubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  bubbleAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageContentCol: {
    maxWidth: '78%',
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleMe: {
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    borderBottomLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  timeText: {
    fontSize: 11,
  },
  proposalContainer: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  proposalCard: {
    width: '100%',
    borderRadius: radii.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  proposalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  proposalBadgeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm,
  },
  feeItem: {
    alignItems: 'center',
    flex: 1,
  },
  feeDivider: {
    width: 1,
    height: 24,
  },
  guaranteeNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 21,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
