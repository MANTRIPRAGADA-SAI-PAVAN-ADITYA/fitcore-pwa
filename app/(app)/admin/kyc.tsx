import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, FlatList, TouchableOpacity, Alert, Image
} from 'react-native';
import { Text, Button, TextInput, ActivityIndicator } from 'react-native-paper';
import { router } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import { KycDocument } from '../../../types';
import Badge from '../../../components/ui/Badge';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOWS } from '../../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

interface DocWithUser extends KycDocument {
  profiles: { name: string | null; phone: string | null; role: string };
}

export default function AdminKycScreen() {
  const { profile } = useAuthStore();
  const [docs, setDocs] = useState<DocWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.role !== 'admin') { router.back(); return; }
    fetchDocs();
  }, [filter]);

  async function fetchDocs() {
    setLoading(true);
    const { data } = await supabase
      .from('kyc_documents')
      .select('*, profiles(name, phone, role)')
      .eq('status', filter)
      .order('uploaded_at', { ascending: true });
    setDocs((data ?? []) as DocWithUser[]);
    setLoading(false);
  }

  async function handleDecision(docId: string, decision: 'approved' | 'rejected') {
    const note = noteInputs[docId] ?? '';
    setProcessing(docId);
    const { error } = await supabase
      .from('kyc_documents')
      .update({
        status: decision,
        admin_note: note || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: profile?.id,
      })
      .eq('id', docId);
    setProcessing(null);
    if (error) { Alert.alert('Error', error.message); return; }
    fetchDocs();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>KYC Review</Text>
        <View style={{ width: 48 }} />
      </View>

      {/* Filter tabs */}
      <View style={styles.tabs}>
        {(['pending', 'approved', 'rejected'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.tab, filter === f && styles.tabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.tabText, filter === f && styles.tabTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      ) : (
        <FlatList
          data={docs}
          keyExtractor={(d) => d.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No {filter} documents</Text>
          }
          renderItem={({ item: doc }) => (
            <View style={styles.docCard}>
              <View style={styles.docTop}>
                <View>
                  <Text style={styles.userName}>{doc.profiles?.name ?? 'Unknown'}</Text>
                  <Text style={styles.userPhone}>{doc.profiles?.phone} · {doc.profiles?.role}</Text>
                </View>
                <Badge label={doc.doc_type.toUpperCase()} variant="info" />
              </View>

              <Image source={{ uri: doc.file_url }} style={styles.preview} resizeMode="contain" />

              <Text style={styles.dateText}>
                Uploaded {new Date(doc.uploaded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>

              {filter === 'pending' && (
                <>
                  <TextInput
                    mode="outlined"
                    placeholder="Admin note (optional)"
                    value={noteInputs[doc.id] ?? ''}
                    onChangeText={(t) => setNoteInputs((p) => ({ ...p, [doc.id]: t }))}
                    style={styles.noteInput}
                    outlineStyle={{ borderRadius: RADIUS.sm }}
                    dense
                  />
                  <View style={styles.actionRow}>
                    <Button
                      mode="contained"
                      onPress={() => handleDecision(doc.id, 'approved')}
                      loading={processing === doc.id}
                      disabled={!!processing}
                      style={[styles.actionBtn, { backgroundColor: COLORS.success }]}
                      icon="check"
                    >
                      Approve
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={() => handleDecision(doc.id, 'rejected')}
                      loading={processing === doc.id}
                      disabled={!!processing}
                      style={styles.actionBtn}
                      textColor={COLORS.danger}
                    >
                      Reject
                    </Button>
                  </View>
                </>
              )}

              {doc.admin_note && filter !== 'pending' && (
                <Text style={styles.adminNote}>Note: {doc.admin_note}</Text>
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.md },
  back: { color: COLORS.primary, fontSize: FONT_SIZE.md },
  title: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.textPrimary },
  tabs: { flexDirection: 'row', paddingHorizontal: SPACING.md, gap: SPACING.sm, marginBottom: SPACING.sm },
  tab: { flex: 1, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, alignItems: 'center', ...SHADOWS.sm },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.textInverse },
  list: { padding: SPACING.md, gap: SPACING.md },
  empty: { textAlign: 'center', color: COLORS.textTertiary, marginTop: SPACING.xl },
  docCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, gap: SPACING.sm, ...SHADOWS.sm },
  docTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  userName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.textPrimary },
  userPhone: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  preview: { width: '100%', height: 200, borderRadius: RADIUS.md, backgroundColor: COLORS.background },
  dateText: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },
  noteInput: { backgroundColor: COLORS.surface },
  actionRow: { flexDirection: 'row', gap: SPACING.sm },
  actionBtn: { flex: 1, borderRadius: RADIUS.md },
  adminNote: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, fontStyle: 'italic' },
});
