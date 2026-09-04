import { useCallback, useState, useRef } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { Button } from '@/components/Button';
import { fonts, palette, radii, shadow, spacing, useTheme } from '@/theme';

export default function OfferChatScreen() {
  const { offerId } = useLocalSearchParams<{ offerId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c, isDark } = useTheme();

  const [offer, setOffer] = useState<MatchAdvisorOffer | null>(null);
  const [messages, setMessages] = useState<MatchAdvisorOfferMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    try {
      const [offerData, messagesData] = await Promise.all([
        matchAdvisorsApi.getOffer(offerId),
        matchAdvisorsApi.getOfferMessages(offerId)
      ]);
      setOffer(offerData);
      setMessages(messagesData);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [offerId]);

  useFocusEffect(
    useCallback(() => {
      load();
      const interval = setInterval(load, 3000);
      return () => clearInterval(interval);
    }, [load])
  );

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;
    try {
      setSending(true);
      const newMessage = await matchAdvisorsApi.sendOfferMessage(offerId, {
        type: 'TEXT',
        content: inputText.trim()
      });
      setMessages((prev) => [...prev, newMessage]);
      setInputText('');
      
    } catch (err) {
      console.error(err);
      // You could show a toast here
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: MatchAdvisorOfferMessage }) => {
    const isMe = item.sender_role === 'user';

    if (item.type === 'PROPOSAL') {
      return (
        <View style={styles.proposalContainer}>
          <View style={[styles.proposalCard, { backgroundColor: c.surface, borderColor: c.accent }, !isDark && shadow.md]}>
            <View style={[styles.proposalHeader, { borderBottomColor: c.border }]}>
              <Ionicons name="briefcase" size={20} color={c.accent} style={{ marginRight: spacing.sm }} />
              <Text variant="subhead" style={{ color: c.accent, fontWeight: 'bold' }}>New Proposal</Text>
            </View>
            <View style={{ padding: spacing.md }}>
              <Text variant="body" style={{ marginBottom: spacing.sm }}>
                {item.content || 'The advisor has sent a new proposal.'}
              </Text>
              
              {item.proposal_details && (
                <View style={[styles.proposalDetails, { backgroundColor: c.bg }]}>
                  <Text variant="footnote" tone="default">
                    <Text variant="footnote" tone="muted">Fee: </Text>
                    £{(item.proposal_details.fee_pence / 100).toFixed(2)}
                  </Text>
                  <Text variant="footnote" tone="default">
                    <Text variant="footnote" tone="muted">Timeline: </Text>
                    {item.proposal_details.timeline_days} days
                  </Text>
                  {item.proposal_details.included_items ? (
                    <Text variant="footnote" tone="default" style={{ marginTop: spacing.xs }}>
                      <Text variant="footnote" tone="muted">Includes: </Text>
                      {item.proposal_details.included_items}
                    </Text>
                  ) : null}
                </View>
              )}

              {offer?.status === 'OPEN' ? (
                <View style={styles.proposalActions}>
                  <Button 
                    label="Negotiate" 
                    variant="secondary" 
                    style={{ flex: 1, marginRight: spacing.sm }}
                    onPress={() => {
                      setInputText("I'd like to negotiate this proposal: ");
                    }} 
                  />
                  <Button 
                    label="Accept" 
                    variant="primary" 
                    style={{ flex: 1 }}
                    onPress={() => {
                      matchAdvisorsApi.acceptOffer(offerId).then(() => {
                        load();
                      }).catch(err => console.error(err));
                    }} 
                  />
                </View>
              ) : (
                <View style={[styles.proposalActions, { justifyContent: 'center', marginTop: spacing.sm }]}>
                  <View style={{ backgroundColor: offer?.status === 'ACCEPTED' ? palette.success : palette.muted, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12 }}>
                    <Text variant="label" style={{ color: 'white' }}>{offer?.status || 'CLOSED'}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}>
        <View style={[
          styles.messageBubble,
          isMe ? { backgroundColor: c.accent } : { backgroundColor: c.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border }
        ]}>
          <Text variant="body" style={{ color: isMe ? '#fff' : c.text }}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.root, { backgroundColor: c.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, borderBottomColor: c.border }]}>
        <PressableScale onPress={() => router.back()} style={{ marginRight: spacing.md }}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </PressableScale>
        <View style={{ flex: 1 }}>
          <Text variant="heading" numberOfLines={1}>{offer?.title || 'Loading...'}</Text>
          {offer && (
            <Text variant="footnote" tone="muted">{offer.status.toUpperCase()}</Text>
          )}
        </View>
      </View>

      {loading && !offer ? (
        <SkeletonList />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <FlatList
          ref={flatListRef}
          inverted
          data={[...messages].reverse()}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxxl }}
          renderItem={renderMessage}
          ListEmptyComponent={
            <View style={{ transform: [{ scaleY: -1 }] }}>
              <EmptyState
                icon="chatbubbles-outline"
                title="No messages yet"
                message="Send a message to start negotiating with the advisor."
              />
            </View>
          }
        />
      )}

      <View style={[styles.inputContainer, { backgroundColor: c.surface, borderTopColor: c.border, paddingBottom: insets.bottom || spacing.md }]}>
        <TextInput
          style={[styles.textInput, { backgroundColor: c.bg, color: c.text, borderColor: c.border }]}
          placeholder="Type a message..."
          placeholderTextColor={c.textSubtle}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
        />
        <PressableScale 
          style={[styles.sendButton, { backgroundColor: inputText.trim() && !sending ? c.accent : c.border }]} 
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
        >
          <Ionicons name="send" size={20} color="#fff" style={{ marginLeft: 2 }} />
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
  },
  proposalContainer: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  proposalCard: {
    width: '90%',
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  proposalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  proposalDetails: {
    padding: spacing.sm,
    borderRadius: radii.md,
    marginBottom: spacing.md,
  },
  proposalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 10,
    marginRight: spacing.sm,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  }
});
