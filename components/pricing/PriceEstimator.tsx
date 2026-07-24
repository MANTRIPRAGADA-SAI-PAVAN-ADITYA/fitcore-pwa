import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { PriceEstimate } from '../../types';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';

interface Props {
  estimate: PriceEstimate;
}

export default function PriceEstimator({ estimate }: Props) {
  const demandConfig = {
    low:    { label: 'Low Demand ↘',    color: COLORS.success, bg: '#E8F8EE' },
    normal: { label: 'Normal Demand →',  color: COLORS.warning, bg: '#FFF4E5' },
    high:   { label: 'High Demand ↗',   color: COLORS.danger,  bg: '#FFEEED' },
  }[estimate.demand_level];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>PRICE ESTIMATE</Text>

      <Text style={styles.mainPrice}>
        ₹{estimate.estimated_price.toLocaleString('en-IN')}
      </Text>

      <View style={[styles.demandBadge, { backgroundColor: demandConfig.bg }]}>
        <Text style={[styles.demandText, { color: demandConfig.color }]}>
          {demandConfig.label}
        </Text>
      </View>

      <View style={styles.breakdown}>
        <BreakdownRow label="Distance" value={`${estimate.distance_km} km`} />
        <BreakdownRow label="Base Rate" value={`₹${estimate.base_rate}/km`} />
        <BreakdownRow label="Load Factor" value={`×${estimate.load_factor}`} />
        <BreakdownRow label="Fuel Surcharge" value={`×${estimate.fuel_surcharge}`} />
        <BreakdownRow label="Demand" value={`×${estimate.demand_multiplier}`} />
      </View>

      <Text style={styles.note}>
        * This is an estimate only. Actual price is negotiated directly with the party.
      </Text>
    </View>
  );
}

function BreakdownRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  label: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.textTertiary,
    letterSpacing: 1,
  },
  mainPrice: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  demandBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  demandText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  breakdown: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    gap: 6,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  rowValue: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textPrimary },
  note: { fontSize: 11, color: COLORS.textTertiary, lineHeight: 16 },
});
