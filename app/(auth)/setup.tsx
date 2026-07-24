import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { TruckType } from '../../types';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOWS } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

const TRUCK_TYPES: { value: TruckType; label: string; icon: string; desc: string }[] = [
  { value: 'mini',      label: 'Mini Truck',  icon: '🚐', desc: 'Up to 1.5 tons' },
  { value: 'lcv',       label: 'LCV',         icon: '🚚', desc: '1.5 – 3.5 tons' },
  { value: 'hcv',       label: 'HCV',         icon: '🚛', desc: '3.5 – 15 tons' },
  { value: 'trailer',   label: 'Trailer',     icon: '🚜', desc: '15 – 30 tons' },
  { value: 'container', label: 'Container',   icon: '📦', desc: '20–40 ft ISO' },
];

export default function SetupScreen() {
  const { profile, updateProfile } = useAuthStore();

  // Driver fields
  const [truckType, setTruckType]   = useState<TruckType | null>(null);
  const [plate, setPlate]           = useState('');
  const [experience, setExperience] = useState('');

  // Shipper fields
  const [company, setCompany]       = useState('');
  const [gst, setGst]               = useState('');

  const [loading, setLoading] = useState(false);

  const isDriver  = profile?.role === 'driver' || profile?.role === 'both';
  const isShipper = profile?.role === 'shipper' || profile?.role === 'both';

  async function handleSave() {
    const updates: Record<string, any> = {};
    if (isShipper && company.trim()) updates.company = company.trim();
    // For now only save what DB supports; truck_type/plate/gst can be added via migration

    setLoading(true);
    await updateProfile(updates);
    setLoading(false);
    router.replace('/(app)/home');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Progress */}
        <View style={styles.progress}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '100%' }]} />
          </View>
          <Text style={styles.progressText}>Step 2 of 2 — Complete profile</Text>
        </View>

        <Text style={styles.title}>One more thing 👍</Text>
        <Text style={styles.subtitle}>This helps us match you better. You can update anytime.</Text>

        {/* Driver section */}
        {isDriver && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🚛 Your Truck Details</Text>

            <Text style={styles.label}>TRUCK TYPE</Text>
            <View style={styles.chipGrid}>
              {TRUCK_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.chip, truckType === t.value && styles.chipActive]}
                  onPress={() => setTruckType(t.value)}
                >
                  <Text style={styles.chipIcon}>{t.icon}</Text>
                  <Text style={[styles.chipLabel, truckType === t.value && styles.chipLabelActive]}>
                    {t.label}
                  </Text>
                  <Text style={styles.chipDesc}>{t.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>VEHICLE NUMBER (OPTIONAL)</Text>
            <TextInput
              mode="outlined"
              placeholder="e.g. MH 12 AB 1234"
              value={plate}
              onChangeText={(t) => setPlate(t.toUpperCase())}
              style={styles.input}
              outlineStyle={{ borderRadius: RADIUS.md, borderColor: COLORS.border }}
              autoCapitalize="characters"
            />

            <Text style={styles.label}>YEARS OF EXPERIENCE (OPTIONAL)</Text>
            <TextInput
              mode="outlined"
              placeholder="e.g. 5"
              value={experience}
              onChangeText={setExperience}
              keyboardType="number-pad"
              style={styles.input}
              outlineStyle={{ borderRadius: RADIUS.md, borderColor: COLORS.border }}
            />
          </View>
        )}

        {/* Shipper section */}
        {isShipper && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📦 Business Details</Text>

            <Text style={styles.label}>COMPANY / BUSINESS NAME (OPTIONAL)</Text>
            <TextInput
              mode="outlined"
              placeholder="e.g. Kumar Enterprises"
              value={company}
              onChangeText={setCompany}
              style={styles.input}
              outlineStyle={{ borderRadius: RADIUS.md, borderColor: COLORS.border }}
            />

            <Text style={styles.label}>GST NUMBER (OPTIONAL)</Text>
            <TextInput
              mode="outlined"
              placeholder="e.g. 27AAPFU0939F1ZV"
              value={gst}
              onChangeText={(t) => setGst(t.toUpperCase())}
              style={styles.input}
              outlineStyle={{ borderRadius: RADIUS.md, borderColor: COLORS.border }}
              autoCapitalize="characters"
            />
          </View>
        )}

        <Button
          mode="contained"
          onPress={handleSave}
          loading={loading}
          disabled={loading}
          style={styles.btn}
          contentStyle={styles.btnContent}
          labelStyle={styles.btnLabel}
        >
          Save & Enter LooP
        </Button>

        <TouchableOpacity onPress={() => router.replace('/(app)/home')}>
          <Text style={styles.skip}>Skip for now — I'll complete this later</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl, gap: SPACING.sm },

  progress:      { gap: SPACING.xs, marginBottom: SPACING.xs },
  progressBar:   { height: 4, backgroundColor: COLORS.border, borderRadius: 2 },
  progressFill:  { height: 4, backgroundColor: COLORS.primary, borderRadius: 2 },
  progressText:  { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },

  title:    { fontSize: FONT_SIZE.xxxl, fontWeight: '800', color: COLORS.textPrimary, marginTop: SPACING.sm },
  subtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginBottom: SPACING.md },

  section:      { gap: SPACING.sm, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, ...SHADOWS.sm },
  sectionTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  label: {
    fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginTop: SPACING.xs,
  },

  chipGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: COLORS.background, borderRadius: RADIUS.full,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  chipActive:      { borderColor: COLORS.primary, backgroundColor: COLORS.background },
  chipIcon:        { fontSize: 16 },
  chipLabel:       { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textPrimary },
  chipLabelActive: { color: COLORS.primary },
  chipDesc:        { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },

  input:      { backgroundColor: COLORS.surface },
  btn:        { borderRadius: RADIUS.lg, marginTop: SPACING.md },
  btnContent: { paddingVertical: 8 },
  btnLabel:   { fontSize: FONT_SIZE.md, fontWeight: '700' },
  skip: {
    fontSize: FONT_SIZE.sm, color: COLORS.textSecondary,
    textAlign: 'center', padding: SPACING.sm,
  },
});
