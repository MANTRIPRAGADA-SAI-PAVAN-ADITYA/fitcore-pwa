import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOWS } from '../../../constants/theme';

interface Stats {
  total_users: number;
  active_trucks: number;
  active_loads: number;
  total_trips: number;
  pending_kyc: number;
  active_trips: number;
}

export default function AdminDashboard() {
  const { profile } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role !== 'admin') { router.back(); return; }
    fetchStats();
  }, []);

  async function fetchStats() {
    const [
      { count: total_users },
      { count: active_trucks },
      { count: active_loads },
      { count: total_trips },
      { count: pending_kyc },
      { count: active_trips },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('trucks').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('loads').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('trips').select('*', { count: 'exact', head: true }),
      supabase.from('kyc_documents').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('trips').select('*', { count: 'exact', head: true }).eq('status', 'in_transit'),
    ]);
    setStats({
      total_users: total_users ?? 0,
      active_trucks: active_trucks ?? 0,
      active_loads: active_loads ?? 0,
      total_trips: total_trips ?? 0,
      pending_kyc: pending_kyc ?? 0,
      active_trips: active_trips ?? 0,
    });
    setLoading(false);
  }

  if (loading) return <View style={styles.centered}><ActivityIndicator color={COLORS.primary} size="large" /></View>;

  const MENU = [
    { icon: '🪪', label: 'KYC Review', desc: `${stats?.pending_kyc ?? 0} pending`, route: '/(app)/admin/kyc', urgent: (stats?.pending_kyc ?? 0) > 0 },
    { icon: '👥', label: 'Users', desc: `${stats?.total_users ?? 0} total`, route: '/(app)/admin/users', urgent: false },
    { icon: '🛣️', label: 'All Trips', desc: `${stats?.active_trips ?? 0} in transit`, route: '/(app)/admin/trips', urgent: false },
    { icon: '⚙️', label: 'Pricing Config', desc: 'Commission & fees', route: '/(app)/admin/pricing', urgent: false },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Admin Panel</Text>
          <View style={{ width: 48 }} />
        </View>

        <View style={styles.crown}>
          <Text style={styles.crownIcon}>👑</Text>
          <Text style={styles.crownText}>LooP Admin Dashboard</Text>
          <Text style={styles.crownSub}>Logged in as {profile?.name}</Text>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <StatCard label="Users" value={stats?.total_users ?? 0} icon="👤" />
          <StatCard label="Trucks Live" value={stats?.active_trucks ?? 0} icon="🚛" />
          <StatCard label="Loads Live" value={stats?.active_loads ?? 0} icon="📦" />
          <StatCard label="Total Trips" value={stats?.total_trips ?? 0} icon="🛣️" />
          <StatCard label="In Transit" value={stats?.active_trips ?? 0} icon="🔄" color={COLORS.primary} />
          <StatCard label="KYC Pending" value={stats?.pending_kyc ?? 0} icon="⏳" color={stats?.pending_kyc ?? 0 > 0 ? COLORS.warning : undefined} />
        </View>

        {/* Menu */}
        <View style={styles.menuCard}>
          {MENU.map((item, i) => (
            <React.Fragment key={item.route}>
              {i > 0 && <View style={styles.divider} />}
              <TouchableOpacity style={styles.menuItem} onPress={() => router.push(item.route as any)} activeOpacity={0.7}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <View style={styles.menuBody}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuDesc}>{item.desc}</Text>
                </View>
                {item.urgent && (
                  <View style={styles.urgentBadge}>
                    <Text style={styles.urgentText}>!</Text>
                  </View>
                )}
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>

        <Text style={styles.footer}>LooP Admin · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, color ? { color } : {}]}>{value.toLocaleString('en-IN')}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { color: COLORS.primary, fontSize: FONT_SIZE.md },
  title: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.textPrimary },
  crown: {
    backgroundColor: '#1a1a2e', borderRadius: RADIUS.xl,
    padding: SPACING.lg, alignItems: 'center', gap: SPACING.xs,
  },
  crownIcon: { fontSize: 36 },
  crownText: { fontSize: FONT_SIZE.lg, fontWeight: '800', color: COLORS.textPrimary },
  crownSub: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm,
  },
  statCard: {
    flex: 1, minWidth: '30%', backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center',
    gap: 4, ...SHADOWS.sm,
  },
  statIcon: { fontSize: 22 },
  statValue: { fontSize: FONT_SIZE.xxl, fontWeight: '800', color: COLORS.textPrimary },
  statLabel: { fontSize: 10, color: COLORS.textTertiary, fontWeight: '600', textAlign: 'center' },
  menuCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOWS.sm },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.md },
  menuIcon: { fontSize: 24, width: 32, textAlign: 'center' },
  menuBody: { flex: 1 },
  menuLabel: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.textPrimary },
  menuDesc: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  urgentBadge: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.danger, alignItems: 'center', justifyContent: 'center',
  },
  urgentText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  chevron: { fontSize: 22, color: COLORS.textTertiary },
  divider: { height: 1, backgroundColor: COLORS.border },
  footer: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, textAlign: 'center' },
});
