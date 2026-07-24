import React, { useState } from 'react';
import {
  View, StyleSheet, KeyboardAvoidingView, Platform,
  TouchableOpacity, Alert,
} from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const { signInWithPassword } = useAuthStore();
  const [phone, setPhone]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);

  function formatPhone(raw: string) {
    return raw.replace(/\D/g, '').slice(0, 10);
  }

  async function handleSignIn() {
    if (phone.length < 10) {
      Alert.alert('Invalid number', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Invalid password', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const { error } = await signInWithPassword(phone, password);
    setLoading(false);
    if (error) {
      Alert.alert('Sign in failed', error);
    }
    // On success, onAuthStateChange in root _layout handles navigation
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Hero bar */}
        <View style={styles.hero}>
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Welcome back 👋</Text>
            <Text style={styles.heroSub}>Sign in to your LooP account</Text>
          </View>
        </View>

        {/* Form */}
        <View style={styles.form}>
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

          <Text style={[styles.label, { marginTop: SPACING.md }]}>PASSWORD</Text>
          <TextInput
            mode="outlined"
            style={styles.input}
            placeholder="Enter your password"
            secureTextEntry={!showPass}
            value={password}
            onChangeText={setPassword}
            outlineStyle={{ borderRadius: RADIUS.md, borderColor: COLORS.border }}
            right={
              <TextInput.Icon
                icon={showPass ? 'eye-off' : 'eye'}
                onPress={() => setShowPass((v) => !v)}
                color={COLORS.textSecondary}
              />
            }
          />

          <TouchableOpacity onPress={() => Alert.alert('Coming soon', 'Password reset will be available soon.')}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <Button
            mode="contained"
            onPress={handleSignIn}
            loading={loading}
            disabled={loading || phone.length < 10 || password.length < 6}
            style={styles.btn}
            contentStyle={styles.btnContent}
            labelStyle={styles.btnLabel}
          >
            Sign In
          </Button>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/register')}>
              <Text style={styles.registerLink}>Create one</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000000' },
  hero: {
    backgroundColor: '#000000',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  back:        { paddingTop: SPACING.sm },
  backText:    { color: 'rgba(255,255,255,0.8)', fontSize: FONT_SIZE.md },
  heroContent: { marginTop: SPACING.lg, gap: SPACING.xs },
  heroTitle:   { fontSize: FONT_SIZE.xxxl, fontWeight: '800', color: '#FFFFFF' },
  heroSub:     { fontSize: FONT_SIZE.sm, color: 'rgba(255,255,255,0.75)' },

  form: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: SPACING.xl,
    paddingTop: SPACING.lg,
    gap: SPACING.sm,
  },
  label: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  phoneRow:    { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  prefix: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  prefixText:  { fontSize: FONT_SIZE.md, fontWeight: '500' },
  phoneInput:  { flex: 1, backgroundColor: COLORS.surface },
  input:       { backgroundColor: COLORS.surface },
  forgotText:  { fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: '600', textAlign: 'right', marginTop: SPACING.xs },

  btn:         { borderRadius: RADIUS.lg, marginTop: SPACING.sm },
  btnContent:  { paddingVertical: 8 },
  btnLabel:    { fontSize: FONT_SIZE.md, fontWeight: '700' },

  registerRow:  { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.sm },
  registerText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  registerLink: { fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: '700' },
});
