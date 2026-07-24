import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Divider, Avatar } from 'react-native-paper';
import { router } from 'expo-router';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../lib/supabase';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../../constants/theme';
import { Profile, KycStatus } from '../../../types';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── LooP Score calculation ──────────────────────────────────────────
function computeLoopScore(p: Profile): number {
  let score = 0;
  if (p.kyc_status === 'approved') score += 40;
  else if (p.kyc_status === 'pending') score += 15;
  if (p.name)        score += 15;
  if (p.phone)       score += 10;
  if (p.company)     score += 10;
  if (p.avatar_url)  score += 5;
  if (p.credits > 0) score += 10;
  const ageDays = (Date.now() - new Date(p.created_at).getTime()) / 86_400_000;
  if (ageDays > 30) score += 10;
  return Math.min(score, 100);
}

function scoreTier(s: number): { label: string; color: string } {
  if (s >= 80) return { label: 'Expert',   color: '#34C759' };
  if (s >= 60) return { label: 'Trusted',  color: COLORS.info };
  if (s >= 35) return { label: 'Building', color: '#FF9500' };
  return             { label: 'New',       color: '#AEAEB2' };
}

const KYC_BADGE: Record<KycStatus, { icon: string; label: string; color: string }> = {
  none:     { icon: '📋', label: 'Not Submitted', color: COLORS.textTertiary },
  pending:  { icon: '⏳', label: 'Under Review',  color: COLORS.warning },
  approved: { icon: '✅', label: 'Verified',       color: COLORS.success },
  rejected: { icon: '❌', label: 'Rejected',       color: COLORS.danger },
};

const ROLE_COLOR: Record<string, string> = {
  driver: COLORS.primary,
  shipper: COLORS.secondary,
  both: '#8B5CF6',
  admin: '#FF3B30',
};

const ROLE_LABEL: Record<string, string> = {
  driver: '🚛 Driver',
  shipper: '📦 Load Owner',
  both: '🔄 Driver & Shipper',
  admin: '👑 Admin',
};

export default function ProfileScreen() {
  const { profile, signOut } = useAuthStore();
  const [stats, setStats] = useState<{ trips: number; rating: number | null; acceptRate: number | null }>({
    trips: 0, rating: null, acceptRate: null,
  });

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [deliveredRes, totalRes, ratingRes] = await Promise.all([
        supabase.from('trips').select('*', { count: 'exact', head: true })
          .or(`driver_id.eq.${profile.id},shipper_id.eq.${profile.id}`)
          .eq('status', 'delivered'),
        supabase.from('trips').select('*', { count: 'exact', head: true })
          .or(`driver_id.eq.${profile.id},shipper_id.eq.${profile.id}`)
          .in('status', ['delivered', 'cancelled']),
        supabase.from('ratings').select('score').eq('rated_id', profile.id),
      ]);
      const delivered = deliveredRes.count ?? 0;
      const total     = totalRes.count ?? 0;
      const scores    = ((ratingRes.data ?? []) as any[]).map((r) => r.score as number);
      const avgRating = scores.length > 0
        ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1))
        : null;
      setStats({
        trips:      delivered,
        rating:     avgRating,
        acceptRate: total > 0 ? Math.round((delivered / total) * 100) : null,
      });
    })();
  }, [profile?.id]);

  if (!profile) return null;

  const score    = computeLoopScore(profile);
  const tier     = scoreTier(score);
  const kyc      = KYC_BADGE[profile.kyc_status];
  const initials = profile.name
    ? profile.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView>

        {/* ── Profile Header ── */}
        <View style={styles.profileSection}>
          <View style={styles.avatarWrap}>
            <Avatar.Text
              size={60}
              label={initials}
              style={{ backgroundColor: ROLE_COLOR[profile.role] ?? COLORS.primary }}
              labelStyle={{ fontSize: 22, fontWeight: '800' }}
            />
            {profile.kyc_status === 'approved' && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedIcon}>✓</Text>
              </View>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{profile.name ?? 'Set your name'}</Text>
            {profile.company ? <Text style={styles.company}>{profile.company}</Text> : null}
            <View style={styles.tagsRow}>
              <View style={[styles.roleTag, { backgroundColor: ROLE_COLOR[profile.role] + '18' }]}>
                <Text style={[styles.roleTagText, { color: ROLE_COLOR[profile.role] }]}>
                  {ROLE_LABEL[profile.role] ?? profile.role}
                </Text>
              </View>
              <View style={[styles.kycTag, { borderColor: kyc.color + '40' }]}>
                <Text style={{ fontSize: 10 }}>{kyc.icon}</Text>
                <Text style={[styles.kycTagText, { color: kyc.color }]}>{kyc.label}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Score inline ── */}
        <View style={styles.scoreSection}>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>LOOP SCORE</Text>
            <View style={styles.scoreValueRow}>
              <Text style={[styles.scoreValue, { color: tier.color }]}>{score}</Text>
              <Text style={styles.scoreMax}>/100 · </Text>
              <Text style={[styles.scoreTier, { color: tier.color }]}>{tier.label}</Text>
            </View>
          </View>
          <View style={styles.scoreBarBg}>
            <View style={[styles.scoreBarFill, { width: `${score}%` as any, backgroundColor: tier.color }]} />
          </View>
          <Text style={styles.scoreHint}>
            {profile.kyc_status !== 'approved'
              ? '🪪 Complete KYC to boost your score'
              : !profile.company
              ? '🏢 Add company name to boost score'
              : '⭐ Complete trips to increase score'}
          </Text>
        </View>

        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          <StatBox label="Trips" value={String(stats.trips)} />
          <View style={styles.statDivider} />
          <StatBox label="Rating" value={stats.rating !== null ? `${stats.rating}★` : '—'} />
          <View style={styles.statDivider} />
          <StatBox label="Credits" value={String(profile.credits)} />
          <View style={styles.statDivider} />
          <StatBox label="Accept" value={stats.acceptRate !== null ? `${stats.acceptRate}%` : '—'} />
        </View>

        <View style={styles.band} />

        {/* ── Activity ── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>ACTIVITY</Text>
          <MenuItem icon="🔔" label="Notifications" onPress={() => router.push('/(app)/notifications/index')} />
          <Divider style={styles.divider} />
          <MenuItem
            icon="⚡"
            label="Credits & History"
            onPress={() => router.push('/(app)/credits/index')}
            tag={`${profile.credits} cr`}
            tagColor={COLORS.primary}
          />
        </View>

        <View style={styles.band} />

        {/* ── Account ── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>ACCOUNT</Text>
          <MenuItem icon="✏️" label="Edit Profile" onPress={() => router.push('/(app)/profile/edit')} />
          <Divider style={styles.divider} />
          <MenuItem
            icon="🪪"
            label="KYC Verification"
            onPress={() => router.push('/(app)/profile/kyc')}
            tag={profile.kyc_status === 'none' ? 'Get Verified' : profile.kyc_status === 'rejected' ? 'Action Needed' : undefined}
            tagColor={profile.kyc_status === 'rejected' ? COLORS.danger : COLORS.primary}
          />
          <Divider style={styles.divider} />
          <MenuItem icon="📋" label="My Listings" onPress={() => router.push('/(app)/feed')} />
          <Divider style={styles.divider} />
          <MenuItem icon="🛣️" label="My Trips" onPress={() => router.push('/(app)/trips')} />
          {profile.role === 'admin' && (
            <>
              <Divider style={styles.divider} />
              <MenuItem icon="👑" label="Admin Panel" onPress={() => router.push('/(app)/admin/index')} tagColor={COLORS.danger} tag="Admin" />
            </>
          )}
        </View>

        <View style={styles.band} />

        {/* ── Info ── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>INFO</Text>
          <InfoRow label="Phone" value={profile.phone ?? '—'} />
          <Divider style={styles.divider} />
          <InfoRow
            label="Member since"
            value={new Date(profile.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          />
        </View>

        <View style={styles.band} />

        <TouchableOpacity style={styles.signOutBtn} onPress={signOut} activeOpacity={0.8}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>LooP v1.0 · Made in India 🇮🇳</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuItem({
  icon, label, onPress, tag, tagColor,
}: {
  icon: string; label: string; onPress: () => void; tag?: string; tagColor?: string;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={styles.menuLabel}>{label}</Text>
      {tag && (
        <View style={[styles.menuTag, { backgroundColor: (tagColor ?? COLORS.primary) + '18' }]}>
          <Text style={[styles.menuTagText, { color: tagColor ?? COLORS.primary }]}>{tag}</Text>
        </View>
      )}
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },

  // Profile header — flush white section
  profileSection: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    padding: SPACING.md, backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  avatarWrap:    { position: 'relative' },
  verifiedBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: COLORS.success, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.surface,
  },
  verifiedIcon: { color: '#fff', fontSize: 9, fontWeight: '900' },
  profileInfo:  { flex: 1, gap: 3 },
  name:         { fontSize: FONT_SIZE.lg, fontWeight: '800', color: COLORS.textPrimary },
  company:      { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  tagsRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 2 },
  roleTag:      { paddingHorizontal: 7, paddingVertical: 2, borderRadius: RADIUS.full },
  roleTagText:  { fontSize: 10, fontWeight: '700' },
  kycTag: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: RADIUS.full, borderWidth: 1,
  },
  kycTagText: { fontSize: 10, fontWeight: '600' },

  // Score — inline below header
  scoreSection: {
    backgroundColor: COLORS.surface, paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm, paddingBottom: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 6,
  },
  scoreRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scoreLabel:    { fontSize: 9, fontWeight: '700', color: COLORS.textTertiary, letterSpacing: 1 },
  scoreValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 1 },
  scoreValue:    { fontSize: FONT_SIZE.md, fontWeight: '900' },
  scoreMax:      { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },
  scoreTier:     { fontSize: FONT_SIZE.xs, fontWeight: '700' },
  scoreBarBg:    { height: 4, backgroundColor: COLORS.border, borderRadius: 2 },
  scoreBarFill:  { height: 4, borderRadius: 2 },
  scoreHint:     { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },

  // Stats — full-width row
  statsRow: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  statBox:    { flex: 1, alignItems: 'center', paddingVertical: SPACING.sm, gap: 2 },
  statValue:  { fontSize: FONT_SIZE.md, fontWeight: '800', color: COLORS.textPrimary },
  statLabel:  { fontSize: 9, color: COLORS.textTertiary, fontWeight: '600' },
  statDivider:{ width: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm },

  // Grey band separator (iOS Settings style)
  band: { height: 8, backgroundColor: COLORS.background },

  // Section group
  section:       { backgroundColor: COLORS.surface },
  sectionHeader: {
    fontSize: 10, fontWeight: '700', color: COLORS.textTertiary,
    letterSpacing: 1, paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm, paddingBottom: 4,
  },
  divider: { marginLeft: SPACING.md + 28 + SPACING.md },

  // Menu items
  menuItem:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 13, gap: SPACING.md },
  menuIcon:  { fontSize: 18, width: 28, textAlign: 'center' },
  menuLabel: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.textPrimary, fontWeight: '500' },
  menuTag:   { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.full },
  menuTagText: { fontSize: 10, fontWeight: '700' },
  chevron:   { fontSize: 20, color: COLORS.textTertiary },

  // Info rows
  infoRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 13 },
  infoLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  infoValue: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textPrimary },

  // Sign out
  signOutBtn: { padding: SPACING.md, alignItems: 'center', backgroundColor: COLORS.surface },
  signOutText: { color: COLORS.danger, fontSize: FONT_SIZE.sm, fontWeight: '700' },
  version:    { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, textAlign: 'center', paddingBottom: SPACING.xl, paddingTop: 4 },
});
