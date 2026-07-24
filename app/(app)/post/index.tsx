import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { router } from 'expo-router';
import { useAuthStore } from '../../../store/authStore';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOWS } from '../../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PostIndex() {
  const { profile } = useAuthStore();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Post a Listing</Text>

        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={() => router.push('/(app)/post/truck')} activeOpacity={0.7}>
            <View style={[styles.iconBox, { backgroundColor: COLORS.background }]}>
              <Text style={styles.iconEmoji}>🚛</Text>
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Truck Space</Text>
              <Text style={styles.rowDesc}>Offer your truck route to load owners</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <Divider />
          <TouchableOpacity style={styles.row} onPress={() => router.push('/(app)/post/load')} activeOpacity={0.7}>
            <View style={[styles.iconBox, { backgroundColor: COLORS.warningBg }]}>
              <Text style={styles.iconEmoji}>📦</Text>
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Load</Text>
              <Text style={styles.rowDesc}>Find a truck for your goods</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoText}>
            🛡️ Managed listings use escrow & bidding · 📢 Ad mode lets contacts reach you directly
          </Text>
        </View>

        {profile?.kyc_status !== 'approved' && (
          <TouchableOpacity style={styles.kycBanner} onPress={() => router.push('/(app)/profile/kyc')} activeOpacity={0.8}>
            <Text style={styles.kycText}>⚠️ Complete KYC to show "Verified" on your listings</Text>
            <Text style={styles.kycLink}>Upload documents →</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, padding: SPACING.md, gap: SPACING.md },
  title:     { fontSize: FONT_SIZE.xxl, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.3 },

  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOWS.sm },
  row:  { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.md },
  iconBox: {
    width: 44, height: 44, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
  },
  iconEmoji: { fontSize: 22 },
  rowInfo:   { flex: 1, gap: 2 },
  rowTitle:  { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.textPrimary },
  rowDesc:   { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  chevron:   { fontSize: 22, color: COLORS.textTertiary },

  infoRow:  { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  infoText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, lineHeight: 18 },

  kycBanner: {
    backgroundColor: COLORS.warningBg, borderRadius: RADIUS.md,
    padding: SPACING.md, gap: 4, borderWidth: 1, borderColor: '#FDE68A',
  },
  kycText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  kycLink: { fontSize: FONT_SIZE.xs, color: COLORS.warning, fontWeight: '700' },
});
