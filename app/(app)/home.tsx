import React, { useCallback, useRef, useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import RouteMap from '../../components/map/RouteMap';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Truck, Load } from '../../types';
import TruckCard from '../../components/cards/TruckCard';
import LoadCard from '../../components/cards/LoadCard';
import Badge from '../../components/ui/Badge';
import { estimatePriceSync, haversineKm } from '../../lib/pricing';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOWS } from '../../constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const INDIA_REGION = { latitude: 20.5937, longitude: 78.9629, latitudeDelta: 20, longitudeDelta: 20 };

type FeedType = 'trucks' | 'loads';

export default function HomeScreen() {
  const { profile } = useAuthStore();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['25%', '60%', '92%'], []);

  // drivers look for loads; shippers/both start on trucks; default trucks
  const [feedType, setFeedType] = useState<FeedType>(profile?.role === 'driver' ? 'loads' : 'trucks');
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetchListings();
    fetchUnlocks();
  }, []);

  async function fetchListings() {
    setLoading(true);
    const [{ data: truckData }, { data: loadData }] = await Promise.all([
      supabase.from('trucks').select('*, driver:profiles(id,name,phone,company,kyc_status)').eq('status', 'active').order('created_at', { ascending: false }).limit(50),
      supabase.from('loads').select('*, shipper:profiles(id,name,phone,company,kyc_status)').eq('status', 'active').order('created_at', { ascending: false }).limit(50),
    ]);
    setTrucks((truckData ?? []) as Truck[]);
    setLoads((loadData ?? []) as Load[]);
    setLoading(false);
  }

  async function fetchUnlocks() {
    if (!profile) return;
    const { data } = await supabase
      .from('unlocks')
      .select('listing_id')
      .eq('unlocker_id', profile.id);
    setUnlockedIds(new Set((data ?? []).map((u: any) => u.listing_id)));
  }

  const getMarkers = () => {
    if (feedType === 'trucks') {
      return trucks.filter((t) => t.origin_lat && t.origin_lng).map((t) => ({
        id: t.id, lat: t.origin_lat!, lng: t.origin_lng!,
        destLat: t.dest_lat, destLng: t.dest_lng,
        label: '🚛', title: `${t.truck_type.toUpperCase()} • ${t.capacity_tons}T`,
      }));
    }
    return loads.filter((l) => l.origin_lat && l.origin_lng).map((l) => ({
      id: l.id, lat: l.origin_lat!, lng: l.origin_lng!,
      destLat: l.dest_lat, destLng: l.dest_lng,
      label: '📦', title: `${l.weight_tons}T • ${l.load_type}`,
    }));
  };

  const selected = feedType === 'trucks'
    ? trucks.find((t) => t.id === selectedId)
    : loads.find((l) => l.id === selectedId);

  return (
    <View style={styles.container}>
      {/* Map */}
      <View style={styles.map}>
        <RouteMap
          region={INDIA_REGION}
          markers={getMarkers()}
          selectedId={selectedId}
          routeColor={feedType === 'trucks' ? COLORS.primary : COLORS.secondary}
          onMarkerPress={(id) => {
            setSelectedId(id);
            bottomSheetRef.current?.snapToIndex(1);
          }}
        />
      </View>

      {/* Top bar */}
      <SafeAreaView style={styles.topBar} edges={['top']}>
        <View style={styles.topContent}>
          <Text style={styles.appName}>LooP</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggle, feedType === 'trucks' && styles.toggleActive]}
              onPress={() => setFeedType('trucks')}
            >
              <Text style={[styles.toggleText, feedType === 'trucks' && styles.toggleTextActive]}>
                🚛 Trucks
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggle, feedType === 'loads' && styles.toggleActive]}
              onPress={() => setFeedType('loads')}
            >
              <Text style={[styles.toggleText, feedType === 'loads' && styles.toggleTextActive]}>
                📦 Loads
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.creditPill}>
            <Text style={styles.creditText}>⚡ {profile?.credits ?? 0}</Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Bottom sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={1}
        snapPoints={snapPoints}
        backgroundStyle={styles.sheet}
        handleIndicatorStyle={styles.handle}
      >
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>
            {feedType === 'trucks'
              ? `${trucks.length} Trucks Available`
              : `${loads.length} Loads Available`}
          </Text>
          <TouchableOpacity onPress={() => router.push('/(app)/feed/index')}>
            <Text style={styles.seeAll}>See all →</Text>
          </TouchableOpacity>
        </View>

        <BottomSheetFlatList
          data={feedType === 'trucks' ? trucks.slice(0, 20) : loads.slice(0, 20)}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isUnlocked = unlockedIds.has(item.id);
            if (feedType === 'trucks') {
              const truck = item as Truck;
              const dist = (truck.origin_lat && truck.dest_lat)
                ? haversineKm(truck.origin_lat, truck.origin_lng!, truck.dest_lat, truck.dest_lng!)
                : 800;
              const estimate = estimatePriceSync(truck.truck_type, 'general', dist);
              return (
                <TruckCard
                  truck={truck}
                  onPress={() => router.push({ pathname: '/(app)/feed/[id]', params: { id: truck.id, type: 'truck' } })}
                  estimatedPrice={estimate.estimated_price}
                  demandLevel={estimate.demand_level}
                  distanceKm={dist}
                  isUnlocked={isUnlocked}
                />
              );
            } else {
              const load = item as Load;
              const dist = (load.origin_lat && load.dest_lat)
                ? haversineKm(load.origin_lat, load.origin_lng!, load.dest_lat, load.dest_lng!)
                : 800;
              const estimate = estimatePriceSync('hcv', load.load_type, dist);
              return (
                <LoadCard
                  load={load}
                  onPress={() => router.push({ pathname: '/(app)/feed/[id]', params: { id: load.id, type: 'load' } })}
                  estimatedPrice={estimate.estimated_price}
                  demandLevel={estimate.demand_level}
                  distanceKm={dist}
                  isUnlocked={isUnlocked}
                />
              );
            }
          }}
        />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
  },
  topContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.sm,
    paddingHorizontal: SPACING.md,
    ...SHADOWS.md,
  },
  appName: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  toggleRow: { flexDirection: 'row', gap: SPACING.xs },
  toggle: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.background,
  },
  toggleActive: { backgroundColor: COLORS.primary },
  toggleText: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textSecondary },
  toggleTextActive: { color: COLORS.textInverse },
  creditPill: {
    backgroundColor: COLORS.warningBg,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  creditText: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.secondary },
  sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  handle: { backgroundColor: COLORS.border, width: 40 },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  sheetTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.textPrimary },
  seeAll: { fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: '600' },
  listContent: { paddingBottom: SPACING.xxl },
});
