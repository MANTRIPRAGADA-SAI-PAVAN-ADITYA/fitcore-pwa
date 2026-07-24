import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Load } from '../../types';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { LOAD_TYPE_LABELS, LOAD_TYPE_ICONS } from '../../constants/pricing';

interface Props {
  load: Load;
  onPress: () => void;
  estimatedPrice?: number;
  demandLevel?: 'low' | 'normal' | 'high';
  distanceKm?: number;
  isUnlocked?: boolean;
}

const DEMAND_COLOR = { low: COLORS.success, normal: COLORS.warning, high: COLORS.danger };
const DEMAND_LABEL = { low: 'LOW',          normal: 'MED',          high: 'HIGH' };

function Tag({ label, color, bg, border }: { label: string; color: string; bg: string; border: string }) {
  return (
    <View style={[styles.tag, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[styles.tagText, { color }]}>{label}</Text>
    </View>
  );
}

export default function LoadCard({ load, onPress, estimatedPrice, demandLevel, distanceKm, isUnlocked }: Props) {
  const demand = demandLevel ?? 'normal';
  const dColor = DEMAND_COLOR[demand];

  const displayPrice = estimatedPrice
    ? `₹${estimatedPrice.toLocaleString('en-IN')}`
    : load.budget_max
    ? `₹${load.budget_max.toLocaleString('en-IN')}`
    : null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.72}>
      {/* Left demand strip */}
      <View style={[styles.strip, { backgroundColor: dColor }]} />

      <View style={styles.body}>
        {/* Row 1: type + price */}
        <View style={styles.topRow}>
          <View style={styles.titleWrap}>
            <Text style={styles.icon}>{LOAD_TYPE_ICONS[load.load_type]}</Text>
            <View>
              <Text style={styles.typeName}>{LOAD_TYPE_LABELS[load.load_type].toUpperCase()}</Text>
              <Text style={styles.meta}>{load.weight_tons}T
                {distanceKm ? `  ·  ${Math.round(distanceKm)} km` : ''}
              </Text>
            </View>
          </View>
          {displayPrice ? (
            <View style={styles.priceWrap}>
              <Text style={styles.price}>{displayPrice}</Text>
              <Text style={[styles.demand, { color: dColor }]}>{DEMAND_LABEL[demand]}</Text>
            </View>
          ) : null}
        </View>

        {/* Row 2: route */}
        <View style={styles.route}>
          <View style={styles.routePoint}>
            <View style={styles.dotOrigin} />
            <Text style={styles.city} numberOfLines={1}>{load.origin}</Text>
          </View>
          <View style={styles.routeStem} />
          <View style={styles.routePoint}>
            <View style={styles.dotDest} />
            <Text style={styles.city} numberOfLines={1}>{load.destination}</Text>
          </View>
        </View>

        {/* Row 3: tags */}
        <View style={styles.tags}>
          <Tag
            label={new Date(load.pickup_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            color={COLORS.textSecondary} bg={COLORS.background} border={COLORS.border}
          />
          {load.shipper?.kyc_status === 'approved' && (
            <Tag label="✓ Verified" color={COLORS.success} bg={COLORS.successBg} border="#BBF7D0" />
          )}
          {load.listing_mode === 'managed' ? (
            <Tag label="🛡 Managed" color={COLORS.textSecondary} bg={COLORS.background} border={COLORS.border} />
          ) : isUnlocked ? (
            <Tag label={`📞 ${load.shipper?.phone ?? 'Unlocked'}`} color={COLORS.info} bg={COLORS.infoBg} border="#BFDBFE" />
          ) : (
            <Tag label="📢 1 Credit" color={COLORS.warning} bg={COLORS.warningBg} border="#FDE68A" />
          )}
        </View>

        {load.notes ? (
          <Text style={styles.notes} numberOfLines={1}>{load.notes}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  strip: { width: 3 },
  body:  { flex: 1, padding: SPACING.md, gap: 8 },

  topRow:    { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  icon:      { fontSize: 22 },
  typeName:  { fontSize: FONT_SIZE.md, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: 0.2 },
  meta:      { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, fontWeight: '500', marginTop: 1 },

  priceWrap: { alignItems: 'flex-end', gap: 2 },
  price:     { fontSize: FONT_SIZE.lg, fontWeight: '800', color: COLORS.textPrimary },
  demand:    { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },

  route:      { gap: 0, paddingLeft: 2 },
  routePoint: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dotOrigin:  { width: 7, height: 7, borderRadius: 3.5, backgroundColor: COLORS.success, flexShrink: 0 },
  dotDest:    { width: 7, height: 7, borderRadius: 3.5, backgroundColor: COLORS.danger, flexShrink: 0 },
  routeStem:  { width: 1, height: 10, backgroundColor: COLORS.border, marginLeft: 3 },
  city:       { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textPrimary, flex: 1 },

  tags:    { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  tag:     { paddingHorizontal: 7, paddingVertical: 3, borderRadius: RADIUS.sm, borderWidth: 1 },
  tagText: { fontSize: 11, fontWeight: '600' },

  notes: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },
});
