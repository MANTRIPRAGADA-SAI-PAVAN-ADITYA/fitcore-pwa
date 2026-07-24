import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { router } from 'expo-router';
import { useAuthStore } from '../../../store/authStore';
import { UserRole } from '../../../types';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOWS } from '../../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

const ROLES: { value: UserRole; label: string; icon: string; desc: string }[] = [
  { value: 'driver',  label: 'Driver / Trucker', icon: '🚛', desc: 'I have truck space to offer' },
  { value: 'shipper', label: 'Load Owner',        icon: '📦', desc: 'I have goods to transport' },
  { value: 'both',    label: 'Both',              icon: '🔄', desc: 'I drive & ship' },
];

export default function EditProfileScreen() {
  const { profile, updateProfile } = useAuthStore();
  const [name, setName]       = useState(profile?.name ?? '');
  const [company, setCompany] = useState(profile?.company ?? '');
  const [role, setRole]       = useState<UserRole>(profile?.role ?? 'shipper');
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!name.trim()) { Alert.alert('Required', 'Name is required.'); return; }
    setLoading(true);
    await updateProfile({ name: name.trim(), company: company.trim() || null, role });
    setLoading(false);
    router.back();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Edit Profile</Text>
          <View style={{ width: 48 }} />
        </View>

        <Text style={styles.label}>FULL NAME</Text>
        <TextInput
          mode="outlined"
          value={name}
          onChangeText={setName}
          style={styles.input}
          outlineStyle={{ borderRadius: RADIUS.md, borderColor: COLORS.border }}
        />

        <Text style={styles.label}>COMPANY / BUSINESS NAME (OPTIONAL)</Text>
        <TextInput
          mode="outlined"
          value={company}
          onChangeText={setCompany}
          placeholder="e.g. Kumar Transport Pvt. Ltd."
          style={styles.input}
          outlineStyle={{ borderRadius: RADIUS.md, borderColor: COLORS.border }}
        />

        <Text style={styles.label}>I AM A...</Text>
        <View style={styles.roleGrid}>
          {ROLES.map((r) => {
            const active = role === r.value;
            return (
              <TouchableOpacity
                key={r.value}
                style={[styles.roleCard, active && styles.roleCardActive]}
                onPress={() => setRole(r.value)}
                activeOpacity={0.8}
              >
                <Text style={styles.roleIcon}>{r.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.roleLabel, active && styles.roleLabelActive]}>{r.label}</Text>
                  <Text style={styles.roleDesc}>{r.desc}</Text>
                </View>
                {active && (
                  <View style={styles.check}>
                    <Text style={styles.checkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Button
          mode="contained"
          onPress={handleSave}
          loading={loading}
          disabled={loading}
          style={styles.btn}
          contentStyle={styles.btnContent}
          labelStyle={styles.btnLabel}
        >
          Save Changes
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, gap: SPACING.sm, paddingBottom: SPACING.xxl },
  header:  {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: SPACING.md,
  },
  back:  { color: COLORS.primary, fontSize: FONT_SIZE.md, padding: SPACING.sm },
  title: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.textPrimary },
  label: {
    fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginTop: SPACING.sm,
  },
  input: { backgroundColor: COLORS.surface },

  roleGrid: { gap: SPACING.sm },
  roleCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.md, borderWidth: 2, borderColor: COLORS.border,
    position: 'relative', ...SHADOWS.sm,
  },
  roleCardActive:  { borderColor: COLORS.primary, backgroundColor: COLORS.background },
  roleIcon:        { fontSize: 28, width: 36, textAlign: 'center' },
  roleLabel:       { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.textPrimary },
  roleLabelActive: { color: COLORS.primary },
  roleDesc:        { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  check: {
    position: 'absolute', right: SPACING.md, top: SPACING.md,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  checkText: { color: COLORS.textInverse, fontSize: 12, fontWeight: '800' },

  btn:        { borderRadius: RADIUS.lg, marginTop: SPACING.lg },
  btnContent: { paddingVertical: 8 },
  btnLabel:   { fontSize: FONT_SIZE.md, fontWeight: '700' },
});
