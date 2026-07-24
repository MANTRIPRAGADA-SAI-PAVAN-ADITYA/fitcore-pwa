import React, { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, Modal
} from 'react-native';
import { Text, Button, ActivityIndicator, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import { Trip, TripStatus } from '../../../types';
import Badge from '../../../components/ui/Badge';
import EmptyState from '../../../components/ui/EmptyState';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOWS } from '../../../constants/theme';

const STATUS_CONFIG: Record<TripStatus, { label: string; icon: string; variant: any; color: string }> = {
  pending:    { label: 'Pending',    icon: '⏳', variant: 'warning',  color: COLORS.warning },
  confirmed:  { label: 'Confirmed',  icon: '✅', variant: 'success',  color: COLORS.success },
  in_transit: { label: 'In Transit', icon: '🚛', variant: 'primary',  color: COLORS.primary },
  delivered:  { label: 'Delivered',  icon: '🎉', variant: 'success',  color: COLORS.success },
  cancelled:  { label: 'Cancelled',  icon: '❌', variant: 'danger',   color: COLORS.danger },
};

const NEXT_STATUS: Partial<Record<TripStatus, TripStatus>> = {
  pending:    'confirmed',
  confirmed:  'in_transit',
  in_transit: 'delivered',
};

const NEXT_LABEL: Partial<Record<TripStatus, string>> = {
  pending:    'Confirm Trip',
  confirmed:  'Mark In Transit',
  in_transit: 'Mark Delivered',
};

export default function TripsScreen() {
  const { profile } = useAuthStore();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [ratingTrip, setRatingTrip] = useState<Trip | null>(null);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratedTripIds, setRatedTripIds] = useState<Set<string>>(new Set());

  const fetchTrips = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('trips')
      .select(`
        *,
        driver:profiles!trips_driver_id_fkey(id, name, phone),
        shipper:profiles!trips_shipper_id_fkey(id, name, phone),
        truck:trucks(id, truck_type, capacity_tons, origin, destination),
        load:loads(id, load_type, weight_tons, origin, destination)
      `)
      .or(`driver_id.eq.${profile.id},shipper_id.eq.${profile.id}`)
      .order('created_at', { ascending: false });
    setTrips((data ?? []) as Trip[]);
    setLoading(false);
    setRefreshing(false);
  }, [profile]);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);
  function onRefresh() { setRefreshing(true); fetchTrips(); }

  async function fetchRatedTrips() {
    if (!profile) return;
    const { data } = await supabase.from('ratings').select('trip_id').eq('rater_id', profile.id);
    setRatedTripIds(new Set((data ?? []).map((r: any) => r.trip_id)));
  }

  useEffect(() => { fetchRatedTrips(); }, [profile]);

  async function submitRating() {
    if (!ratingTrip || !profile) return;
    setRatingLoading(true);
    try {
      const myRoleStr = ratingTrip.driver_id === profile.id ? 'driver' : 'shipper';
      const ratedId = myRoleStr === 'driver' ? ratingTrip.shipper_id : ratingTrip.driver_id;
      const { error } = await supabase.from('ratings').insert({
        trip_id: ratingTrip.id,
        rater_id: profile.id,
        rated_id: ratedId,
        score: ratingScore,
        comment: ratingComment.trim() || null,
        role: myRoleStr,
      });
      if (error) throw error;
      setRatedTripIds((prev) => new Set([...prev, ratingTrip.id]));
      setRatingTrip(null);
      setRatingComment('');
      setRatingScore(5);
      Alert.alert('Rating Submitted', 'Thank you for your feedback!');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setRatingLoading(false);
    }
  }

  async function updateStatus(tripId: string, nextStatus: TripStatus) {
    setUpdating(tripId);
    const { error } = await supabase
      .from('trips')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', tripId);
    setUpdating(null);
    if (error) { Alert.alert('Error', error.message); return; }
    fetchTrips();
  }

  async function cancelTrip(tripId: string) {
    Alert.alert(
      'Cancel Trip',
      'Are you sure you want to cancel this trip?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Cancel Trip', style: 'destructive',
          onPress: () => updateStatus(tripId, 'cancelled'),
        },
      ]
    );
  }

  const myRole = (trip: Trip) => trip.driver_id === profile?.id ? 'driver' : 'shipper';
  const counterpart = (trip: Trip) => myRole(trip) === 'driver' ? trip.shipper : trip.driver;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>My Trips</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(t) => t.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon="🚛"
              title="No trips yet"
              subtitle="Trips appear here after you connect with a driver or shipper and create a trip together."
            />
          }
          renderItem={({ item: trip }) => {
            const status = STATUS_CONFIG[trip.status];
            const other = counterpart(trip);
            const nextStatus = NEXT_STATUS[trip.status];
            const canAdvance = trip.status !== 'delivered' && trip.status !== 'cancelled';
            const canCancel = trip.status === 'pending' || trip.status === 'confirmed';
            const isUpdating = updating === trip.id;
            const canRate = trip.status === 'delivered' && !ratedTripIds.has(trip.id);

            return (
              <View style={styles.tripCard}>
                {/* Status bar */}
                <View style={[styles.statusBar, { backgroundColor: status.color }]}>
                  <Text style={styles.statusIcon}>{status.icon}</Text>
                  <Text style={styles.statusLabel}>{status.label}</Text>
                </View>

                <View style={styles.tripBody}>
                  {/* Route */}
                  <View style={styles.routeRow}>
                    <View style={styles.routePoint}>
                      <View style={[styles.dot, { backgroundColor: COLORS.success }]} />
                      <Text style={styles.routeCity} numberOfLines={1}>
                        {trip.truck?.origin ?? trip.load?.origin ?? '—'}
                      </Text>
                    </View>
                    <Text style={styles.arrow}>→</Text>
                    <View style={styles.routePoint}>
                      <View style={[styles.dot, { backgroundColor: COLORS.danger }]} />
                      <Text style={styles.routeCity} numberOfLines={1}>
                        {trip.truck?.destination ?? trip.load?.destination ?? '—'}
                      </Text>
                    </View>
                  </View>

                  {/* Details row */}
                  <View style={styles.detailsRow}>
                    {trip.truck && (
                      <Badge label={`🚛 ${trip.truck.truck_type.toUpperCase()}`} variant="neutral" />
                    )}
                    {trip.load && (
                      <Badge label={`📦 ${trip.load.weight_tons}T`} variant="neutral" />
                    )}
                    {trip.agreed_price && (
                      <Badge label={`₹${trip.agreed_price.toLocaleString('en-IN')}`} variant="primary" />
                    )}
                  </View>

                  {/* Counterpart */}
                  <View style={styles.contactRow}>
                    <Text style={styles.contactIcon}>{myRole(trip) === 'driver' ? '📦' : '🚛'}</Text>
                    <View>
                      <Text style={styles.contactName}>{other?.name ?? 'Partner'}</Text>
                      <Text style={styles.contactRole}>{myRole(trip) === 'driver' ? 'Shipper' : 'Driver'}</Text>
                    </View>
                    {other?.phone && (
                      <TouchableOpacity
                        style={styles.callBtn}
                        onPress={() => other.phone && Alert.alert(other.name ?? 'Contact', other.phone ?? '')}
                      >
                        <Text style={styles.callBtnText}>📞 Call</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Date */}
                  <Text style={styles.dateText}>
                    Created {new Date(trip.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>

                  {/* Actions */}
                  {canAdvance && nextStatus && (
                    <Button
                      mode="contained"
                      onPress={() => updateStatus(trip.id, nextStatus)}
                      loading={isUpdating}
                      disabled={isUpdating}
                      style={styles.actionBtn}
                      contentStyle={styles.actionBtnContent}
                    >
                      {NEXT_LABEL[trip.status]}
                    </Button>
                  )}
                  {canCancel && (
                    <Button
                      mode="text"
                      onPress={() => cancelTrip(trip.id)}
                      disabled={isUpdating}
                      textColor={COLORS.danger}
                    >
                      Cancel Trip
                    </Button>
                  )}
                  {/* GPS Tracking — driver can share, shipper can track */}
                  {trip.status === 'in_transit' && (
                    <Button
                      mode="outlined"
                      icon="crosshairs-gps"
                      onPress={() => router.push({ pathname: '/(app)/trips/track', params: { tripId: trip.id } })}
                      style={styles.trackBtn}
                    >
                      {myRole(trip) === 'driver' ? 'Share Location' : 'Track Driver'}
                    </Button>
                  )}
                  {canRate && (
                    <Button
                      mode="outlined"
                      icon="star"
                      onPress={() => { setRatingTrip(trip); setRatingScore(5); setRatingComment(''); }}
                      style={styles.rateBtn}
                    >
                      Rate Your Partner
                    </Button>
                  )}
                  {trip.status === 'delivered' && ratedTripIds.has(trip.id) && (
                    <Text style={styles.ratedText}>⭐ Rated</Text>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Rating Modal */}
      <Modal
        visible={!!ratingTrip}
        animationType="slide"
        transparent
        onRequestClose={() => setRatingTrip(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Rate Your Partner</Text>
            {ratingTrip && (
              <Text style={styles.modalSubtitle}>
                {myRole(ratingTrip) === 'driver' ? counterpart(ratingTrip)?.name ?? 'Shipper' : counterpart(ratingTrip)?.name ?? 'Driver'}
              </Text>
            )}

            <Text style={styles.modalLabel}>SCORE</Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => setRatingScore(s)} style={styles.starBtn}>
                  <Text style={[styles.starIcon, s <= ratingScore && styles.starActive]}>★</Text>
                </TouchableOpacity>
              ))}
              <Text style={styles.scoreLabel}>{ratingScore}/5</Text>
            </View>

            <Text style={styles.modalLabel}>COMMENT (OPTIONAL)</Text>
            <TextInput
              mode="outlined"
              value={ratingComment}
              onChangeText={setRatingComment}
              placeholder="Share your experience..."
              multiline
              numberOfLines={3}
              style={styles.modalInput}
              outlineStyle={{ borderRadius: RADIUS.md }}
            />

            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setRatingTrip(null)} style={{ flex: 1 }} textColor={COLORS.textSecondary}>Skip</Button>
              <Button mode="contained" onPress={submitRating} loading={ratingLoading} disabled={ratingLoading} style={{ flex: 1 }} icon="star">Submit</Button>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: SPACING.md, paddingBottom: SPACING.sm },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary },
  list: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxl },
  tripCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  statusIcon: { fontSize: 16 },
  statusLabel: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: '#fff' },
  tripBody: { padding: SPACING.md, gap: SPACING.sm },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  routePoint: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  routeCity: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.textPrimary, flex: 1 },
  arrow: { fontSize: 18, color: COLORS.textTertiary },
  detailsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border },
  contactIcon: { fontSize: 24 },
  contactName: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textPrimary },
  contactRole: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  callBtn: { marginLeft: 'auto', backgroundColor: '#E8F8EE', borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: 6 },
  callBtnText: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.success },
  dateText: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },
  actionBtn: { borderRadius: RADIUS.md, marginTop: SPACING.xs },
  actionBtnContent: { paddingVertical: 4 },
  trackBtn: { borderRadius: RADIUS.md, marginTop: SPACING.xs },
  rateBtn: { borderRadius: RADIUS.md, marginTop: SPACING.xs, borderColor: COLORS.warning },
  ratedText: { fontSize: FONT_SIZE.xs, color: COLORS.warning, fontWeight: '600', textAlign: 'center', paddingTop: SPACING.xs },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.xl, gap: SPACING.md, paddingBottom: SPACING.xxl },
  modalTitle: { fontSize: FONT_SIZE.xxl, fontWeight: '800', color: COLORS.textPrimary },
  modalSubtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: -SPACING.sm },
  modalLabel: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.textTertiary, textTransform: 'uppercase', letterSpacing: 0.8 },
  modalInput: { backgroundColor: COLORS.surface },
  modalActions: { flexDirection: 'row', gap: SPACING.sm },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  starBtn: { padding: 4 },
  starIcon: { fontSize: 32, color: COLORS.border },
  starActive: { color: '#FFD700' },
  scoreLabel: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.textPrimary, marginLeft: SPACING.sm },
});
