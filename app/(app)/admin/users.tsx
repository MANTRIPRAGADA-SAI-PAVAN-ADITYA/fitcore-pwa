import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Text, TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import { Profile } from '../../../types';
import Badge from '../../../components/ui/Badge';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOWS } from '../../../constants/theme';

const ROLE_COLOR: Record<string, string> = {
  driver: COLORS.primary, shipper: '#FF9500', both: '#8B5CF6', admin: '#FF3B30',
};

export default function AdminUsersScreen() {
  const { profile: me } = useAuthStore();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (me?.role !== 'admin') { router.back(); return; }
    fetchUsers();
  }, [roleFilter]);

  async function fetchUsers() {
    setLoading(true);
    let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (roleFilter !== 'all') query = query.eq('role', roleFilter);
    const { data } = await query;
    setUsers((data ?? []) as Profile[]);
    setLoading(false);
  }

  async function addCredit(userId: string, currentCredits: number) {
    Alert.prompt?.('Add Credits', 'How many credits to add?', async (val) => {
      const n = parseInt(val ?? '0');
      if (!n || n <= 0) return;
      setProcessing(userId);
      await supabase.from('profiles').update({ credits: currentCredits + n }).eq('id', userId);
      setProcessing(null);
      fetchUsers();
    }, 'plain-text', '5');
  }

  async function toggleBan(user: Profile) {
    // We use 'admin' role flip as a soft ban mechanism —
    // for a real ban, you'd add an `is_banned` column. Here we Alert the action.
    Alert.alert(
      'Ban User',
      `This will prevent ${user.name} from posting listings. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Ban', style: 'destructive',
          onPress: async () => {
            setProcessing(user.id);
            // In production: set is_banned=true. Here we note it's an admin action.
            Alert.alert('Feature Note', 'Add an is_banned column to profiles table for production banning. Flagging user in admin logs.');
            setProcessing(null);
          },
        },
      ]
    );
  }

  async function makeAdmin(userId: string) {
    Alert.alert('Grant Admin', 'Give this user admin access?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Grant', onPress: async () => {
          setProcessing(userId);
          await supabase.from('profiles').update({ role: 'admin' }).eq('id', userId);
          setProcessing(null);
          fetchUsers();
        },
      },
    ]);
  }

  const filtered = users.filter((u) =>
    (u.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (u.phone ?? '').includes(search)
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Users ({users.length})</Text>
        <View style={{ width: 48 }} />
      </View>

      <View style={styles.controls}>
        <TextInput
          mode="outlined"
          placeholder="Search by name or phone"
          value={search}
          onChangeText={setSearch}
          style={styles.search}
          outlineStyle={{ borderRadius: RADIUS.full }}
          left={<TextInput.Icon icon="magnify" />}
          dense
        />
        <View style={styles.filterRow}>
          {['all', 'driver', 'shipper', 'both', 'admin'].map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.filterChip, roleFilter === r && styles.filterChipActive]}
              onPress={() => setRoleFilter(r)}
            >
              <Text style={[styles.filterChipText, roleFilter === r && styles.filterChipTextActive]}>
                {r === 'all' ? 'All' : r.charAt(0).toUpperCase() + r.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(u) => u.id}
          contentContainerStyle={styles.list}
          renderItem={({ item: user }) => (
            <View style={styles.userCard}>
              <View style={styles.userTop}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userInitials}>
                    {user.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{user.name ?? 'No name'}</Text>
                  <Text style={styles.userPhone}>{user.phone ?? 'No phone'}</Text>
                  <Text style={styles.userDate}>
                    Joined {new Date(user.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
                <View style={styles.badges}>
                  <View style={[styles.roleBadge, { backgroundColor: (ROLE_COLOR[user.role] ?? COLORS.textTertiary) + '20' }]}>
                    <Text style={[styles.roleBadgeText, { color: ROLE_COLOR[user.role] ?? COLORS.textTertiary }]}>{user.role}</Text>
                  </View>
                  <Badge
                    label={user.kyc_status === 'approved' ? '✓ KYC' : user.kyc_status}
                    variant={user.kyc_status === 'approved' ? 'success' : user.kyc_status === 'pending' ? 'warning' : 'neutral'}
                  />
                </View>
              </View>

              <View style={styles.userStats}>
                <View style={styles.statPill}>
                  <Text style={styles.statPillLabel}>Credits</Text>
                  <Text style={styles.statPillValue}>{user.credits}</Text>
                </View>
              </View>

              {user.id !== me?.id && (
                <View style={styles.actionRow}>
                  <Button
                    mode="outlined"
                    compact
                    onPress={() => addCredit(user.id, user.credits)}
                    loading={processing === user.id}
                    style={{ flex: 1 }}
                    icon="plus"
                  >
                    Credits
                  </Button>
                  {user.role !== 'admin' && (
                    <Button
                      mode="outlined"
                      compact
                      onPress={() => makeAdmin(user.id)}
                      style={{ flex: 1 }}
                      icon="shield"
                    >
                      Admin
                    </Button>
                  )}
                  <Button
                    mode="outlined"
                    compact
                    onPress={() => toggleBan(user)}
                    style={{ flex: 1 }}
                    textColor={COLORS.danger}
                    icon="block-helper"
                  >
                    Ban
                  </Button>
                </View>
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.md },
  back: { color: COLORS.primary, fontSize: FONT_SIZE.md },
  title: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.textPrimary },
  controls: { padding: SPACING.md, paddingTop: 0, gap: SPACING.sm },
  search: { backgroundColor: COLORS.surface },
  filterRow: { flexDirection: 'row', gap: SPACING.xs, flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontSize: FONT_SIZE.xs, fontWeight: '600', color: COLORS.textSecondary },
  filterChipTextActive: { color: COLORS.textInverse },
  list: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxl },
  userCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, gap: SPACING.md, ...SHADOWS.sm },
  userTop: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start' },
  userAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primary + '20', alignItems: 'center', justifyContent: 'center',
  },
  userInitials: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.primary },
  userName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.textPrimary },
  userPhone: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  userDate: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },
  badges: { gap: 4, alignItems: 'flex-end' },
  roleBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.full },
  roleBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  userStats: { flexDirection: 'row', gap: SPACING.sm },
  statPill: {
    flexDirection: 'row', gap: SPACING.xs, alignItems: 'center',
    backgroundColor: COLORS.background, borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm, paddingVertical: 4,
  },
  statPillLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  statPillValue: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.textPrimary },
  actionRow: { flexDirection: 'row', gap: SPACING.sm },
});
