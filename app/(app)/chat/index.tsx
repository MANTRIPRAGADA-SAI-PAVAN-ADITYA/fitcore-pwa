import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import { Conversation } from '../../../types';
import EmptyState from '../../../components/ui/EmptyState';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOWS } from '../../../constants/theme';

export default function ChatListScreen() {
  const { profile } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('conversations')
      .select(`
        *,
        participant1:profiles!conversations_participant1_id_fkey(id,name,phone),
        participant2:profiles!conversations_participant2_id_fkey(id,name,phone)
      `)
      .or(`participant1_id.eq.${profile.id},participant2_id.eq.${profile.id}`)
      .order('last_message_at', { ascending: false, nullsFirst: false });
    setConversations((data ?? []) as Conversation[]);
    setLoading(false);
    setRefreshing(false);
  }, [profile]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // Realtime: update list when a conversation's last_message changes
  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel('chat-list')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' }, () => {
        fetchConversations();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile, fetchConversations]);

  function otherParticipant(conv: Conversation) {
    if (!profile) return null;
    return conv.participant1_id === profile.id ? conv.participant2 : conv.participant1;
  }

  function formatTime(iso: string | null) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
    if (diffDays === 0) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    if (diffDays === 1) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchConversations(); }} />}
          ListEmptyComponent={
            <EmptyState
              icon="💬"
              title="No messages yet"
              subtitle="Start a conversation from any listing or trip."
            />
          }
          renderItem={({ item: conv }) => {
            const other = otherParticipant(conv);
            const initials = other?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? '?';
            return (
              <TouchableOpacity
                style={styles.convRow}
                onPress={() => router.push({ pathname: '/(app)/chat/[id]', params: { id: conv.id } })}
                activeOpacity={0.7}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <View style={styles.convBody}>
                  <View style={styles.convTop}>
                    <Text style={styles.convName}>{other?.name ?? 'User'}</Text>
                    <Text style={styles.convTime}>{formatTime(conv.last_message_at)}</Text>
                  </View>
                  <Text style={styles.convLast} numberOfLines={1}>
                    {conv.last_message ?? 'Start the conversation'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: SPACING.md, paddingBottom: SPACING.sm },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary },
  list: { flexGrow: 1 },
  convRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md, backgroundColor: COLORS.surface },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.primary + '20', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.primary },
  convBody: { flex: 1, gap: 2 },
  convTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.textPrimary },
  convTime: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },
  convLast: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  separator: { height: 1, backgroundColor: COLORS.border, marginLeft: 80 },
});
