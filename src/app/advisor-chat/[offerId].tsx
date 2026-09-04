import { useCallback, useState, useRef } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { matchAdvisorsApi } from '@/api/matchAdvisors';
import type { MatchAdvisorOffer, MatchAdvisorOfferMessage } from '@/api/types';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PressableScale } from '@/components/PressableScale';
import { SkeletonList } from '@/components/Skeleton';
import { Text } from '@/components/Text';
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
  const [messages, setMessages] = useState<MatchAdvisorOfferMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inputText, setInputText] = useState('');
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
        const activeReq =
          myRequests.find(
            (r) =>
              r.selected_offer_id &&
              (r.status === 'open' || r.status === 'accepted' || r.status === 'active' || r.status === 'completed')
          ) || myRequests.find((r) => r.selected_offer_id);

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
      if (offerData) setOffer(offerData);
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

    if (item.type === 'PROPOSAL' || item.type === ('SYSTEM' as any)) {
      const isSearchActive =
        offer?.status === 'accepted' || offer?.status === 'paid' || offer?.status === 'completed';

      return (
        <View style={styles.proposalContainer}>
          <View
            style={[
              styles.proposalCard,
              { backgroundColor: c.surface, borderColor: c.border },
              !isDark && shadow.card,
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
          <View style={[styles.onlineIndicator, { borderColor: c.surface }]} />
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
    </KeyboardAvoidingView>
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
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#22c55e',
    borderWidth: 2,
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
