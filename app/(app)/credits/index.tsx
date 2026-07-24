import React, { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Alert, ScrollView,
} from 'react-native';
import { Text, ActivityIndicator, Modal, Portal } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import { CreditTransaction } from '../../../types';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOWS } from '../../../constants/theme';

const CREDIT_PACKS = [
  { id: 'starter',  credits: 5,   price: 99,   label: 'Starter',  tag: null,         desc: '₹19.8/credit' },
  { id: 'popular',  credits: 15,  price: 249,  label: 'Popular',  tag: 'BEST VALUE', desc: '₹16.6/credit' },
  { id: 'pro',      credits: 30,  price: 449,  label: 'Pro',      tag: 'SAVE 25%',   desc: '₹15/credit' },
  { id: 'business', credits: 100, price: 1299, label: 'Business', tag: 'BULK DEAL',  desc: '₹13/credit' },
] as const;

export default function CreditsScreen() {
  const { profile } = useAuthStore();
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [confirmPack, setConfirmPack] = useState<typeof CREDIT_PACKS[number] | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(30);
    setTransactions((data ?? []) as CreditTransaction[]);
    setLoading(false);
  }, [profile]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  async function purchaseCredits(pack: typeof CREDIT_PACKS[number]) {
    setPurchasing(pack.id);
    setConfirmPack(null);
    try {
      const refId = `BETA_${Date.now()}_${pack.id.toUpperCase()}`;
      const newCredits = (profile?.credits ?? 0) + pack.credits;

      const { error } = await supabase
        .from('profiles')
        .update({ credits: newCredits })
        .eq('id', profile!.id);
      if (error) throw error;

      await supabase.from('credit_transactions').insert({
        user_id: profile!.id,
        type: 'purchase',
        amount: pack.credits,
        description: `Purchased ${pack.credits} credits — ${pack.label} pack`,
        reference_id: refId,
      });

      // Update local store
      useAuthStore.setState((s: any) => ({
        profile: s.profile ? { ...s.profile, credits: newCredits } : null,
      }));

      await fetchTransactions();
      Alert.alert('Credits Added! ⚡', `${pack.credits} credits have been added to your account.`);
    } catch (err: any) {
      Alert.alert('Purchase Failed', err.message ?? 'Please try again.');
    } finally {
      setPurchasing(null);
    }
  }

  function timeLabel(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  const currentCredits = profile?.credits ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Credits</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Balance card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceIcon}>⚡</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.balanceLabel}>YOUR BALANCE</Text>
            <View style={styles.balanceRow}>
              <Text style={styles.balanceValue}>{currentCredits}</Text>
              <Text style={styles.balanceUnit}>credits</Text>
            </View>
            <Text style={styles.balanceHint}>1 credit = 1 contact unlock</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💡 Credits unlock contact info on Ad Mode listings. Managed listings use LooP's escrow — no credits needed.
          </Text>
        </View>

        {/* Buy packs */}
        <Text style={styles.sectionTitle}>Buy Credits</Text>
        <View style={styles.packsGrid}>
          {CREDIT_PACKS.map((pack) => {
            const featured = pack.tag === 'BEST VALUE';
            return (
              <TouchableOpacity
                key={pack.id}
                style={[styles.packCard, featured && styles.packCardFeatured]}
                onPress={() => setConfirmPack(pack)}
                activeOpacity={0.8}
              >
                {pack.tag && (
                  <View style={[styles.packTagBadge, featured && styles.packTagFeatured]}>
                    <Text style={styles.packTagText}>{pack.tag}</Text>
                  </View>
                )}
                <Text style={styles.packCredits}>{pack.credits}</Text>
                <Text style={styles.packCreditLabel}>credits</Text>
                <Text style={[styles.packPrice, featured && styles.packPriceFeatured]}>₹{pack.price}</Text>
                <Text style={styles.packDesc}>{pack.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.paymentNote}>
          <Text style={styles.paymentText}>🔒 Razorpay · UPI · Cards · NetBanking</Text>
          <Text style={styles.betaText}>Beta: payments are simulated — real billing activates on launch</Text>
        </View>

        {/* Transaction history */}
        <Text style={styles.sectionTitle}>Transaction History</Text>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : transactions.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No transactions yet. Purchase your first credits!</Text>
          </View>
        ) : (
          transactions.map((tx) => {
            const icon = tx.type === 'purchase' ? '⚡' : tx.type === 'refund' ? '↩️' : tx.type === 'bonus' ? '🎁' : '🔓';
            return (
              <View key={tx.id} style={styles.txCard}>
                <View style={styles.txIconWrap}>
                  <Text style={styles.txIcon}>{icon}</Text>
                </View>
                <View style={styles.txBody}>
                  <Text style={styles.txDesc}>{tx.description}</Text>
                  <Text style={styles.txDate}>{timeLabel(tx.created_at)}</Text>
                </View>
                <Text style={[styles.txAmount, tx.amount > 0 ? styles.txPositive : styles.txNegative]}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Confirm modal */}
      <Portal>
        <Modal
          visible={!!confirmPack}
          onDismiss={() => setConfirmPack(null)}
          contentContainerStyle={styles.modal}
        >
          {confirmPack && (
            <>
              <Text style={styles.modalTitle}>Confirm Purchase</Text>
              <View style={styles.modalDetails}>
                <Text style={styles.modalCredits}>⚡ {confirmPack.credits} Credits</Text>
                <Text style={styles.modalPrice}>₹{confirmPack.price}</Text>
              </View>
              <Text style={styles.modalNote}>
                Beta: payment is simulated. Credits are added immediately.
              </Text>
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setConfirmPack(null)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, !!purchasing && styles.btnDisabled]}
                  onPress={() => purchaseCredits(confirmPack)}
                  disabled={!!purchasing}
                >
                  <Text style={styles.confirmText}>
                    {purchasing === confirmPack.id ? 'Processing...' : `Pay ₹${confirmPack.price}`}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxl },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back:    { fontSize: 26, color: COLORS.textPrimary, width: 36 },
  title:   { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.textPrimary },

  balanceCard: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
    padding: SPACING.md, flexDirection: 'row', alignItems: 'center',
    gap: SPACING.md, ...SHADOWS.md,
  },
  balanceLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(0,0,0,0.5)', letterSpacing: 1.2 },
  balanceRow:   { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  balanceIcon:  { fontSize: 22 },
  balanceValue: { fontSize: 38, fontWeight: '900', color: COLORS.textInverse, lineHeight: 44 },
  balanceUnit:  { fontSize: FONT_SIZE.sm, color: 'rgba(0,0,0,0.55)', fontWeight: '600', paddingBottom: 4 },
  balanceHint:  { fontSize: FONT_SIZE.xs, color: 'rgba(0,0,0,0.45)', marginTop: 2 },

  infoBox:  { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  infoText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, lineHeight: 18 },

  sectionTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.textPrimary },

  packsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  packCard: {
    flex: 1, minWidth: '45%', backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg, padding: SPACING.sm, alignItems: 'center', gap: 1,
    borderWidth: 1.5, borderColor: COLORS.border, ...SHADOWS.sm,
    position: 'relative', overflow: 'hidden',
  },
  packCardFeatured:  { borderColor: COLORS.primary, backgroundColor: 'rgba(255,255,255,0.06)' },
  packTagBadge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: COLORS.textSecondary,
    paddingHorizontal: 8, paddingVertical: 3,
    borderBottomLeftRadius: RADIUS.sm,
  },
  packTagFeatured: { backgroundColor: COLORS.primary },
  packTagText:    { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  packCredits:    { fontSize: 26, fontWeight: '900', color: COLORS.textPrimary, marginTop: SPACING.sm },
  packCreditLabel:{ fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, fontWeight: '600' },
  packPrice:      { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.textPrimary, marginTop: SPACING.xs },
  packPriceFeatured: { color: COLORS.primary },
  packDesc:       { fontSize: 10, color: COLORS.textTertiary, marginTop: 2 },

  paymentNote: { alignItems: 'center', gap: 4 },
  paymentText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, textAlign: 'center' },
  betaText:    { fontSize: 10, color: COLORS.textTertiary, textAlign: 'center' },

  emptyBox:  { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.xl, alignItems: 'center' },
  emptyText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, textAlign: 'center' },

  txCard:     { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md, gap: SPACING.md, ...SHADOWS.sm },
  txIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  txIcon:     { fontSize: 20 },
  txBody:     { flex: 1, gap: 2 },
  txDesc:     { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textPrimary },
  txDate:     { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },
  txAmount:   { fontSize: FONT_SIZE.lg, fontWeight: '800' },
  txPositive: { color: COLORS.success },
  txNegative: { color: COLORS.danger },

  modal: {
    margin: SPACING.xl, backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl, padding: SPACING.xl, gap: SPACING.md,
  },
  modalTitle:   { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center' },
  modalDetails: {
    alignItems: 'center', gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border,
  },
  modalCredits: { fontSize: 28, fontWeight: '900', color: COLORS.primary },
  modalPrice:   { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.textPrimary },
  modalNote:    { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, textAlign: 'center' },
  modalBtns:    { flexDirection: 'row', gap: SPACING.sm },
  cancelBtn:    { flex: 1, padding: SPACING.md, alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg },
  cancelText:   { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.textSecondary },
  confirmBtn:   { flex: 2, padding: SPACING.md, alignItems: 'center', backgroundColor: COLORS.primary, borderRadius: RADIUS.lg },
  btnDisabled:  { opacity: 0.6 },
  confirmText:  { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.textInverse },
});
