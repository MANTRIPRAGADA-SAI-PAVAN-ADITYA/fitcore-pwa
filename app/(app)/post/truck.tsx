import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, Alert
} from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { router } from 'expo-router';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../lib/supabase';
import { TruckType, ListingMode } from '../../../types';
import { TRUCK_LABELS, TRUCK_ICONS } from '../../../constants/pricing';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOWS } from '../../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

const TRUCK_TYPES: TruckType[] = ['mini', 'lcv', 'hcv', 'trailer', 'container'];

// Simple geocode using nominatim (free, no API key)
async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', India')}&format=json&limit=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'LooP-App/1.0' } });
    const data = await res.json();
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {}
  return null;
}

export default function PostTruckScreen() {
  const { profile } = useAuthStore();
  const [listingMode, setListingMode] = useState<ListingMode>('managed');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [truckType, setTruckType] = useState<TruckType | null>(null);
  const [capacity, setCapacity] = useState('');
  const [date, setDate] = useState('');
  const [pricePerKm, setPricePerKm] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  async function handlePost() {
    if (!origin.trim() || !destination.trim() || !truckType || !capacity || !date) {
      Alert.alert('Required', 'Please fill in all required fields.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert('Invalid date', 'Use format YYYY-MM-DD (e.g. 2024-12-25)');
      return;
    }
    setLoading(true);
    try {
      const [originGeo, destGeo] = await Promise.all([
        geocode(origin), geocode(destination),
      ]);

      const { error } = await supabase.from('trucks').insert({
        driver_id: profile!.id,
        origin: origin.trim(),
        origin_lat: originGeo?.lat ?? null,
        origin_lng: originGeo?.lng ?? null,
        destination: destination.trim(),
        dest_lat: destGeo?.lat ?? null,
        dest_lng: destGeo?.lng ?? null,
        truck_type: truckType,
        capacity_tons: parseFloat(capacity),
        available_date: date,
        price_per_km: pricePerKm ? parseFloat(pricePerKm) : null,
        notes: notes.trim() || null,
        listing_mode: listingMode,
      });
      if (error) throw error;
      Alert.alert('Posted!', 'Your truck listing is now live.', [
        { text: 'View Feed', onPress: () => router.replace('/(app)/feed/index') },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Post Truck Space</Text>
          <View style={{ width: 48 }} />
        </View>

        {/* Listing Mode */}
        <Text style={styles.sectionLabel}>Listing Mode</Text>
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeCard, listingMode === 'managed' && styles.modeCardActive]}
            onPress={() => setListingMode('managed')}
            activeOpacity={0.8}
          >
            <Text style={styles.modeIcon}>🛡️</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modeTitle, listingMode === 'managed' && styles.modeTitleActive]}>
                Managed
              </Text>
              <Text style={styles.modeDesc}>LooP handles escrow & bidding. Secure payments.</Text>
            </View>
            {listingMode === 'managed' && <View style={styles.modeCheck}><Text style={styles.modeCheckText}>✓</Text></View>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeCard, listingMode === 'ad' && styles.modeCardAdActive]}
            onPress={() => setListingMode('ad')}
            activeOpacity={0.8}
          >
            <Text style={styles.modeIcon}>📢</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modeTitle, listingMode === 'ad' && styles.modeTitleAd]}>
                Ad Mode
              </Text>
              <Text style={styles.modeDesc}>Contact directly. LooP is not responsible for payment.</Text>
            </View>
            {listingMode === 'ad' && <View style={[styles.modeCheck, { backgroundColor: COLORS.secondary }]}><Text style={styles.modeCheckText}>✓</Text></View>}
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>Route</Text>
        <TextInput
          mode="outlined"
          label="From (city / region)"
          placeholder="e.g. Mumbai, Maharashtra"
          value={origin}
          onChangeText={setOrigin}
          style={styles.input}
          outlineStyle={{ borderRadius: RADIUS.md }}
          left={<TextInput.Icon icon="map-marker" />}
        />
        <TextInput
          mode="outlined"
          label="To (city / region)"
          placeholder="e.g. Delhi, NCR"
          value={destination}
          onChangeText={setDestination}
          style={styles.input}
          outlineStyle={{ borderRadius: RADIUS.md }}
          left={<TextInput.Icon icon="flag" />}
        />

        <Text style={styles.sectionLabel}>Truck Type</Text>
        <View style={styles.chipRow}>
          {TRUCK_TYPES.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.chip, truckType === t && styles.chipActive]}
              onPress={() => setTruckType(t)}
            >
              <Text style={styles.chipIcon}>{TRUCK_ICONS[t]}</Text>
              <Text style={[styles.chipText, truckType === t && styles.chipTextActive]}>
                {TRUCK_LABELS[t].split(' ')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Capacity & Availability</Text>
        <View style={styles.row}>
          <TextInput
            mode="outlined"
            label="Capacity (tons)"
            keyboardType="decimal-pad"
            value={capacity}
            onChangeText={setCapacity}
            style={[styles.input, { flex: 1 }]}
            outlineStyle={{ borderRadius: RADIUS.md }}
          />
          <TextInput
            mode="outlined"
            label="Available Date"
            placeholder="YYYY-MM-DD"
            value={date}
            onChangeText={setDate}
            style={[styles.input, { flex: 1 }]}
            outlineStyle={{ borderRadius: RADIUS.md }}
          />
        </View>

        <Text style={styles.sectionLabel}>
          {listingMode === 'managed' ? 'Expected Rate (optional)' : 'Asking Price (optional)'}
        </Text>
        <TextInput
          mode="outlined"
          label={listingMode === 'managed' ? 'Target price per km (₹)' : 'Asking price per km (₹)'}
          keyboardType="decimal-pad"
          value={pricePerKm}
          onChangeText={setPricePerKm}
          placeholder={listingMode === 'managed' ? 'Shippers will bid on this' : 'Leave blank for estimated pricing'}
          style={styles.input}
          outlineStyle={{ borderRadius: RADIUS.md }}
          left={<TextInput.Icon icon="currency-inr" />}
        />

        <Text style={styles.sectionLabel}>Notes (optional)</Text>
        <TextInput
          mode="outlined"
          label="Any special notes"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          style={styles.input}
          outlineStyle={{ borderRadius: RADIUS.md }}
        />

        {listingMode === 'managed' && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              🛡️ Managed Mode: LooP will collect bids from load owners. You review and accept the best offer. Payment held in escrow until delivery. LooP charges a 4% platform fee on successful trips.
            </Text>
          </View>
        )}
        {listingMode === 'ad' && (
          <View style={[styles.infoBox, { backgroundColor: COLORS.warningBg }]}>
            <Text style={[styles.infoText, { color: '#7C5000' }]}>
              📢 Ad Mode: Your contact is unlocked by shippers using 1 credit. You negotiate and pay directly. LooP is not responsible for disputes or payment.
            </Text>
          </View>
        )}

        <Button
          mode="contained"
          onPress={handlePost}
          loading={loading}
          disabled={loading}
          style={styles.btn}
          contentStyle={styles.btnContent}
          labelStyle={styles.btnLabel}
          icon="truck"
          buttonColor={listingMode === 'managed' ? COLORS.primary : COLORS.secondary}
        >
          Post Truck Space
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  content: { padding: SPACING.md, gap: 4, paddingBottom: SPACING.xxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  back: { color: COLORS.primary, fontSize: FONT_SIZE.md },
  title: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.textPrimary },
  sectionLabel: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: SPACING.sm },
  input: { backgroundColor: COLORS.surface },
  row: { flexDirection: 'row', gap: SPACING.sm },
  modeRow: { gap: SPACING.sm },
  modeCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.md, borderWidth: 2, borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  modeCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.background },
  modeCardAdActive: { borderColor: COLORS.secondary, backgroundColor: COLORS.warningBg },
  modeIcon: { fontSize: 24 },
  modeTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.textPrimary },
  modeTitleActive: { color: COLORS.primary },
  modeTitleAd: { color: COLORS.secondary },
  modeDesc: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2, lineHeight: 16 },
  modeCheck: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  modeCheckText: { color: COLORS.textInverse, fontSize: 12, fontWeight: '800' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderWidth: 1.5, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  chipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.background },
  chipIcon: { fontSize: 16 },
  chipText: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.primary },
  infoBox: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  infoText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, lineHeight: 18 },
  btn: { borderRadius: RADIUS.lg, marginTop: SPACING.lg },
  btnContent: { paddingVertical: 8 },
  btnLabel: { fontSize: FONT_SIZE.md, fontWeight: '700' },
});
