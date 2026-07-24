import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { UserRole } from '../../types';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOWS } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

const ROLES: { value: UserRole; label: string; icon: string; desc: string }[] = [
  { value: 'driver',  label: 'Driver / Trucker', icon: '🚛', desc: 'I offer truck space' },
  { value: 'shipper', label: 'Load Owner',        icon: '📦', desc: 'I need to ship goods' },
  { value: 'both',    label: 'Both',              icon: '🔄', desc: 'I drive & ship' },
];

export default function RegisterScreen() {
  const { signUpWithPassword } = useAuthStore();

  const [name, setName]             = useState('');
  const [phone, setPhone]           = useState('');
  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [role, setRole]             = useState<UserRole | null>(null);
  const [showPass, setShowPass]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]       = useState(false);

  function formatPhone(raw: string) {
    return raw.replace(/\D/g, '').slice(0, 10);
  }

  async function handleCreate() {
    if (!name.trim()) { Alert.alert('Required', 'Please enter your full name.'); return; }
    if (phone.length < 10) { Alert.alert('Invalid number', 'Please enter a valid 10-digit mobile number.'); return; }
    if (password.length < 6) { Alert.alert('Weak password', 'Password must be at least 6 characters.'); return; }
    if (password !== confirm) { Alert.alert('Mismatch', 'Passwords do not match.'); return; }
    if (!role) { Alert.alert('Required', 'Please select your role.'); return; }

    setLoading(true);
    const { error } = await signUpWithPassword(name.trim(), phone, password, role);
    setLoading(false);

    if (error) {
      Alert.alert('Registration failed', error);
      return;
    }
    // Navigate to setup to complete profile
    router.replace('/(auth)/setup');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>It takes less than a minute to get started</Text>

        {/* Name */}
        <Text style={styles.label}>FULL NAME</Text>
        <TextInput
          mode="outlined"
          placeholder="e.g. Rajesh Kumar"
          value={name}
          onChangeText={setName}
          style={styles.input}
          outlineStyle={{ borderRadius: RADIUS.md, borderColor: COLORS.border }}
        />

        {/* Phone */}
        <Text style={styles.label}>MOBILE NUMBER</Text>
        <View style={styles.phoneRow}>
          <View style={styles.prefix}>
            <Text style={styles.prefixText}>🇮🇳  +91</Text>
          </View>
          <TextInput
            mode="outlined"
            style={styles.phoneInput}
            placeholder="98765 43210"
            keyboardType="phone-pad"
            maxLength={10}
            value={phone}
            onChangeText={(t) => setPhone(formatPhone(t))}
            outlineStyle={{ borderRadius: RADIUS.md, borderColor: COLORS.border }}
          />
        </View>

        {/* Password */}
        <Text style={styles.label}>PASSWORD</Text>
        <TextInput
          mode="outlined"
          placeholder="Min. 6 characters"
          secureTextEntry={!showPass}
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          outlineStyle={{ borderRadius: RADIUS.md, borderColor: COLORS.border }}
          right={
            <TextInput.Icon
              icon={showPass ? 'eye-off' : 'eye'}
              onPress={() => setShowPass((v) => !v)}
              color={COLORS.textSecondary}
            />
          }
        />

        <Text style={styles.label}>CONFIRM PASSWORD</Text>
        <TextInput
          mode="outlined"
          placeholder="Re-enter your password"
          secureTextEntry={!showConfirm}
          value={confirm}
          onChangeText={setConfirm}
          style={styles.input}
          outlineStyle={{
            borderRadius: RADIUS.md,
            borderColor: confirm && confirm !== password ? COLORS.danger : COLORS.border,
          }}
          right={
            <TextInput.Icon
              icon={showConfirm ? 'eye-off' : 'eye'}
              onPress={() => setShowConfirm((v) => !v)}
              color={COLORS.textSecondary}
            />
          }
        />
        {confirm.length > 0 && confirm !== password && (
          <Text style={styles.errorText}>Passwords do not match</Text>
        )}

        {/* Role */}
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
                <Text style={[styles.roleLabel, active && styles.roleLabelActive]}>{r.label}</Text>
                <Text style={styles.roleDesc}>{r.desc}</Text>
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
          onPress={handleCreate}
          loading={loading}
          disabled={loading}
          style={styles.btn}
          contentStyle={styles.btnContent}
          labelStyle={styles.btnLabel}
        >
          Create Account
        </Button>

        <View style={styles.signinRow}>
          <Text style={styles.signinText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/otp')}>
            <Text style={styles.signinLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.background },
  scroll:  { flex: 1 },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl, gap: SPACING.sm },
  header:  { marginBottom: SPACING.xs },
  back:    { color: COLORS.primary, fontSize: FONT_SIZE.md, paddingVertical: SPACING.sm },
  title:   { fontSize: FONT_SIZE.xxxl, fontWeight: '800', color: COLORS.textPrimary, lineHeight: 40 },
  subtitle:{ fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginBottom: SPACING.md },

  label: {
    fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginTop: SPACING.sm,
  },
  input:       { backgroundColor: COLORS.surface },
  phoneRow:    { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  prefix: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  prefixText:  { fontSize: FONT_SIZE.md, fontWeight: '500' },
  phoneInput:  { flex: 1, backgroundColor: COLORS.surface },
  errorText:   { fontSize: FONT_SIZE.xs, color: COLORS.danger, marginTop: -SPACING.xs },

  roleGrid: { gap: SPACING.sm },
  roleCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.md, borderWidth: 2, borderColor: COLORS.border,
    position: 'relative', ...SHADOWS.sm,
  },
  roleCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.background },
  roleIcon:       { fontSize: 28, width: 36, textAlign: 'center' },
  roleLabel:      { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  roleLabelActive:{ color: COLORS.primary },
  roleDesc:       { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  check: {
    position: 'absolute', right: SPACING.md, top: SPACING.md,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  checkText: { color: COLORS.textInverse, fontSize: 12, fontWeight: '800' },

  btn:        { borderRadius: RADIUS.lg, marginTop: SPACING.md },
  btnContent: { paddingVertical: 8 },
  btnLabel:   { fontSize: FONT_SIZE.md, fontWeight: '700' },

  signinRow:  { flexDirection: 'row', justifyContent: 'center', paddingTop: SPACING.sm },
  signinText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  signinLink: { fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: '700' },
});
