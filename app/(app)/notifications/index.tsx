import React, { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import { Notification } from '../../../types';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOWS } from '../../../constants/theme';

const TYPE_META: Record<string, { icon: string; color: string }> = {
  bid_placed:    { icon: '💰', color: COLORS.info },
  bid_accepted:  { icon: '✅', color: '#34C759' },
  bid_rejected:  { icon: '❌', color: '#FF3B30' },
  new_message:   { icon: '💬', color: '#5AC8FA' },
  trip_update:   { icon: '🚛', color: COLORS.primary },
  kyc_decision:  { icon: '🪪', color: '#FF9500' },
  system:        { icon: '🔔', color: COLORS.textSecondary },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN');
}

export default function NotificationsScreen() {
  const { profile } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifications((data ?? []) as Notification[]);
    setLoading(false);
    setRefreshing(false);
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', profile.id)
      .eq('is_read', false);
  }, [profile]);

  useEffect(() => {
    fetchNotifications();
    const ch = supabase.channel('notifications_feed')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${profile?.id}`,
      }, (payload) => {
        setNotifications((prev) => [payload.new as Notification, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchNotifications]);

  function handleTap(n: Notification) {
    const data = n.data as any;
    if ((n.type === 'bid_placed' || n.type === 'bid_accepted' || n.type === 'bid_rejected') && data?.listing_id) {
      router.push({ pathname: '/(app)/feed/[id]', params: { id: data.listing_id, type: data.listing_type ?? 'truck' } });
    } else if (n.type === 'new_message' && data?.conversation_id) {
      router.push({ pathname: '/(app)/chat/[id]', params: { id: data.conversation_id } });
    } else if (n.type === 'trip_update') {
      router.push('/(app)/trips');
    } else if (n.type === 'kyc_decision') {
      router.push('/(app)/profile/kyc');
    }
  }

  async function markAllRead() {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile!.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={styles.markRead}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNotifications(); }} />}
          contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.list}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptySubtitle}>
                We'll notify you about bids, messages, and trip updates.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const meta = TYPE_META[item.type] ?? TYPE_META.system;
            return (
              <TouchableOpacity
                style={[styles.item, !item.is_read && styles.itemUnread]}
                onPress={() => handleTap(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconCircle, { backgroundColor: meta.color + '20' }]}>
                  <Text style={styles.iconText}>{meta.icon}</Text>
                </View>
                <View style={styles.itemBody}>
                  <View style={styles.itemTopRow}>
                    <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.itemTime}>{timeAgo(item.created_at)}</Text>
                  </View>
                  <Text style={styles.itemMsg} numberOfLines={2}>{item.body}</Text>
                </View>
                {!item.is_read && <View style={styles.dot} />}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.md, paddingBottom: SPACING.sm,
  },
  back:     { fontSize: 26, color: COLORS.primary, width: 36 },
  title:    { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.textPrimary },
  markRead: { fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: '600', width: 80, textAlign: 'right' },

  list:          { paddingBottom: SPACING.xxl },
  emptyContainer: { flex: 1 },
  emptyBox:      { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: SPACING.sm },
  emptyIcon:     { fontSize: 56 },
  emptyTitle:    { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.textPrimary },
  emptySubtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: SPACING.xl },

  item: {
    flexDirection: 'row', alignItems: 'center', padding: SPACING.md,
    gap: SPACING.md, backgroundColor: COLORS.surface, marginBottom: 1,
  },
  itemUnread: { backgroundColor: COLORS.primary + '08' },
  iconCircle: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  iconText:   { fontSize: 20 },
  itemBody:   { flex: 1, gap: 2 },
  itemTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACING.sm },
  itemTitle:  { flex: 1, fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.textPrimary },
  itemTime:   { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, flexShrink: 0 },
  itemMsg:    { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 18 },
  dot:        { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, flexShrink: 0 },
});
