import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import { Trip, TripLocation } from '../../../types';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOWS } from '../../../constants/theme';

export default function TrackTripScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { profile } = useAuthStore();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [loading, setLoading] = useState(true);
  const watchRef = useRef<number | null>(null);

  const isDriver = trip?.driver_id === profile?.id;

  useEffect(() => {
    fetchTrip();
    fetchLastLocation();
    subscribeToLocation();
    return () => stopSharing();
  }, [tripId]);

  async function fetchTrip() {
    const { data } = await supabase
      .from('trips')
      .select('*, driver:profiles!trips_driver_id_fkey(id,name,phone), shipper:profiles!trips_shipper_id_fkey(id,name,phone)')
      .eq('id', tripId)
      .single();
    setTrip(data as Trip);
    setLoading(false);
  }

  async function fetchLastLocation() {
    const { data } = await supabase
      .from('trip_locations')
      .select('lat,lng')
      .eq('trip_id', tripId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) setDriverLocation({ lat: data.lat, lng: data.lng });
  }

  function subscribeToLocation() {
    const channel = supabase
      .channel(`tracking:${tripId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'trip_locations', filter: `trip_id=eq.${tripId}` },
        (payload) => {
          const loc = payload.new as TripLocation;
          setDriverLocation({ lat: loc.lat, lng: loc.lng });
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }

  function startSharing() {
    if (!navigator?.geolocation) {
      Alert.alert('Not supported', 'Geolocation is not available on this device.');
      return;
    }
    setIsSharing(true);
    watchRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { coords } = pos;
        await supabase.from('trip_locations').insert({
          trip_id: tripId,
          driver_id: profile!.id,
          lat: coords.latitude,
          lng: coords.longitude,
        });
        setDriverLocation({ lat: coords.latitude, lng: coords.longitude });
      },
      (err) => {
        Alert.alert('Location Error', err.message);
        setIsSharing(false);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
  }

  function stopSharing() {
    if (watchRef.current !== null && navigator?.geolocation) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    setIsSharing(false);
  }

  if (loading || !trip) {
    return <View style={styles.centered}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  }

  const driver = trip.driver;
  const shipper = trip.shipper;
  const other = isDriver ? shipper : driver;
  const otherRole = isDriver ? 'Shipper' : 'Driver';

  const hasLocation = !!driverLocation;
  const mapsUrl = driverLocation
    ? `https://www.google.com/maps?q=${driverLocation.lat},${driverLocation.lng}`
    : null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Live Tracking</Text>
        <View style={{ width: 48 }} />
      </View>

      <View style={styles.content}>
        {/* Status card */}
        <View style={styles.statusCard}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Trip In Transit</Text>
        </View>

        {/* Participants */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Parties</Text>
          <View style={styles.partyRow}>
            <View style={styles.partyAvatar}>
              <Text style={styles.partyIcon}>🚛</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.partyName}>{driver?.name ?? 'Driver'}</Text>
              <Text style={styles.partyRole}>Driver</Text>
            </View>
            {isDriver && <View style={[styles.youBadge]}><Text style={styles.youText}>You</Text></View>}
          </View>
          <View style={[styles.partyRow, { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm }]}>
            <View style={styles.partyAvatar}>
              <Text style={styles.partyIcon}>📦</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.partyName}>{shipper?.name ?? 'Shipper'}</Text>
              <Text style={styles.partyRole}>Shipper</Text>
            </View>
            {!isDriver && <View style={styles.youBadge}><Text style={styles.youText}>You</Text></View>}
          </View>
        </View>

        {/* Location card */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Driver Location</Text>

          {hasLocation ? (
            <View style={styles.locationBox}>
              <Text style={styles.locationIcon}>📍</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.coordText}>
                  {driverLocation!.lat.toFixed(5)}, {driverLocation!.lng.toFixed(5)}
                </Text>
                <Text style={styles.locationHint}>Last updated just now</Text>
              </View>
            </View>
          ) : (
            <View style={styles.noLocation}>
              <Text style={styles.noLocationText}>
                {isDriver
                  ? 'Your location is not being shared yet. Tap "Start Sharing" to begin.'
                  : 'Waiting for driver to share location...'}
              </Text>
            </View>
          )}

          {hasLocation && mapsUrl && !isDriver && (
            <Button
              mode="outlined"
              icon="map"
              onPress={() => {
                if (Platform.OS === 'web') window.open(mapsUrl, '_blank');
              }}
              style={styles.mapBtn}
            >
              Open in Google Maps
            </Button>
          )}
        </View>

        {/* Driver controls */}
        {isDriver && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Location Sharing</Text>
            {isSharing ? (
              <View style={styles.sharingRow}>
                <View style={styles.sharingPulse} />
                <Text style={styles.sharingText}>Sharing live location with shipper</Text>
                <Button mode="outlined" onPress={stopSharing} textColor={COLORS.danger} compact>Stop</Button>
              </View>
            ) : (
              <Button
                mode="contained"
                icon="crosshairs-gps"
                onPress={startSharing}
                style={styles.shareBtn}
                contentStyle={{ paddingVertical: 6 }}
              >
                Start Sharing Location
              </Button>
            )}
            <Text style={styles.sharingNote}>
              Your location updates every few seconds. Stop sharing once the trip is complete.
            </Text>
          </View>
        )}

        {/* Contact other party */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>{otherRole}</Text>
          <View style={styles.contactRow}>
            <Text style={styles.contactName}>{other?.name ?? otherRole}</Text>
            {other?.phone && (
              <TouchableOpacity
                style={styles.callBtn}
                onPress={() => {
                  if (Platform.OS === 'web') window.open(`tel:${other.phone}`, '_self');
                }}
              >
                <Text style={styles.callBtnText}>📞 Call</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.md,
  },
  back: { color: COLORS.primary, fontSize: FONT_SIZE.md },
  title: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.textPrimary },
  content: { flex: 1, padding: SPACING.md, gap: SPACING.md },
  statusCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: '#E8F8EE', borderRadius: RADIUS.lg, padding: SPACING.md,
  },
  statusDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.success,
  },
  statusText: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.success },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, gap: SPACING.md, ...SHADOWS.sm },
  sectionLabel: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.textTertiary, textTransform: 'uppercase', letterSpacing: 0.8 },
  partyRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  partyAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center',
  },
  partyIcon: { fontSize: 20 },
  partyName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.textPrimary },
  partyRole: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  youBadge: { backgroundColor: COLORS.primary + '20', paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.full },
  youText: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.primary },
  locationBox: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  locationIcon: { fontSize: 24 },
  coordText: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.primary },
  locationHint: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, marginTop: 2 },
  noLocation: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.md },
  noLocationText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 20, textAlign: 'center' },
  mapBtn: { borderRadius: RADIUS.md },
  sharingRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: '#E8F8EE', borderRadius: RADIUS.md, padding: SPACING.md },
  sharingPulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.success },
  sharingText: { flex: 1, fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.success },
  shareBtn: { borderRadius: RADIUS.md },
  sharingNote: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, lineHeight: 18 },
  contactRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  contactName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.textPrimary },
  callBtn: { backgroundColor: '#E8F8EE', borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: 8 },
  callBtnText: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.success },
});
