import React from 'react';
import { View, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { Text } from 'react-native-paper';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';

const STATS = [
  { value: '50K+', label: 'Drivers' },
  { value: '30K+', label: 'Loads/mo' },
  { value: '99%',  label: 'On-time' },
];

const PILLARS = [
  { icon: '⚡', text: 'Instant matching' },
  { icon: '🛡️', text: 'Verified partners' },
  { icon: '💬', text: 'In-app chat' },
  { icon: '📍', text: 'Live GPS' },
];

export default function WelcomeScreen() {
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D0D" />

      {/* ── HERO ── */}
      <SafeAreaView style={styles.hero} edges={['top']}>
        {/* Wordmark */}
        <View style={styles.wordmarkWrap}>
          <Text style={styles.wordmark}>LooP</Text>
          <Text style={styles.tagline}>INDIA'S FREIGHT NETWORK</Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {STATS.map((s, i) => (
            <View key={i} style={styles.statItem}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Feature pillars */}
        <View style={styles.pillars}>
          {PILLARS.map((p, i) => (
            <View key={i} style={styles.pillar}>
              <Text style={styles.pillarIcon}>{p.icon}</Text>
              <Text style={styles.pillarText}>{p.text}</Text>
            </View>
          ))}
        </View>
      </SafeAreaView>

      {/* ── BOTTOM CARD ── */}
      <SafeAreaView style={styles.card} edges={['bottom']}>
        <Text style={styles.cardHeading}>Move freight. Make money.</Text>
        <Text style={styles.cardSub}>
          Join thousands of drivers and load owners across India.
        </Text>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push('/(auth)/register')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Create Account</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.push('/(auth)/otp')}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryBtnText}>Sign In</Text>
        </TouchableOpacity>

        <Text style={styles.terms}>
          By continuing you agree to LooP's{' '}
          <Text style={styles.termsLink}>Terms of Service</Text>
          {' & '}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D0D0D' },

  // Hero
  hero: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  wordmarkWrap: { gap: 4 },
  wordmark: {
    fontSize: 72,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -3,
    lineHeight: 76,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 3,
  },

  // Stats
  statsRow: { flexDirection: 'row', gap: SPACING.lg },
  statItem: { gap: 2 },
  statValue: { fontSize: FONT_SIZE.xxl, fontWeight: '900', color: '#FFFFFF' },
  statLabel: { fontSize: FONT_SIZE.xs, color: 'rgba(255,255,255,0.45)', fontWeight: '600', letterSpacing: 0.5 },

  // Pillars
  pillars: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  pillar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  pillarIcon: { fontSize: 14 },
  pillarText: { fontSize: FONT_SIZE.xs, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },

  // Bottom card
  card: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  cardHeading: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  cardSub: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },

  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.textInverse,
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.full,
    paddingVertical: 15,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 0.3,
  },
  terms: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: SPACING.xs,
  },
  termsLink: { color: COLORS.textSecondary, fontWeight: '600' },
});
