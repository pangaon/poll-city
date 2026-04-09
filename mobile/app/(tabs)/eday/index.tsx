/**
 * E-Day tab — role-aware.
 *
 * CAMPAIGN_MANAGER / ADMIN / SUPER_ADMIN:
 *   Command overview — scrutineer assignments, result coverage, quick links.
 *
 * VOLUNTEER (as assigned scrutineer):
 *   My assignment card + native camera OCR scanner + result submission.
 *
 * Both roles can submit results manually if no OCR is needed.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  Camera,
  CheckCircle,
  ChevronRight,
  Edit3,
  RefreshCw,
  Send,
  Shield,
  Users,
  X,
  ZoomIn,
} from 'lucide-react-native';
import { useAuth } from '../../../lib/auth';
import {
  apiFetch,
  ApiError,
  fetchMyAssignment,
  ocrScanPrintout,
  submitResultEntry,
} from '../../../lib/api';
import type { OcrCandidate, OcrResult, ScrutineerAssignment } from '../../../lib/types';
import Constants from 'expo-constants';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NAVY = '#0A2342';
const GREEN = '#1D9E75';
const AMBER = '#EF9F27';
const RED = '#E24B4A';

const BASE_URL: string =
  (Constants.expoConfig?.extra as { EXPO_PUBLIC_API_URL?: string } | undefined)
    ?.EXPO_PUBLIC_API_URL ??
  process.env.EXPO_PUBLIC_API_URL ??
  'https://app.poll.city';

const CM_ROLES = new Set(['CAMPAIGN_MANAGER', 'ADMIN', 'SUPER_ADMIN']);

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={styles.sectionHeader}>{title.toUpperCase()}</Text>
  );
}

function StatBox({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// ── CM COMMAND OVERVIEW ──────────────────────────────────────────────────────
// ---------------------------------------------------------------------------

interface ScrutineerRow {
  id: string;
  userId: string;
  userName: string | null;
  pollingStation: string;
  municipality: string;
  candidateSigned: boolean;
  electionDate: string;
}

function CmEdayView({ campaignId }: { campaignId: string }) {
  const [assignments, setAssignments] = useState<ScrutineerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAssignments = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<{ data: ScrutineerRow[] }>(
          '/api/eday/scrutineers',
          { params: { campaignId } },
        );
        setAssignments(data.data ?? []);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(`Error ${err.status}`);
        } else {
          setError('Could not load assignments.');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [campaignId],
  );

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const signed = assignments.filter((a) => a.candidateSigned).length;
  const unsigned = assignments.length - signed;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={NAVY} />
        <Text style={styles.loadingText}>Loading E-Day status…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => loadAssignments(true)} tintColor={NAVY} />
      }
    >
      {/* Header */}
      <View style={styles.cmHeader}>
        <Shield size={24} color={NAVY} />
        <View style={styles.cmHeaderText}>
          <Text style={styles.cmHeaderTitle}>E-Day Command</Text>
          <Text style={styles.cmHeaderSub}>Scrutineer & Results Overview</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatBox value={assignments.length} label="Assigned" color={NAVY} />
        <StatBox value={signed} label="Signed" color={GREEN} />
        <StatBox value={unsigned} label="Unsigned" color={unsigned > 0 ? AMBER : GREEN} />
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Assignment list */}
      <SectionHeader title="Scrutineer Assignments" />

      {assignments.length === 0 ? (
        <View style={styles.emptyCard}>
          <Users size={40} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No scrutineers assigned</Text>
          <Text style={styles.emptySub}>
            Go to the web app to assign scrutineers to polling stations.
          </Text>
        </View>
      ) : (
        assignments.map((a) => (
          <View key={a.id} style={styles.assignmentCard}>
            <View style={styles.assignmentLeft}>
              <Text style={styles.assignmentStation} numberOfLines={1}>
                {a.pollingStation}
              </Text>
              <Text style={styles.assignmentMunicipality}>{a.municipality}</Text>
              {a.userName ? (
                <Text style={styles.assignmentName}>{a.userName}</Text>
              ) : null}
            </View>
            <View
              style={[
                styles.signedBadge,
                { backgroundColor: a.candidateSigned ? '#d1fae5' : '#fef3c7' },
              ]}
            >
              <Text
                style={[
                  styles.signedBadgeText,
                  { color: a.candidateSigned ? '#065f46' : '#92400e' },
                ]}
              >
                {a.candidateSigned ? 'Signed' : 'Unsigned'}
              </Text>
            </View>
          </View>
        ))
      )}

      {/* Web app deep-link */}
      <Pressable
        style={styles.webLinkButton}
        onPress={() => {
          const url = `${BASE_URL}/campaigns/${campaignId}/election-night`;
          // Use Linking from react-native
          require('react-native').Linking.openURL(url).catch(() => {});
        }}
        accessibilityRole="button"
      >
        <Text style={styles.webLinkText}>Open Election Night Dashboard</Text>
        <ChevronRight size={16} color={NAVY} />
      </Pressable>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// ── SCRUTINEER OCR FLOW ──────────────────────────────────────────────────────
// ---------------------------------------------------------------------------

type ScanStep = 'ready' | 'camera' | 'scanning' | 'review' | 'submitting' | 'done';

function ScrutineerEdayView({ campaignId }: { campaignId: string }) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [assignment, setAssignment] = useState<ScrutineerAssignment | null>(null);
  const [loadingAssignment, setLoadingAssignment] = useState(true);

  const [step, setStep] = useState<ScanStep>('ready');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [editableCandidates, setEditableCandidates] = useState<OcrCandidate[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedCount, setSubmittedCount] = useState(0);

  // Load my assignment
  useEffect(() => {
    fetchMyAssignment(campaignId)
      .then((res) => setAssignment(res.data ?? null))
      .catch(() => {})
      .finally(() => setLoadingAssignment(false));
  }, [campaignId]);

  async function handleCapture() {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: true,
        exif: false,
      });
      if (!photo?.uri) return;
      setCapturedUri(photo.uri);
      setStep('scanning');
      await runOcr(photo.base64 ?? '');
    } catch {
      Alert.alert('Camera Error', 'Could not capture photo. Please try again.');
      setStep('camera');
    }
  }

  async function runOcr(base64: string) {
    try {
      const result = await ocrScanPrintout({
        campaignId,
        imageBase64: base64,
        mimeType: 'image/jpeg',
        hint: assignment
          ? {
              pollingStation: assignment.pollingStation,
              municipality: assignment.municipality,
              ward: assignment.ward ?? undefined,
              province: assignment.province,
            }
          : undefined,
      });

      setOcrResult(result.data);
      setEditableCandidates([...result.data.candidates]);
      setStep('review');
    } catch (err) {
      Alert.alert(
        'Scan Failed',
        err instanceof ApiError
          ? `Could not scan: ${err.message}`
          : 'Could not read the printout. Try retaking the photo in better lighting.',
      );
      setStep('ready');
      setCapturedUri(null);
    }
  }

  async function handleSubmit() {
    if (!ocrResult || editableCandidates.length === 0) return;
    setStep('submitting');
    setSubmitError(null);

    let successCount = 0;
    for (const candidate of editableCandidates) {
      try {
        await submitResultEntry({
          campaignId,
          province: ocrResult.province ?? assignment?.province ?? 'ON',
          municipality: ocrResult.municipality ?? assignment?.municipality ?? '',
          ward: ocrResult.ward ?? assignment?.ward ?? null,
          office: ocrResult.office ?? 'Councillor',
          candidateName: candidate.name,
          party: candidate.party ?? null,
          votes: candidate.votes,
          percentReporting: ocrResult.percentReporting,
          ocrAssisted: true,
        });
        successCount++;
      } catch {
        // Continue with remaining candidates even if one fails
      }
    }

    setSubmittedCount(successCount);
    setStep('done');
  }

  function reset() {
    setStep('ready');
    setCapturedUri(null);
    setOcrResult(null);
    setEditableCandidates([]);
    setSubmitError(null);
    setSubmittedCount(0);
  }

  function updateCandidate(index: number, field: 'name' | 'votes', value: string) {
    setEditableCandidates((prev) =>
      prev.map((c, i) =>
        i === index
          ? { ...c, [field]: field === 'votes' ? parseInt(value, 10) || 0 : value }
          : c,
      ),
    );
  }

  // ── Loading ──
  if (loadingAssignment) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={NAVY} />
        <Text style={styles.loadingText}>Loading your assignment…</Text>
      </View>
    );
  }

  // ── Camera permission ──
  if (step === 'camera' && !permission?.granted) {
    return (
      <View style={styles.centered}>
        <Camera size={48} color="#cbd5e1" />
        <Text style={styles.permTitle}>Camera permission needed</Text>
        <Text style={styles.permSub}>
          Poll City needs camera access to scan results sheets.
        </Text>
        <Pressable style={styles.primaryBtn} onPress={requestPermission}>
          <Text style={styles.primaryBtnText}>Allow Camera</Text>
        </Pressable>
      </View>
    );
  }

  // ── Camera view ──
  if (step === 'camera') {
    return (
      <View style={styles.fill}>
        <CameraView ref={cameraRef} style={styles.fill} facing="back">
          {/* Overlay guide */}
          <View style={styles.cameraOverlay}>
            <View style={styles.cameraGuide} />
            <Text style={styles.cameraHint}>
              Align the results printout within the frame
            </Text>
          </View>
        </CameraView>
        <View style={styles.cameraControls}>
          <Pressable
            style={styles.cancelCameraBtn}
            onPress={() => setStep('ready')}
            accessibilityRole="button"
          >
            <X size={22} color="#ffffff" />
          </Pressable>
          <Pressable
            style={styles.captureBtn}
            onPress={handleCapture}
            accessibilityRole="button"
            accessibilityLabel="Take photo"
          >
            <View style={styles.captureBtnInner} />
          </Pressable>
          <View style={{ width: 44 }} />
        </View>
      </View>
    );
  }

  // ── Scanning ──
  if (step === 'scanning') {
    return (
      <View style={styles.centered}>
        {capturedUri && (
          <Image
            source={{ uri: capturedUri }}
            style={styles.scanningPreview}
            resizeMode="cover"
          />
        )}
        <ActivityIndicator size="large" color={NAVY} style={{ marginTop: 20 }} />
        <Text style={styles.scanningText}>Reading results sheet…</Text>
        <Text style={styles.scanningHint}>This usually takes 5–10 seconds</Text>
      </View>
    );
  }

  // ── Review ──
  if (step === 'review' && ocrResult) {
    const confidenceColor =
      ocrResult.confidence === 'high' ? GREEN : ocrResult.confidence === 'medium' ? AMBER : RED;

    return (
      <ScrollView style={styles.fill} contentContainerStyle={styles.scrollContent}>
        {/* Confidence banner */}
        <View style={[styles.confidenceBanner, { borderColor: confidenceColor }]}>
          <ZoomIn size={16} color={confidenceColor} />
          <Text style={[styles.confidenceText, { color: confidenceColor }]}>
            OCR confidence: {ocrResult.confidence.toUpperCase()}
          </Text>
        </View>

        {/* Station info */}
        <SectionHeader title="Polling Station" />
        <View style={styles.infoCard}>
          <Text style={styles.infoValue}>
            {ocrResult.pollingStation ?? assignment?.pollingStation ?? 'Unknown'}
          </Text>
          <Text style={styles.infoSub}>
            {[ocrResult.municipality ?? assignment?.municipality, ocrResult.ward ?? assignment?.ward]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>

        {/* Warnings */}
        {ocrResult.warnings.length > 0 && (
          <>
            <SectionHeader title="OCR Warnings" />
            {ocrResult.warnings.map((w, i) => (
              <View key={i} style={styles.warningRow}>
                <Text style={styles.warningText}>⚠ {w}</Text>
              </View>
            ))}
          </>
        )}

        {/* Editable candidate results */}
        <SectionHeader title="Candidates — tap to correct" />
        {editableCandidates.map((candidate, i) => (
          <View key={i} style={styles.candidateRow}>
            <View style={styles.candidateLeft}>
              <TextInput
                style={styles.candidateName}
                value={candidate.name}
                onChangeText={(v) => updateCandidate(i, 'name', v)}
                placeholder="Candidate name"
              />
              {candidate.party && (
                <Text style={styles.candidateParty}>{candidate.party}</Text>
              )}
            </View>
            <TextInput
              style={styles.candidateVotes}
              value={String(candidate.votes)}
              onChangeText={(v) => updateCandidate(i, 'votes', v)}
              keyboardType="number-pad"
              placeholder="0"
            />
          </View>
        ))}

        {submitError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{submitError}</Text>
          </View>
        )}

        <View style={styles.reviewActions}>
          <Pressable style={styles.outlineBtn} onPress={reset} accessibilityRole="button">
            <X size={16} color={NAVY} />
            <Text style={styles.outlineBtnText}>Retake</Text>
          </Pressable>
          <Pressable
            style={styles.primaryBtn}
            onPress={handleSubmit}
            accessibilityRole="button"
          >
            <Send size={16} color="#ffffff" />
            <Text style={styles.primaryBtnText}>Submit Results</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // ── Submitting ──
  if (step === 'submitting') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={NAVY} />
        <Text style={styles.loadingText}>Submitting results…</Text>
      </View>
    );
  }

  // ── Done ──
  if (step === 'done') {
    return (
      <View style={styles.centered}>
        <View style={styles.successCircle}>
          <CheckCircle size={48} color={GREEN} />
        </View>
        <Text style={styles.successTitle}>Results Submitted</Text>
        <Text style={styles.successSub}>
          {submittedCount} candidate result{submittedCount !== 1 ? 's' : ''} recorded
        </Text>
        <Pressable style={styles.primaryBtn} onPress={reset} accessibilityRole="button">
          <RefreshCw size={16} color="#ffffff" />
          <Text style={styles.primaryBtnText}>Scan Another Sheet</Text>
        </Pressable>
      </View>
    );
  }

  // ── Ready state ──
  return (
    <ScrollView style={styles.fill} contentContainerStyle={styles.scrollContent}>
      {/* My assignment card */}
      {assignment ? (
        <>
          <SectionHeader title="My Polling Station" />
          <View style={styles.assignmentDetailCard}>
            <View style={styles.assignmentDetailHeader}>
              <Text style={styles.assignmentDetailStation}>
                {assignment.pollingStation}
              </Text>
              <View
                style={[
                  styles.signedBadge,
                  { backgroundColor: assignment.candidateSigned ? '#d1fae5' : '#fef3c7' },
                ]}
              >
                <Text
                  style={[
                    styles.signedBadgeText,
                    { color: assignment.candidateSigned ? '#065f46' : '#92400e' },
                  ]}
                >
                  {assignment.candidateSigned ? 'Appointment Signed' : 'Awaiting Signature'}
                </Text>
              </View>
            </View>
            {assignment.pollingAddress && (
              <Text style={styles.assignmentDetailAddress}>
                {assignment.pollingAddress}
              </Text>
            )}
            <Text style={styles.assignmentDetailMunicipality}>
              {[assignment.municipality, assignment.ward ? `Ward ${assignment.ward}` : null, assignment.province]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            <Text style={styles.assignmentDetailDate}>
              Election: {new Date(assignment.electionDate).toLocaleDateString('en-CA', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </Text>
          </View>
        </>
      ) : (
        <View style={styles.noAssignmentCard}>
          <Shield size={32} color="#94a3b8" />
          <Text style={styles.noAssignmentTitle}>No Assignment</Text>
          <Text style={styles.noAssignmentSub}>
            Your campaign manager hasn't assigned you to a polling station yet.
          </Text>
        </View>
      )}

      {/* OCR Scanner */}
      <SectionHeader title="Results Scanner" />
      <View style={styles.scannerCard}>
        <Camera size={32} color={NAVY} />
        <Text style={styles.scannerTitle}>Scan Results Sheet</Text>
        <Text style={styles.scannerSub}>
          Point your camera at the official results printout. Claude Vision will read the vote counts automatically.
        </Text>
        <Pressable
          style={[styles.primaryBtn, { marginTop: 16, alignSelf: 'center' }]}
          onPress={() => setStep('camera')}
          accessibilityRole="button"
          accessibilityLabel="Open camera to scan results"
        >
          <Camera size={18} color="#ffffff" />
          <Text style={styles.primaryBtnText}>Open Camera</Text>
        </Pressable>
      </View>

      {/* Manual entry link */}
      <Pressable
        style={styles.manualLink}
        onPress={() => {
          const url = `${BASE_URL}/election-night`;
          require('react-native').Linking.openURL(url).catch(() => {});
        }}
        accessibilityRole="button"
      >
        <Edit3 size={14} color="#64748b" />
        <Text style={styles.manualLinkText}>Enter results manually in web app</Text>
        <ChevronRight size={14} color="#64748b" />
      </Pressable>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// ── Root screen ──────────────────────────────────────────────────────────────
// ---------------------------------------------------------------------------

export default function EdayScreen() {
  const { user } = useAuth();
  const campaignId = user?.activeCampaignId ?? '';
  const isCm = CM_ROLES.has(user?.role ?? '');

  if (!campaignId) {
    return (
      <SafeAreaView style={styles.centered} edges={['bottom']}>
        <Shield size={48} color="#cbd5e1" />
        <Text style={styles.emptyTitle}>No Active Campaign</Text>
        <Text style={styles.emptySub}>Select a campaign to access E-Day features.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {isCm ? (
        <CmEdayView campaignId={campaignId} />
      ) : (
        <ScrutineerEdayView campaignId={campaignId} />
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  fill: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
    backgroundColor: '#f8fafc',
  },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 8 },

  loadingText: { color: '#64748b', fontSize: 15, marginTop: 8 },

  // CM header
  cmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cmHeaderText: { flex: 1 },
  cmHeaderTitle: { fontSize: 17, fontWeight: '700', color: NAVY },
  cmHeaderSub: { fontSize: 13, color: '#64748b', marginTop: 2 },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 11, color: '#64748b', fontWeight: '600', marginTop: 2 },

  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 4,
  },

  // Assignment card (CM list)
  assignmentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  assignmentLeft: { flex: 1 },
  assignmentStation: { fontSize: 15, fontWeight: '600', color: NAVY },
  assignmentMunicipality: { fontSize: 12, color: '#64748b', marginTop: 2 },
  assignmentName: { fontSize: 12, color: '#94a3b8', marginTop: 1 },

  signedBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexShrink: 0,
  },
  signedBadgeText: { fontSize: 11, fontWeight: '700' },

  // Web link
  webLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  webLinkText: { fontSize: 14, fontWeight: '600', color: NAVY },

  // Error / warning
  errorBanner: {
    backgroundColor: '#fef3c7',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  errorText: { fontSize: 13, color: '#92400e' },
  warningRow: {
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    padding: 10,
  },
  warningText: { fontSize: 13, color: '#92400e' },

  // Empty states
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 32,
    gap: 10,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#334155' },
  emptySub: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20 },

  // Camera
  cameraOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  cameraGuide: {
    width: 280,
    height: 380,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: 8,
  },
  cameraHint: {
    color: '#ffffff',
    fontSize: 13,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  cameraControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingBottom: 40,
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  cancelCameraBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffffff',
  },

  // Scanning
  scanningPreview: {
    width: 200,
    height: 150,
    borderRadius: 10,
    opacity: 0.6,
  },
  scanningText: { fontSize: 17, fontWeight: '600', color: NAVY, marginTop: 8 },
  scanningHint: { fontSize: 13, color: '#64748b' },

  // Confidence banner
  confidenceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 4,
  },
  confidenceText: { fontSize: 13, fontWeight: '700' },

  // Info card
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
  },
  infoValue: { fontSize: 16, fontWeight: '700', color: NAVY },
  infoSub: { fontSize: 13, color: '#64748b', marginTop: 3 },

  // Candidate rows
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  candidateLeft: { flex: 1 },
  candidateName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 2,
  },
  candidateParty: { fontSize: 12, color: '#64748b', marginTop: 3 },
  candidateVotes: {
    width: 80,
    fontSize: 18,
    fontWeight: '800',
    color: NAVY,
    textAlign: 'right',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 2,
  },

  // Review actions
  reviewActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    paddingTop: 8,
  },

  // Assignment detail (scrutineer)
  assignmentDetailCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    gap: 4,
  },
  assignmentDetailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  assignmentDetailStation: { fontSize: 17, fontWeight: '700', color: NAVY, flex: 1 },
  assignmentDetailAddress: { fontSize: 13, color: '#475569' },
  assignmentDetailMunicipality: { fontSize: 13, color: '#64748b' },
  assignmentDetailDate: { fontSize: 12, color: '#94a3b8', marginTop: 4 },

  // No assignment
  noAssignmentCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 24,
    gap: 8,
  },
  noAssignmentTitle: { fontSize: 16, fontWeight: '700', color: '#334155' },
  noAssignmentSub: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 18 },

  // Scanner card
  scannerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  scannerTitle: { fontSize: 17, fontWeight: '700', color: NAVY },
  scannerSub: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19 },

  // Manual link
  manualLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  manualLinkText: { fontSize: 13, color: '#64748b' },

  // Buttons
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: NAVY,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    minHeight: 52,
  },
  primaryBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  outlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 14,
    minHeight: 52,
    backgroundColor: '#ffffff',
  },
  outlineBtnText: { color: NAVY, fontSize: 15, fontWeight: '600' },

  // Permissions
  permTitle: { fontSize: 18, fontWeight: '700', color: '#334155', textAlign: 'center' },
  permSub: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20 },

  // Success
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  successTitle: { fontSize: 22, fontWeight: '800', color: NAVY },
  successSub: { fontSize: 15, color: '#64748b' },
});
