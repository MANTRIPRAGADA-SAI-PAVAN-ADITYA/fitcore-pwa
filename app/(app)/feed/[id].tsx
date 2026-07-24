import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking, Modal
} from 'react-native';
import { Text, Button, ActivityIndicator, TextInput } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import { Truck, Load, Bid } from '../../../types';
import Badge from '../../../components/ui/Badge';
import PriceEstimator from '../../../components/pricing/PriceEstimator';
import UnlockModal from '../../../components/unlock/UnlockModal';
import { estimatePrice, haversineKm } from '../../../lib/pricing';
import { TRUCK_LABELS, TRUCK_ICONS, LOAD_TYPE_LABELS, LOAD_TYPE_ICONS } from '../../../constants/pricing';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOWS } from '../../../constants/theme';

type ListingType = 'truck' | 'load';

export default function ListingDetailScreen() {
  const { id, type } = useLocalSearchParams<{ id: string; type: ListingType }>();
  const { profile, refreshCredits } = useAuthStore();

  const [truck, setTruck] = useState<Truck | null>(null);
  const [load, setLoad] = useState<Load | null>(null);
  const [loading, setLoading] = useState(true);
  const [priceEstimate, setPriceEstimate] = useState<any>(null);
  const [unlockModalVisible, setUnlockModalVisible] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [unlockedPhone, setUnlockedPhone] = useState<string | null>(null);

  const [bids, setBids] = useState<Bid[]>([]);
  const [myBid, setMyBid] = useState<Bid | null>(null);
  const [bidModalVisible, setBidModalVisible] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [bidMessage, setBidMessage] = useState('');
  const [bidLoading, setBidLoading] = useState(false);

  useEffect(() => { fetchData(); }, [id, type]);

  async function fetchData() {
    setLoading(true);
    if (type === 'truck') {
      const { data } = await supabase
        .from('trucks')
        .select('*, driver:profiles(id,name,phone,company,kyc_status,created_at)')
        .eq('id', id)
        .single();
      if (data) {
        setTruck(data as Truck);
        computePrice(data as Truck);
      }
    } else {
      const { data } = await supabase
        .from('loads')
        .select('*, shipper:profiles(id,name,phone,company,kyc_status,created_at)')
        .eq('id', id)
        .single();
      if (data) setLoad(data as Load);
    }
    await Promise.all([checkUnlock(), fetchBids()]);
    setLoading(false);
  }

  async function computePrice(t: Truck) {
    if (!t.origin_lat || !t.dest_lat) return;
    const dist = haversineKm(t.origin_lat, t.origin_lng!, t.dest_lat, t.dest_lng!);
    const est = await estimatePrice(t.truck_type, 'general', dist);
    setPriceEstimate(est);
  }

  async function checkUnlock() {
    if (!profile) return;
    const { data } = await supabase
      .from('unlocks')
      .select('listing_id')
      .eq('unlocker_id', profile.id)
      .eq('listing_id', id)
      .maybeSingle();
    if (data) { setIsUnlocked(true); fetchPhone(); }
  }

  async function fetchPhone() {
    if (type === 'truck') {
      const { data } = await supabase.from('trucks').select('driver:profiles(phone)').eq('id', id).single();
      setUnlockedPhone((data as any)?.driver?.phone ?? null);
    } else {
      const { data } = await supabase.from('loads').select('shipper:profiles(phone)').eq('id', id).single();
      setUnlockedPhone((data as any)?.shipper?.phone ?? null);
    }
  }

  async function fetchBids() {
    if (!profile) return;
    const { data } = await supabase
      .from('bids')
      .select('*, bidder:profiles(id,name,phone,company,kyc_status)')
      .eq('listing_id', id)
      .order('created_at', { ascending: false });
    const all = (data ?? []) as Bid[];
    setBids(all);
    setMyBid(all.find((b) => b.bidder_id === profile.id) ?? null);
  }

  async function submitBid() {
    if (!bidAmount || isNaN(parseFloat(bidAmount)) || parseFloat(bidAmount) <= 0) {
      Alert.alert('Invalid', 'Enter a valid bid amount.');
      return;
    }
    setBidLoading(true);
    try {
      const { error } = await supabase.from('bids').insert({
        listing_id: id,
        listing_type: type,
        bidder_id: profile!.id,
        amount: parseFloat(bidAmount),
        message: bidMessage.trim() || null,
      });
      if (error) throw error;
      // Notify listing owner
      const ownerId = type === 'truck' ? truck?.driver_id : load?.shipper_id;
      if (ownerId && ownerId !== profile!.id) {
        await supabase.from('notifications').insert({
          user_id: ownerId,
          type: 'bid_placed',
          title: `New bid from ${profile!.name ?? 'Someone'}`,
          body: `₹${parseFloat(bidAmount).toLocaleString('en-IN')} bid on your ${type} listing`,
          data: { listing_id: id, listing_type: type },
        });
      }
      setBidModalVisible(false);
      setBidAmount('');
      setBidMessage('');
      await fetchBids();
      Alert.alert('Bid Placed!', 'The listing owner will review your bid and respond shortly.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setBidLoading(false);
    }
  }

  async function handleBidAction(bidId: string, action: 'accepted' | 'rejected') {
    const { error } = await supabase.from('bids').update({ status: action, updated_at: new Date().toISOString() }).eq('id', bidId);
    if (error) { Alert.alert('Error', error.message); return; }
    // Notify the bidder
    const bid = bids.find((b) => b.id === bidId);
    if (bid) {
      await supabase.from('notifications').insert({
        user_id: bid.bidder_id,
        type: action === 'accepted' ? 'bid_accepted' : 'bid_rejected',
        title: action === 'accepted' ? 'Your bid was accepted! 🎉' : 'Your bid was not accepted',
        body: action === 'accepted'
          ? `Your ₹${bid.amount.toLocaleString('en-IN')} bid was accepted. A trip has been created!`
          : `Your ₹${bid.amount.toLocaleString('en-IN')} bid was not accepted this time.`,
        data: { listing_id: id, listing_type: type },
      });
    }
    if (action === 'accepted') Alert.alert('Bid Accepted!', 'A trip has been initiated. Track it in My Trips.');
    await fetchBids();
  }

  function handleCallPress() {
    if (!unlockedPhone) return;
    Linking.openURL(`tel:${unlockedPhone}`);
  }

  async function startOrOpenChat() {
    if (!profile || !owner) return;
    const p1 = profile.id < owner.id ? profile.id : owner.id;
    const p2 = profile.id < owner.id ? owner.id : profile.id;
    // Upsert conversation
    let { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('participant1_id', p1)
      .eq('participant2_id', p2)
      .eq('listing_id', id)
      .maybeSingle();
    if (!existing) {
      const { data: created } = await supabase
        .from('conversations')
        .insert({ participant1_id: p1, participant2_id: p2, listing_id: id, listing_type: type })
        .select('id')
        .single();
      existing = created;
    }
    if (existing?.id) {
      router.push({ pathname: '/(app)/chat/[id]', params: { id: existing.id } });
    }
  }

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  }

  const item = type === 'truck' ? truck : load;
  if (!item) return null;

  const listingMode = (item as any).listing_mode ?? 'ad';
  const owner = type === 'truck' ? (truck as Truck).driver : (load as Load).shipper;
  const ownerLabel = type === 'truck' ? 'Driver' : 'Shipper';
  const ownerIcon = type === 'truck' ? '🚛' : '📦';
  const isOwner = profile?.id === (type === 'truck' ? truck?.driver_id : load?.shipper_id);
  const listingTitle = type === 'truck'
    ? `${(truck as Truck).truck_type.toUpperCase()} — ${truck!.origin} → ${truck!.destination}`
    : `${(load as Load).weight_tons}T — ${load!.origin} → ${load!.destination}`;

  const pendingBids = bids.filter((b) => b.status === 'pending');
  const acceptedBid = bids.find((b) => b.status === 'accepted');

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.headerCard}>
          <Text style={styles.headerIcon}>
            {type === 'truck' ? TRUCK_ICONS[(truck as Truck).truck_type] : LOAD_TYPE_ICONS[(load as Load).load_type]}
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>
              {type === 'truck' ? TRUCK_LABELS[(truck as Truck).truck_type] : LOAD_TYPE_LABELS[(load as Load).load_type]}
            </Text>
            <View style={styles.badgeRow}>
              {owner?.kyc_status === 'approved' && <Badge label="✓ Verified" variant="success" />}
              <Badge label={type === 'truck' ? `${(truck as Truck).capacity_tons}T` : `${(load as Load).weight_tons}T`} variant="neutral" />
              <Badge label={(item as any).status} variant="primary" />
              {listingMode === 'managed' ? <Badge label="🛡️ Managed" variant="primary" /> : <Badge label="📢 Ad" variant="warning" />}
            </View>
          </View>
        </View>

        {/* Route */}
        <View style={styles.routeCard}>
          <Text style={styles.sectionLabel}>Route</Text>
          <View style={styles.routeRow}>
            <View style={styles.routePoint}>
              <View style={[styles.dot, { backgroundColor: COLORS.success }]} />
              <View>
                <Text style={styles.routeCity}>{item.origin}</Text>
                <Text style={styles.routeLabel}>{type === 'truck' ? 'Truck Origin' : 'Pickup'}</Text>
              </View>
            </View>
            <View style={styles.routeArrow}><Text style={styles.arrowText}>→</Text></View>
            <View style={styles.routePoint}>
              <View style={[styles.dot, { backgroundColor: COLORS.danger }]} />
              <View>
                <Text style={styles.routeCity}>{item.destination}</Text>
                <Text style={styles.routeLabel}>{type === 'truck' ? 'Destination' : 'Delivery'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Details */}
        <View style={styles.detailCard}>
          <Text style={styles.sectionLabel}>Details</Text>
          {type === 'truck' && truck && (
            <>
              <DetailRow label="Truck Type" value={TRUCK_LABELS[truck.truck_type]} />
              <DetailRow label="Capacity" value={`${truck.capacity_tons} tons`} />
              <DetailRow label="Available" value={new Date(truck.available_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long' })} />
              {truck.price_per_km && <DetailRow label={listingMode === 'managed' ? 'Target Rate' : 'Asking Rate'} value={`₹${truck.price_per_km}/km`} />}
              {truck.notes && <DetailRow label="Notes" value={truck.notes} />}
            </>
          )}
          {type === 'load' && load && (
            <>
              <DetailRow label="Load Type" value={LOAD_TYPE_LABELS[load.load_type]} />
              <DetailRow label="Weight" value={`${load.weight_tons} tons`} />
              <DetailRow label="Pickup Date" value={new Date(load.pickup_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long' })} />
              {load.budget_max && <DetailRow label="Budget" value={`₹${load.budget_min?.toLocaleString('en-IN') ?? '?'} – ₹${load.budget_max.toLocaleString('en-IN')}`} />}
              {load.notes && <DetailRow label="Notes" value={load.notes} />}
            </>
          )}
        </View>

        {type === 'truck' && priceEstimate && <PriceEstimator estimate={priceEstimate} />}

        {/* Owner info + CTA */}
        <View style={styles.ownerCard}>
          <Text style={styles.sectionLabel}>{ownerLabel}</Text>
          <View style={styles.ownerRow}>
            <View style={styles.ownerAvatar}>
              <Text style={styles.ownerIcon}>{ownerIcon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ownerName}>{owner?.name ?? 'User'}</Text>
              {owner?.company && <Text style={styles.ownerCompany}>{owner.company}</Text>}
              {listingMode === 'ad' && (
                <Text style={styles.ownerPhone}>
                  {isUnlocked ? unlockedPhone ?? 'No number' : '•••• •••• ••••'}
                </Text>
              )}
            </View>
            {owner?.kyc_status === 'approved' && <Badge label="Verified" variant="success" />}
          </View>

          {/* Ad Mode CTA */}
          {listingMode === 'ad' && !isOwner && (
            isUnlocked ? (
              <Button mode="contained" icon="phone" onPress={handleCallPress} style={styles.ctaBtn} contentStyle={styles.ctaContent} buttonColor={COLORS.success}>
                Call {owner?.name?.split(' ')[0] ?? ownerLabel}
              </Button>
            ) : (
              <Button mode="contained" icon="lock-open" onPress={() => setUnlockModalVisible(true)} style={styles.ctaBtn} contentStyle={styles.ctaContent}>
                Unlock Contact — 1 Credit
              </Button>
            )
          )}

          {/* Managed Mode CTA */}
          {listingMode === 'managed' && !isOwner && (
            myBid ? (
              <View style={styles.myBidBox}>
                <Text style={styles.myBidLabel}>Your Bid</Text>
                <Text style={styles.myBidAmount}>₹{myBid.amount.toLocaleString('en-IN')}</Text>
                <Badge
                  label={myBid.status === 'pending' ? '⏳ Awaiting Response' : myBid.status === 'accepted' ? '✅ Accepted' : myBid.status === 'rejected' ? '❌ Rejected' : '↩️ Countered'}
                  variant={myBid.status === 'accepted' ? 'success' : myBid.status === 'rejected' ? 'danger' : 'warning'}
                />
                {myBid.counter_amount && <Text style={styles.counterText}>Counter offer: ₹{myBid.counter_amount.toLocaleString('en-IN')}</Text>}
              </View>
            ) : (
              <Button mode="contained" icon="gavel" onPress={() => setBidModalVisible(true)} style={styles.ctaBtn} contentStyle={styles.ctaContent}>
                Place a Bid
              </Button>
            )
          )}
        </View>

        {/* Bids panel — only visible to listing owner in managed mode */}
        {listingMode === 'managed' && isOwner && (
          <View style={styles.bidsCard}>
            <Text style={styles.sectionLabel}>Bids Received ({bids.length})</Text>
            {acceptedBid && (
              <View style={[styles.bidItem, styles.bidAccepted]}>
                <View style={styles.bidHeader}>
                  <Text style={styles.bidderName}>{(acceptedBid.bidder as any)?.name ?? 'Bidder'}</Text>
                  <Badge label="✅ Accepted" variant="success" />
                </View>
                <Text style={styles.bidAmount}>₹{acceptedBid.amount.toLocaleString('en-IN')}</Text>
                {acceptedBid.message && <Text style={styles.bidMessage}>"{acceptedBid.message}"</Text>}
              </View>
            )}
            {pendingBids.length === 0 && !acceptedBid && (
              <Text style={styles.noBids}>No bids yet. Share your listing to attract bids.</Text>
            )}
            {pendingBids.map((bid) => (
              <View key={bid.id} style={styles.bidItem}>
                <View style={styles.bidHeader}>
                  <View>
                    <Text style={styles.bidderName}>{(bid.bidder as any)?.name ?? 'Bidder'}</Text>
                    {(bid.bidder as any)?.company && <Text style={styles.bidderCompany}>{(bid.bidder as any).company}</Text>}
                  </View>
                  {(bid.bidder as any)?.kyc_status === 'approved' && <Badge label="✓ Verified" variant="success" />}
                </View>
                <Text style={styles.bidAmount}>₹{bid.amount.toLocaleString('en-IN')}</Text>
                {bid.message && <Text style={styles.bidMessage}>"{bid.message}"</Text>}
                <Text style={styles.bidTime}>{new Date(bid.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
                <View style={styles.bidActions}>
                  <Button mode="contained" onPress={() => handleBidAction(bid.id, 'accepted')} style={{ flex: 1 }} buttonColor={COLORS.success} compact>Accept</Button>
                  <Button mode="outlined" onPress={() => handleBidAction(bid.id, 'rejected')} style={{ flex: 1 }} textColor={COLORS.danger} compact>Reject</Button>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Chat button — visible to non-owners */}
        {!isOwner && owner && (
          <View style={styles.chatCard}>
            <Text style={styles.sectionLabel}>Have a question?</Text>
            <Button
              mode="outlined"
              icon="chat"
              onPress={() => startOrOpenChat()}
              style={styles.chatBtn}
              contentStyle={{ paddingVertical: 6 }}
            >
              Chat with {owner.name?.split(' ')[0] ?? ownerLabel}
            </Button>
          </View>
        )}

        <Text style={styles.listedDate}>
          Listed {new Date((item as any).created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </Text>
      </ScrollView>

      <UnlockModal
        visible={unlockModalVisible}
        onClose={() => { setUnlockModalVisible(false); checkUnlock(); }}
        listingType={type as 'truck' | 'load'}
        listingId={id!}
        listingTitle={listingTitle}
        ownerName={owner?.name ?? ownerLabel}
      />

      <Modal visible={bidModalVisible} animationType="slide" transparent onRequestClose={() => setBidModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Place a Bid</Text>
            <Text style={styles.modalSubtitle}>{listingTitle}</Text>

            <Text style={styles.modalLabel}>BID AMOUNT (₹)</Text>
            <TextInput
              mode="outlined"
              keyboardType="decimal-pad"
              value={bidAmount}
              onChangeText={setBidAmount}
              placeholder="e.g. 45000"
              style={styles.modalInput}
              outlineStyle={{ borderRadius: RADIUS.md }}
              left={<TextInput.Icon icon="currency-inr" />}
            />

            <Text style={styles.modalLabel}>MESSAGE (OPTIONAL)</Text>
            <TextInput
              mode="outlined"
              value={bidMessage}
              onChangeText={setBidMessage}
              placeholder="e.g. Can pick up from alternate location, flexible on date"
              multiline
              numberOfLines={3}
              style={styles.modalInput}
              outlineStyle={{ borderRadius: RADIUS.md }}
            />

            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setBidModalVisible(false)} style={{ flex: 1 }} textColor={COLORS.textSecondary}>Cancel</Button>
              <Button mode="contained" onPress={submitBid} loading={bidLoading} disabled={bidLoading} style={{ flex: 1 }} icon="gavel">Submit Bid</Button>
            </View>

            <Text style={styles.modalNote}>
              🛡️ LooP holds payment in escrow once your bid is accepted. 4% platform fee applies on successful trips.
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backBtn: { padding: SPACING.xs },
  backText: { color: COLORS.primary, fontSize: FONT_SIZE.md },
  headerCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, flexDirection: 'row', gap: SPACING.md, alignItems: 'center', ...SHADOWS.sm },
  headerIcon: { fontSize: 40 },
  headerTitle: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.textPrimary },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginTop: 4 },
  routeCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, gap: SPACING.sm, ...SHADOWS.sm },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  routePoint: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  routeCity: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.textPrimary },
  routeLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },
  routeArrow: { alignItems: 'center' },
  arrowText: { fontSize: 24, color: COLORS.textTertiary },
  detailCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, gap: SPACING.sm, ...SHADOWS.sm },
  sectionLabel: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.textTertiary, textTransform: 'uppercase', letterSpacing: 0.8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  detailValue: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textPrimary, flex: 1, textAlign: 'right' },
  ownerCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, gap: SPACING.md, ...SHADOWS.sm },
  ownerRow: { flexDirection: 'row', gap: SPACING.md, alignItems: 'center' },
  ownerAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  ownerIcon: { fontSize: 24 },
  ownerName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.textPrimary },
  ownerCompany: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  ownerPhone: { fontSize: FONT_SIZE.md, color: COLORS.textTertiary, letterSpacing: 2, marginTop: 2 },
  ctaBtn: { borderRadius: RADIUS.lg },
  ctaContent: { paddingVertical: 8 },
  myBidBox: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.md, gap: SPACING.xs, borderWidth: 1, borderColor: COLORS.border },
  myBidLabel: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.textTertiary, textTransform: 'uppercase' },
  myBidAmount: { fontSize: FONT_SIZE.xxl, fontWeight: '800', color: COLORS.primary },
  counterText: { fontSize: FONT_SIZE.sm, color: COLORS.warning, fontWeight: '600' },
  bidsCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, gap: SPACING.md, ...SHADOWS.sm },
  noBids: { fontSize: FONT_SIZE.sm, color: COLORS.textTertiary, textAlign: 'center', paddingVertical: SPACING.md },
  bidItem: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.md, gap: SPACING.xs, borderWidth: 1, borderColor: COLORS.border },
  bidAccepted: { borderColor: COLORS.success, backgroundColor: '#F0FFF4' },
  bidHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bidderName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.textPrimary },
  bidderCompany: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  bidAmount: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.primary },
  bidMessage: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, fontStyle: 'italic' },
  bidTime: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },
  bidActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs },
  chatCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, gap: SPACING.sm, ...SHADOWS.sm },
  chatBtn: { borderRadius: RADIUS.lg },
  listedDate: { textAlign: 'center', fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.xl, gap: SPACING.md, paddingBottom: SPACING.xxl },
  modalTitle: { fontSize: FONT_SIZE.xxl, fontWeight: '800', color: COLORS.textPrimary },
  modalSubtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: -SPACING.sm },
  modalLabel: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.textTertiary, textTransform: 'uppercase', letterSpacing: 0.8 },
  modalInput: { backgroundColor: COLORS.surface },
  modalActions: { flexDirection: 'row', gap: SPACING.sm },
  modalNote: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, textAlign: 'center', lineHeight: 18 },
});
