import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { RADIUS, FONT_SIZE } from '../../constants/theme';

type Variant = 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';

interface Props {
  label: string;
  variant?: Variant;
  style?: ViewStyle;
}

const VARIANTS: Record<Variant, { bg: string; text: string; border: string }> = {
  primary: { bg: '#F4F4F5', text: '#0D0D0D',  border: '#E4E4E7' },
  success: { bg: '#F0FDF4', text: '#16A34A',  border: '#BBF7D0' },
  danger:  { bg: '#FEF2F2', text: '#DC2626',  border: '#FECACA' },
  warning: { bg: '#FFFBEB', text: '#D97706',  border: '#FDE68A' },
  info:    { bg: '#EFF6FF', text: '#2563EB',  border: '#BFDBFE' },
  neutral: { bg: '#F4F4F5', text: '#71717A',  border: '#E4E4E7' },
};

export default function Badge({ label, variant = 'neutral', style }: Props) {
  const v = VARIANTS[variant];
  return (
    <View style={[styles.badge, { backgroundColor: v.bg, borderColor: v.border }, style]}>
      <Text style={[styles.text, { color: v.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  text: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
