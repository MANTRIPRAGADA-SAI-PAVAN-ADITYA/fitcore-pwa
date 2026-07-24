import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import { PricingOverride } from '../../../types';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOWS } from '../../../constants/theme';

export default function AdminPricingScreen() {
  const { profile } = useAuthStore();
  const [overrides, setOverrides] = useState<PricingOverride[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.role !== 'admin') { router.back(); return; }
    fetchPricing();
  }, []);

  async function fetchPricing() {
    const { data } = await supabase.from('pricing_overrides').select('*').order('key');
    const items = (data ?? []) as PricingOverride[];
    setOverrides(items);
    const initial: Record<string, string> = {};
    items.forEach((o) => { initial[o.key] = String(o.value); });
    setEdits(initial);
    setLoading(false);
  }

  async function saveOverride(key: string) {
    const val = parseFloat(edits[key]);
    if (isNaN(val) || val < 0) {
      Alert.alert('Invalid', 'Please enter a valid non-negative number.');
      return;
    }
    setSaving(key);
    const { error } = await supabase
      .from('pricing_overrides')
      .update({ value: val, updated_at: new Date().toISOString(), updated_by: profile!.id })
      .eq('key', key);
    setSaving(null);
    if (error) { Alert.alert('Error', error.message); return; }
    Alert.alert('Saved', `${key} updated to ${val}`);
    fetchPricing();
  }

  if (loading) return <View style={styles.centered}><ActivityIndicator color={COLORS.primary} size="large" /></View>;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Pricing Config</Text>
          <View style={{ width: 48 }} />
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            ⚙️ These settings take effect immediately for all new transactions. Changes are logged against your admin account.
          </Text>
        </View>

        {overrides.map((o) => (
          <View key={o.key} style={styles.configCard}>
            <View style={styles.configTop}>
              <View>
                <Text style={styles.configLabel}>{o.label}</Text>
                <Text style={styles.configKey}>{o.key}</Text>
              </View>
              <Text style={styles.configCurrent}>Current: {o.value}</Text>
            </View>
            <View style={styles.configRow}>
              <TextInput
                mode="outlined"
                keyboardType="decimal-pad"
                value={edits[o.key] ?? String(o.value)}
                onChangeText={(t) => setEdits((prev) => ({ ...prev, [o.key]: t }))}
                style={styles.configInput}
                outlineStyle={{ borderRadius: RADIUS.md }}
                dense
              />
              <Button
                mode="contained"
                onPress={() => saveOverride(o.key)}
                loading={saving === o.key}
                disabled={!!saving}
                style={styles.saveBtn}
                compact
              >
                Save
              </Button>
            </View>
            <Text style={styles.updatedAt}>
              Last updated: {new Date(o.updated_at).toLocaleString('en-IN')}
            </Text>
          </View>
        ))}

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>Rate Guide</Text>
          <Text style={styles.noteText}>• commission_pct — % taken from managed trip agreed price (e.g. 4 = 4%)</Text>
          <Text style={styles.noteText}>• ad_fee_flat — ₹ charged per ad listing post (0 = free during beta)</Text>
          <Text style={styles.noteText}>• credit_price_inr — price users pay per credit purchase (₹)</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { color: COLORS.primary, fontSize: FONT_SIZE.md },
  title: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.textPrimary },
  infoBox: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  infoText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, lineHeight: 18 },
  configCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, gap: SPACING.sm, ...SHADOWS.sm },
  configTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  configLabel: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.textPrimary },
  configKey: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, marginTop: 2, fontFamily: 'monospace' },
  configCurrent: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.primary },
  configRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' },
  configInput: { flex: 1, backgroundColor: COLORS.surface },
  saveBtn: { borderRadius: RADIUS.md },
  updatedAt: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },
  noteCard: { backgroundColor: COLORS.warningBg, borderRadius: RADIUS.lg, padding: SPACING.md, gap: SPACING.xs },
  noteTitle: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.warning, marginBottom: 4 },
  noteText: { fontSize: FONT_SIZE.xs, color: COLORS.warning, lineHeight: 18 },
});
