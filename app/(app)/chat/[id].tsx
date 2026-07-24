import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, StyleSheet, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform
} from 'react-native';
import { Text, TextInput, IconButton, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import { Message, Conversation } from '../../../types';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOWS } from '../../../constants/theme';

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuthStore();
  const flatListRef = useRef<FlatList>(null);

  const [conv, setConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchMessages = useCallback(async () => {
    const [{ data: convData }, { data: msgData }] = await Promise.all([
      supabase
        .from('conversations')
        .select('*, participant1:profiles!conversations_participant1_id_fkey(id,name), participant2:profiles!conversations_participant2_id_fkey(id,name)')
        .eq('id', id)
        .single(),
      supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true }),
    ]);
    if (convData) setConv(convData as Conversation);
    setMessages((msgData ?? []) as Message[]);
    setLoading(false);
    markRead();
  }, [id]);

  async function markRead() {
    if (!profile) return;
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', id)
      .neq('sender_id', profile.id);
  }

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // Realtime subscription for new messages
  useEffect(() => {
    const channel = supabase
      .channel(`room:${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          if ((payload.new as Message).sender_id !== profile?.id) markRead();
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, profile]);

  async function sendMessage() {
    if (!text.trim() || !profile) return;
    const content = text.trim();
    setText('');
    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        conversation_id: id,
        sender_id: profile.id,
        text: content,
      });
      if (error) throw error;
      // Update conversation last_message
      await supabase
        .from('conversations')
        .update({ last_message: content, last_message_at: new Date().toISOString() })
        .eq('id', id);
    } finally {
      setSending(false);
    }
  }

  function otherParticipant() {
    if (!conv || !profile) return null;
    return conv.participant1_id === profile.id ? conv.participant2 : conv.participant1;
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  }

  const other = otherParticipant();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {other?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'}
            </Text>
          </View>
          <Text style={styles.headerName}>{other?.name ?? 'Chat'}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatText}>No messages yet. Say hello!</Text>
            </View>
          }
          renderItem={({ item: msg, index }) => {
            const isMe = msg.sender_id === profile?.id;
            const showDate = index === 0 || new Date(msg.created_at).toDateString() !== new Date(messages[index - 1].created_at).toDateString();
            return (
              <>
                {showDate && (
                  <View style={styles.dateSeparator}>
                    <Text style={styles.dateText}>
                      {new Date(msg.created_at).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </Text>
                  </View>
                )}
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                  <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
                    {msg.text}
                  </Text>
                  <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : styles.bubbleTimeThem]}>
                    {formatTime(msg.created_at)}
                    {isMe && <Text style={styles.readTick}>{msg.is_read ? ' ✓✓' : ' ✓'}</Text>}
                  </Text>
                </View>
              </>
            );
          }}
        />

        {/* Input */}
        <View style={styles.inputBar}>
          <TextInput
            mode="outlined"
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            style={styles.input}
            outlineStyle={{ borderRadius: 24 }}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!text.trim() || sending}
          >
            <Text style={styles.sendIcon}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.md, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    ...SHADOWS.sm,
  },
  backBtn: { padding: SPACING.xs },
  backText: { fontSize: 24, color: COLORS.primary, fontWeight: '700' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  headerAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.primary + '20', alignItems: 'center', justifyContent: 'center',
  },
  headerAvatarText: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.primary },
  headerName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.textPrimary },
  messageList: { padding: SPACING.md, gap: SPACING.sm, flexGrow: 1 },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyChatText: { fontSize: FONT_SIZE.sm, color: COLORS.textTertiary },
  dateSeparator: { alignItems: 'center', marginVertical: SPACING.sm },
  dateText: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, backgroundColor: COLORS.border, paddingHorizontal: SPACING.md, paddingVertical: 3, borderRadius: RADIUS.full },
  bubble: {
    maxWidth: '80%', borderRadius: 18, padding: SPACING.sm,
    paddingHorizontal: SPACING.md, marginBottom: 2,
  },
  bubbleMe: { alignSelf: 'flex-end', backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleThem: { alignSelf: 'flex-start', backgroundColor: COLORS.surface, borderBottomLeftRadius: 4, ...SHADOWS.sm },
  bubbleText: { fontSize: FONT_SIZE.sm, lineHeight: 20 },
  bubbleTextMe: { color: COLORS.textInverse },
  bubbleTextThem: { color: COLORS.textPrimary },
  bubbleTime: { fontSize: 10, marginTop: 2 },
  bubbleTimeMe: { color: 'rgba(0,0,0,0.45)', textAlign: 'right' },
  bubbleTimeThem: { color: COLORS.textTertiary },
  readTick: { fontSize: 10 },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm,
    padding: SPACING.sm, paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  input: { flex: 1, backgroundColor: COLORS.surface, maxHeight: 120 },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  sendBtnDisabled: { backgroundColor: COLORS.border },
  sendIcon: { color: COLORS.textInverse, fontSize: 20, fontWeight: '800' },
});
