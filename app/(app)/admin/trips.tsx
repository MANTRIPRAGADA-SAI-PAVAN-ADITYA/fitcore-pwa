import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import { Trip, TripStatus } from '../../../types';
import Badge from '../../../components/ui/Badge';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOWS } from '../../../constants/theme';

const STATUS_COLOR: Record<TripStatus, string> = {
  pending: COLORS.warning, confirmed: COLORS.primary,
  in_transit: COLORS.primary, delivered: COLORS.success, cancelled: COLORS.danger,
};
const STATUS_VARIANT: Record<TripStatus, any> = {
  pending: 'warning', confirmed: 'primary', in_transit: 'primary', delivered: 'success', cancelled: 'danger',
};

export default function AdminTripsScreen() {
  const { profile } = useAuthStore();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TripStatus | 'all'>('all');

  const fetchTrips = useCallback(async () => {
    let query = supabase
      .from('trips')
      .select(`
        *,
        driver:profiles!trips_driver_id_fkey(id,name,phone),
        shipper:profiles!trips_shipper_id_fkey(id,name,phone),
        truck:trucks(id,truck_type,origin,destination),
        load:loads(id,load_type,weight_tons,origin,destination)
      `)
      .order('created_at', { ascending: false })
      .limit(100);
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    const { data } = await query;
    setTrips((data ?? []) as Trip[]);
    setLoading(false);
    setRefreshing(false);
  }, [statusFilter]);

  useEffect(() => {
    if (profile?.role !== 'admin') { router.back(); return; }
    fetchTrips();
  }, [fetchTrips]);

  async function forceCancel(tripId: string) {
    Alert.alert('Cancel Trip', 'Force-cancel this trip as admin?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel', style: 'destructive',
        onPress: async () => {
          await supabase.from('trips').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', tripId);
          fetchTrips();
        },
      },
    ]);
  }

  const FILTERS: (TripStatus | 'all')[] = ['all', 'pending', 'confirmed', 'in_transit', 'delivered', 'cancelled'];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>All Trips</Text>
        <View style={{ width: 48 }} />
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, statusFilter === f && styles.filterChipActive]}
            onPress={() => setStatusFilter(f)}
          >
            <Text style={[styles.filterText, statusFilter === f && styles.filterTextActive]}>
              {f === 'all' ? 'All' : f.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTrips(); }} />}
          ListEmptyComponent={<Text style={styles.empty}>No {statusFilter !== 'all' ? statusFilter : ''} trips</Text>}
          renderItem={({ item: trip }) => (
            <View style={styles.tripCard}>
              <View style={styles.tripTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tripRoute}>
                    {trip.truck?.origin ?? trip.load?.origin ?? '?'} → {trip.truck?.destination ?? trip.load?.destination ?? '?'}
                  </Text>
                  <Text style={styles.tripDate}>
                    {new Date(trip.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
                <Badge label={trip.status.replace('_', ' ')} variant={STATUS_VARIANT[trip.status]} />
              </View>

              <View style={styles.tripParties}>
                <View style={styles.partyRow}>
                  <Text style={styles.partyIcon}>🚛</Text>
                  <Text style={styles.partyName}>{trip.driver?.name ?? '—'}</Text>
                  {trip.driver?.phone && <Text style={styles.partyPhone}>{trip.driver.phone}</Text>}
                </View>
                <View style={styles.partyRow}>
                  <Text style={styles.partyIcon}>📦</Text>
                  <Text style={styles.partyName}>{trip.shipper?.name ?? '—'}</Text>
                  {trip.shipper?.phone && <Text style={styles.partyPhone}>{trip.shipper.phone}</Text>}
                </View>
              </View>

              {trip.agreed_price && (
                <Text style={styles.priceText}>Agreed: ₹{trip.agreed_price.toLocaleString('en-IN')}</Text>
              )}

              {(trip.status === 'pending' || trip.status === 'confirmed' || trip.status === 'in_transit') && (
                <Button
                  mode="text"
                  onPress={() => forceCancel(trip.id)}
                  textColor={COLORS.danger}
                  compact
                >
                  Force Cancel (Admin)
                </Button>
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
  filterRow: { flexDirection: 'row', gap: SPACING.xs, paddingHorizontal: SPACING.md, flexWrap: 'wrap', marginBottom: SPACING.sm },
  filterChip: { paddingHorizontal: SPACING.sm, paddingVertical: 5, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: FONT_SIZE.xs, fontWeight: '600', color: COLORS.textSecondary },
  filterTextActive: { color: COLORS.textInverse },
  list: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxl },
  empty: { textAlign: 'center', color: COLORS.textTertiary, marginTop: SPACING.xl },
  tripCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, gap: SPACING.sm, ...SHADOWS.sm },
  tripTop: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  tripRoute: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.textPrimary },
  tripDate: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, marginTop: 2 },
  tripParties: { gap: SPACING.xs },
  partyRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  partyIcon: { fontSize: 16 },
  partyName: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textPrimary },
  partyPhone: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginLeft: 'auto' },
  priceText: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.success },
});
