import React, { useState } from 'react';
import { View, StyleSheet, Modal, Alert, Linking } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  listingType: 'truck' | 'load';
  listingId: string;
  listingTitle: string;
  ownerName: string;
}

export default function UnlockModal({ visible, onClose, listingType, listingId, listingTitle, ownerName }: Props) {
  const { profile, refreshCredits } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [unlockedPhone, setUnlockedPhone] = useState<string | null>(null);

  async function handleUnlock() {
    if (!profile) return;
    if (profile.credits < 1) {
      Alert.alert('Not enough credits', 'You need at least 1 credit to unlock this contact.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('unlock_listing', {
        p_unlocker_id: profile.id,
        p_listing_type: listingType,
        p_listing_id: listingId,
      });
      if (error) throw error;
      const result = data as { success: boolean; phone?: string; error?: string; already_unlocked?: boolean };
      if (!result.success) {
        Alert.alert('Error', result.error ?? 'Failed to unlock');
        return;
      }
      setUnlockedPhone(result.phone ?? null);
      await refreshCredits();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleCall() {
    if (!unlockedPhone) return;
    Linking.openURL(`tel:${unlockedPhone}`);
  }

  function handleClose() {
    setUnlockedPhone(null);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {!unlockedPhone ? (
            <>
              <Text style={styles.icon}>🔒</Text>
              <Text style={styles.title}>Unlock Contact</Text>
              <Text style={styles.subtitle}>
                Reveal {ownerName}'s phone number to discuss{'\n'}
                <Text style={styles.listingName}>{listingTitle}</Text>
              </Text>

              <View style={styles.costBox}>
                <Text style={styles.costLabel}>Cost</Text>
                <Text style={styles.costValue}>1 Credit</Text>
                <Text style={styles.balanceText}>Your balance: {profile?.credits ?? 0} credits</Text>
              </View>

              <Text style={styles.disclaimer}>
                Negotiation happens outside the app. LooP does not guarantee rates.
              </Text>

              <Button
                mode="contained"
                onPress={handleUnlock}
                loading={loading}
                disabled={loading || (profile?.credits ?? 0) < 1}
                style={styles.unlockBtn}
                contentStyle={styles.btnContent}
              >
                Unlock for 1 Credit
              </Button>
              <Button mode="text" onPress={handleClose} style={styles.cancelBtn}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Text style={styles.icon}>✅</Text>
              <Text style={styles.title}>Contact Unlocked</Text>
              <Text style={styles.subtitle}>{ownerName}</Text>
              <TouchablePhoneNumber phone={unlockedPhone} onCall={handleCall} />
              <Text style={styles.disclaimer}>
                Contact them directly to negotiate the trip details.
              </Text>
              <Button mode="contained" onPress={handleCall} style={styles.unlockBtn} contentStyle={styles.btnContent}>
                Call Now
              </Button>
              <Button mode="outlined" onPress={handleClose} style={styles.cancelBtn}>
                Done
              </Button>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function TouchablePhoneNumber({ phone, onCall }: { phone: string; onCall: () => void }) {
  return (
    <View style={styles.phoneBox}>
      <Text style={styles.phoneNumber}>{phone}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modal: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    width: '100%',
    alignItems: 'center',
    gap: SPACING.sm,
    ...SHADOWS.lg,
  },
  icon: { fontSize: 48 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  listingName: { fontWeight: '600', color: COLORS.textPrimary },
  costBox: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    width: '100%',
    alignItems: 'center',
    gap: 4,
  },
  costLabel: { fontSize: 12, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
  costValue: { fontSize: 28, fontWeight: '800', color: COLORS.primary },
  balanceText: { fontSize: 13, color: COLORS.textSecondary },
  disclaimer: { fontSize: 12, color: COLORS.textTertiary, textAlign: 'center', lineHeight: 18 },
  unlockBtn: { width: '100%', borderRadius: RADIUS.lg, marginTop: SPACING.xs },
  btnContent: { paddingVertical: 6 },
  cancelBtn: { width: '100%' },
  phoneBox: {
    backgroundColor: '#E8F1FF',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    width: '100%',
    alignItems: 'center',
  },
  phoneNumber: { fontSize: 24, fontWeight: '700', color: COLORS.primary, letterSpacing: 2 },
});
