import React, { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  TextInput as RNInput, ScrollView, Switch,
} from 'react-native';
import { Text, ActivityIndicator, Modal, Portal } from 'react-native-paper';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import { Truck, Load, TruckType } from '../../../types';
import TruckCard from '../../../components/cards/TruckCard';
import LoadCard from '../../../components/cards/LoadCard';
import EmptyState from '../../../components/ui/EmptyState';
import { estimatePriceSync, haversineKm } from '../../../lib/pricing';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOWS } from '../../../constants/theme';

type FeedType   = 'trucks' | 'loads';
type ModeFilter = 'all' | 'ad' | 'managed';

const TRUCK_TYPE_OPTS: { value: TruckType | 'all'; label: string }[] = [
  { value: 'all',       label: 'All' },
  { value: 'mini',      label: '🛺 Mini' },
  { value: 'lcv',       label: '🚐 LCV' },
  { value: 'hcv',       label: '🚛 HCV' },
  { value: 'trailer',   label: '🚚 Trailer' },
  { value: 'container', label: '📦 Container' },
];

export default function FeedScreen() {
  const { profile } = useAuthStore();
  const [feedType, setFeedType] = useState<FeedType>(profile?.role === 'driver' ? 'loads' : 'trucks');
  const [trucks, setTrucks]       = useState<Truck[]>([]);
  const [loads, setLoads]         = useState<Load[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]       = useState('');
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [unreadCount, setUnreadCount] = useState(0);

  // Applied filters
  const [filterVerifiedOnly, setFilterVerifiedOnly] = useState(false);
  const [filterMode, setFilterMode]           = useState<ModeFilter>('all');
  const [filterTruckType, setFilterTruckType] = useState<TruckType | 'all'>('all');

  // Pending (inside modal before Apply)
  const [filterVisible, setFilterVisible]     = useState(false);
  const [pendingVerified, setPendingVerified]   = useState(false);
  const [pendingMode, setPendingMode]           = useState<ModeFilter>('all');
  const [pendingTruckType, setPendingTruckType] = useState<TruckType | 'all'>('all');

  const isFiltered = filterVerifiedOnly || filterMode !== 'all' || filterTruckType !== 'all';

  const fetchData = useCallback(async () => {
    const [{ data: td }, { data: ld }, { data: ud }] = await Promise.all([
      supabase.from('trucks').select('*, driver:profiles(id,name,phone,company,kyc_status)').eq('status', 'active').order('created_at', { ascending: false }),
      supabase.from('loads').select('*, shipper:profiles(id,name,phone,company,kyc_status)').eq('status', 'active').order('created_at', { ascending: false }),
      supabase.from('unlocks').select('listing_id').eq('unlocker_id', profile!.id),
    ]);
    setTrucks((td ?? []) as Truck[]);
    setLoads((ld ?? []) as Load[]);
    setUnlockedIds(new Set((ud ?? []).map((u: any) => u.listing_id)));
    setLoading(false);
    setRefreshing(false);
  }, [profile]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime unread notification count for bell badge
  useEffect(() => {
    if (!profile) return;
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('is_read', false)
      .then(({ count }) => setUnreadCount(count ?? 0));

    const ch = supabase.channel('feed_notif_count')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${profile.id}`,
      }, () => setUnreadCount((p) => p + 1))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile]);

  function onRefresh() { setRefreshing(true); fetchData(); }

  function openFilter() {
    setPendingVerified(filterVerifiedOnly);
    setPendingMode(filterMode);
    setPendingTruckType(filterTruckType);
    setFilterVisible(true);
  }

  function applyFilter() {
    setFilterVerifiedOnly(pendingVerified);
    setFilterMode(pendingMode);
    setFilterTruckType(pendingTruckType);
    setFilterVisible(false);
  }

  function clearFilter() {
    setFilterVerifiedOnly(false); setFilterMode('all'); setFilterTruckType('all');
    setPendingVerified(false);    setPendingMode('all'); setPendingTruckType('all');
    setFilterVisible(false);
  }

  const q = search.toLowerCase();

  const filteredTrucks = trucks.filter((t) => {
    if (q && !t.origin.toLowerCase().includes(q) && !t.destination.toLowerCase().includes(q)) return false;
    if (filterVerifiedOnly && t.driver?.kyc_status !== 'approved') return false;
    if (filterMode !== 'all' && (t as any).listing_mode !== filterMode) return false;
    if (filterTruckType !== 'all' && t.truck_type !== filterTruckType) return false;
    return true;
  });

  const filteredLoads = loads.filter((l) => {
    if (q && !l.origin.toLowerCase().includes(q) && !l.destination.toLowerCase().includes(q)) return false;
    if (filterVerifiedOnly && l.shipper?.kyc_status !== 'approved') return false;
    if (filterMode !== 'all' && (l as any).listing_mode !== filterMode) return false;
    return true;
  });

  const data = feedType === 'trucks' ? filteredTrucks : filteredLoads;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Feed</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.bellBtn} onPress={() => router.push('/(app)/notifications/index')}>
            <Text style={styles.bellIcon}>🔔</Text>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : String(unreadCount)}</Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.toggleRow}>
            {(['trucks', 'loads'] as FeedType[]).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.toggle, feedType === f && styles.toggleActive]}
                onPress={() => setFeedType(f)}
              >
                <Text style={[styles.toggleText, feedType === f && styles.toggleTextActive]}>
                  {f === 'trucks' ? '🚛 Trucks' : '📦 Loads'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Search + Filter */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <RNInput
            style={styles.searchInput}
            placeholder="Search city or region..."
            placeholderTextColor={COLORS.textTertiary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, isFiltered && styles.filterBtnActive]}
          onPress={openFilter}
        >
          <Text style={styles.filterIcon}>{isFiltered ? '●' : '⚙️'}</Text>
        </TouchableOpacity>
      </View>

      {/* Active filter chips */}
      {isFiltered && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {filterVerifiedOnly && (
            <TouchableOpacity style={styles.chip} onPress={() => setFilterVerifiedOnly(false)}>
              <Text style={styles.chipText}>✅ Verified  ×</Text>
            </TouchableOpacity>
          )}
          {filterMode !== 'all' && (
            <TouchableOpacity style={styles.chip} onPress={() => setFilterMode('all')}>
              <Text style={styles.chipText}>{filterMode === 'managed' ? '🛡️ Managed' : '📢 Ad'}  ×</Text>
            </TouchableOpacity>
          )}
          {filterTruckType !== 'all' && (
            <TouchableOpacity style={styles.chip} onPress={() => setFilterTruckType('all')}>
              <Text style={styles.chipText}>{filterTruckType.toUpperCase()}  ×</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.chipClear} onPress={clearFilter}>
            <Text style={styles.chipClearText}>Clear all</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon={feedType === 'trucks' ? '🚛' : '📦'}
              title={isFiltered ? 'No results for these filters' : `No ${feedType} found`}
              subtitle={
                isFiltered ? 'Try removing some filters'
                : search ? 'Try a different search term'
                : `Be the first to post a ${feedType === 'trucks' ? 'truck listing' : 'load'}`
              }
              actionLabel={isFiltered ? 'Clear Filters' : `Post ${feedType === 'trucks' ? 'Truck' : 'Load'}`}
              onAction={isFiltered ? clearFilter : () => router.push(feedType === 'trucks' ? '/(app)/post/truck' : '/(app)/post/load')}
            />
          }
          renderItem={({ item }) => {
            const isUnlocked = unlockedIds.has(item.id);
            if (feedType === 'trucks') {
              const truck = item as Truck;
              const dist  = truck.origin_lat && truck.dest_lat
                ? haversineKm(truck.origin_lat, truck.origin_lng!, truck.dest_lat, truck.dest_lng!)
                : 800;
              const est = estimatePriceSync(truck.truck_type, 'general', dist);
              return (
                <TruckCard
                  truck={truck}
                  onPress={() => router.push({ pathname: '/(app)/feed/[id]', params: { id: truck.id, type: 'truck' } })}
                  estimatedPrice={est.estimated_price}
                  demandLevel={est.demand_level}
                  distanceKm={dist}
                  isUnlocked={isUnlocked}
                />
              );
            } else {
              const load = item as Load;
              const dist = load.origin_lat && load.dest_lat
                ? haversineKm(load.origin_lat, load.origin_lng!, load.dest_lat, load.dest_lng!)
                : 800;
              const est = estimatePriceSync('hcv', load.load_type, dist);
              return (
                <LoadCard
                  load={load}
                  onPress={() => router.push({ pathname: '/(app)/feed/[id]', params: { id: load.id, type: 'load' } })}
                  estimatedPrice={est.estimated_price}
                  demandLevel={est.demand_level}
                  distanceKm={dist}
                  isUnlocked={isUnlocked}
                />
              );
            }
          }}
        />
      )}

      {/* Filter modal */}
      <Portal>
        <Modal
          visible={filterVisible}
          onDismiss={() => setFilterVisible(false)}
          contentContainerStyle={styles.filterModal}
        >
          <Text style={styles.filterModalTitle}>Filters</Text>

          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>✅ Verified listings only</Text>
            <Switch
              value={pendingVerified}
              onValueChange={setPendingVerified}
              trackColor={{ false: COLORS.border, true: COLORS.primary + '60' }}
              thumbColor={pendingVerified ? COLORS.primary : COLORS.textTertiary}
            />
          </View>

          <Text style={styles.filterSubLabel}>Listing Type</Text>
          <View style={styles.filterChipRow}>
            {(['all', 'managed', 'ad'] as ModeFilter[]).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.fChip, pendingMode === m && styles.fChipActive]}
                onPress={() => setPendingMode(m)}
              >
                <Text style={[styles.fChipText, pendingMode === m && styles.fChipTextActive]}>
                  {m === 'all' ? 'All' : m === 'managed' ? '🛡️ Managed' : '📢 Ad Mode'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {feedType === 'trucks' && (
            <>
              <Text style={styles.filterSubLabel}>Truck Type</Text>
              <View style={styles.filterChipRow}>
                {TRUCK_TYPE_OPTS.map((tt) => (
                  <TouchableOpacity
                    key={tt.value}
                    style={[styles.fChip, pendingTruckType === tt.value && styles.fChipActive]}
                    onPress={() => setPendingTruckType(tt.value as TruckType | 'all')}
                  >
                    <Text style={[styles.fChipText, pendingTruckType === tt.value && styles.fChipTextActive]}>
                      {tt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <View style={styles.filterActions}>
            <TouchableOpacity style={styles.clearBtn} onPress={clearFilter}>
              <Text style={styles.clearBtnText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={applyFilter}>
              <Text style={styles.applyBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, paddingBottom: SPACING.xs,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title:       { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },

  bellBtn:  { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  bellIcon: { fontSize: 22 },
  badge: {
    position: 'absolute', top: 2, right: 2,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: COLORS.danger,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },

  toggleRow:       { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: RADIUS.full, padding: 3, ...SHADOWS.sm },
  toggle:          { paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.full },
  toggleActive:    { backgroundColor: COLORS.primary },
  toggleText:      { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textSecondary },
  toggleTextActive:{ color: COLORS.textInverse },

  searchRow:       { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  searchBox:       { flex: 1, backgroundColor: COLORS.background, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md },
  searchInput:     { height: 38, color: COLORS.textPrimary, fontSize: FONT_SIZE.sm },
  filterBtn:       { width: 38, height: 38, borderRadius: RADIUS.md, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  filterBtnActive: { backgroundColor: COLORS.primary + '15' },
  filterIcon:      { fontSize: 20 },

  chipRow:      { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, gap: SPACING.xs, flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  chip:         { backgroundColor: COLORS.primary + '15', borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 4 },
  chipText:     { fontSize: FONT_SIZE.xs, fontWeight: '600', color: COLORS.primary },
  chipClear:    { backgroundColor: COLORS.danger + '15', borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 4 },
  chipClearText:{ fontSize: FONT_SIZE.xs, fontWeight: '600', color: COLORS.danger },

  list: { paddingBottom: SPACING.xxl },

  filterModal:      { margin: SPACING.lg, backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg, gap: SPACING.md },
  filterModalTitle: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.textPrimary },
  filterRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  filterLabel:      { fontSize: FONT_SIZE.md, color: COLORS.textPrimary, fontWeight: '500' },
  filterSubLabel:   { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.textSecondary, marginTop: SPACING.xs },
  filterChipRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  fChip:            { paddingHorizontal: SPACING.md, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.background },
  fChipActive:      { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '12' },
  fChipText:        { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textSecondary },
  fChipTextActive:  { color: COLORS.primary },
  filterActions:    { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs },
  clearBtn:         { flex: 1, padding: SPACING.md, alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg },
  clearBtnText:     { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.textSecondary },
  applyBtn:         { flex: 2, padding: SPACING.md, alignItems: 'center', backgroundColor: COLORS.primary, borderRadius: RADIUS.lg },
  applyBtnText:     { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.textInverse },
});
