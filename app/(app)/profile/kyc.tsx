import React, { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, Alert, Image
} from 'react-native';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import { router } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import { pickImage, pickDocument, uploadKycDocument } from '../../../lib/storage';
import { KycDocument, DocType } from '../../../types';
import Badge from '../../../components/ui/Badge';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOWS } from '../../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

const DOC_CONFIGS: { type: DocType; label: string; icon: string; required: boolean }[] = [
  { type: 'license',  label: "Driver's License",   icon: '🪪', required: true },
  { type: 'rc',       label: 'RC (Vehicle)',        icon: '🚗', required: true },
  { type: 'gst',      label: 'GST Certificate',     icon: '📄', required: false },
  { type: 'aadhar',   label: 'Aadhaar Card',        icon: '🆔', required: false },
  { type: 'pan',      label: 'PAN Card',            icon: '💳', required: false },
];

const STATUS_BADGE: Record<string, { label: string; variant: any }> = {
  pending:  { label: 'Under Review', variant: 'warning' },
  approved: { label: 'Approved ✓',   variant: 'success' },
  rejected: { label: 'Rejected',     variant: 'danger' },
};

export default function KycScreen() {
  const { profile } = useAuthStore();
  const [docs, setDocs] = useState<KycDocument[]>([]);
  const [uploading, setUploading] = useState<DocType | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDocs = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('kyc_documents')
      .select('*')
      .eq('user_id', profile.id)
      .order('uploaded_at', { ascending: false });
    setDocs((data ?? []) as KycDocument[]);
    setLoading(false);
  }, [profile]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  async function handleUpload(docType: DocType) {
    try {
      setUploading(docType);
      const asset = await pickImage();
      if (!asset || !profile) return;

      const fileName = asset.fileName ?? `${docType}_${Date.now()}.jpg`;
      const url = await uploadKycDocument(profile.id, docType, asset.uri, fileName);

      // Upsert doc record
      const { error } = await supabase.from('kyc_documents').upsert({
        user_id: profile.id,
        doc_type: docType,
        file_url: url,
        file_name: fileName,
        status: 'pending',
      }, { onConflict: 'user_id,doc_type' });

      if (error) throw error;
      await fetchDocs();
      Alert.alert('Uploaded!', 'Your document has been submitted for review.');
    } catch (e: any) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setUploading(null);
    }
  }

  const docMap = new Map(docs.map((d) => [d.doc_type, d]));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>KYC Documents</Text>
          <View style={{ width: 48 }} />
        </View>

        {/* Status banner */}
        <View style={styles.statusBanner}>
          <Text style={styles.bannerIcon}>
            {profile?.kyc_status === 'approved' ? '✅' :
             profile?.kyc_status === 'rejected' ? '❌' :
             profile?.kyc_status === 'pending' ? '⏳' : '📋'}
          </Text>
          <View>
            <Text style={styles.bannerTitle}>
              {profile?.kyc_status === 'approved' ? 'Your account is verified' :
               profile?.kyc_status === 'rejected' ? 'Verification rejected' :
               profile?.kyc_status === 'pending' ? 'Verification in progress' :
               'Complete verification to build trust'}
            </Text>
            <Text style={styles.bannerSubtitle}>
              Upload at least 2 documents to submit for review
            </Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
        ) : (
          DOC_CONFIGS.map((cfg) => {
            const doc = docMap.get(cfg.type);
            const isUploading = uploading === cfg.type;
            return (
              <View key={cfg.type} style={styles.docCard}>
                <View style={styles.docHeader}>
                  <Text style={styles.docIcon}>{cfg.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={styles.docLabelRow}>
                      <Text style={styles.docLabel}>{cfg.label}</Text>
                      {cfg.required && <Badge label="Required" variant="primary" />}
                    </View>
                    {doc && (
                      <Badge label={STATUS_BADGE[doc.status].label} variant={STATUS_BADGE[doc.status].variant} />
                    )}
                    {doc?.admin_note && (
                      <Text style={styles.adminNote}>💬 {doc.admin_note}</Text>
                    )}
                  </View>
                </View>

                {doc?.file_url && (
                  <Image
                    source={{ uri: doc.file_url }}
                    style={styles.preview}
                    resizeMode="cover"
                  />
                )}

                <Button
                  mode={doc ? 'outlined' : 'contained'}
                  onPress={() => handleUpload(cfg.type)}
                  loading={isUploading}
                  disabled={!!uploading}
                  style={styles.uploadBtn}
                  icon="upload"
                >
                  {doc ? 'Re-upload' : 'Upload'}
                </Button>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  content: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { color: COLORS.primary, fontSize: FONT_SIZE.md, padding: SPACING.sm },
  title: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.textPrimary },
  statusBanner: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    gap: SPACING.md,
    alignItems: 'flex-start',
    ...SHADOWS.sm,
  },
  bannerIcon: { fontSize: 32 },
  bannerTitle: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.textPrimary },
  bannerSubtitle: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  docCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  docHeader: { flexDirection: 'row', gap: SPACING.md, alignItems: 'flex-start' },
  docIcon: { fontSize: 28, marginTop: 2 },
  docLabelRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 4 },
  docLabel: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.textPrimary },
  adminNote: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 4 },
  preview: { width: '100%', height: 120, borderRadius: RADIUS.md, backgroundColor: COLORS.background },
  uploadBtn: { borderRadius: RADIUS.md },
});
