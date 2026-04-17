import type {
  QrCode,
  QrScan,
  QrProspect,
  QrSignOpportunity,
  QrFollowUp,
  QrCodeType,
  QrPlacementType,
  QrFunnelType,
  QrIntent,
  QrConversionStage,
  QrProspectType,
  QrProspectStatus,
  QrFollowUpType,
  QrFollowUpStatus,
} from "@prisma/client";

export type {
  QrCode,
  QrScan,
  QrProspect,
  QrSignOpportunity,
  QrFollowUp,
  QrCodeType,
  QrPlacementType,
  QrFunnelType,
  QrIntent,
  QrConversionStage,
  QrProspectType,
  QrProspectStatus,
  QrFollowUpType,
  QrFollowUpStatus,
};

// ── Landing config stored in QrCode.landingConfig JSON ───────────────────────

export interface QrLandingConfig {
  headline?: string;
  subheadline?: string;
  introText?: string;
  issuePrompt?: string;
  thankYouText?: string;
  ctaLabels?: Partial<Record<QrIntent, string>>;
  enabledIntents?: QrIntent[];
  collectFields?: Array<"name" | "email" | "phone" | "postal" | "address" | "note">;
  showCandidatePhoto?: boolean;
}

// ── Campaign context returned to the landing page ─────────────────────────

export interface QrLandingContext {
  qrCode: {
    id: string;
    token: string;
    type: QrCodeType;
    funnelType: QrFunnelType;
    locationName: string | null;
    locationAddress: string | null;
    landingConfig: QrLandingConfig;
    status: string;
    teaserMode: boolean;
  };
  campaign: {
    id: string;
    name: string;
    candidateName: string | null;
    candidateTitle: string | null;
    primaryColor: string;
    secondaryColor: string | null;
    logoUrl: string | null;
    tagline: string | null;
    jurisdiction: string | null;
    websiteUrl: string | null;
  } | null;
  // Generic Poll City branding when no campaign
  platformBranding: {
    name: string;
    logoUrl: string;
    primaryColor: string;
  };
}

// ── Scan record returned from public APIs ─────────────────────────────────

export interface QrScanResult {
  scanId: string;
  isRepeat: boolean;
  conversionStage: QrConversionStage;
  prospectId: string | null;
}

// ── Analytics shapes ──────────────────────────────────────────────────────

export interface QrAnalyticsOverview {
  totalScans: number;
  uniqueScans: number;
  conversions: number;
  conversionRate: number;
  signRequests: number;
  volunteerLeads: number;
  updateSubscribers: number;
  scansByDay: Array<{ date: string; count: number }>;
  scansByPlacement: Array<{ placement: string; count: number }>;
  scansByIntent: Array<{ intent: string; count: number }>;
  topQrCodes: Array<{ qrCodeId: string; label: string; scans: number; conversions: number }>;
}

// ── Prospect/opportunity list item ────────────────────────────────────────

export interface QrProspectSummary {
  id: string;
  qrCodeId: string;
  qrLabel: string | null;
  prospectType: QrProspectType;
  status: QrProspectStatus;
  intent: QrIntent | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  signRequested: boolean;
  volunteerInterest: boolean;
  score: number;
  isLocked: boolean;
  locationCluster: string | null;
  createdAt: string;
}

// ── Teaser stats for unsubscribed campaigns ───────────────────────────────

export interface QrTeaserStats {
  totalProspects: number;
  signRequests: number;
  volunteerLeads: number;
  updateSubscribers: number;
  locationClusters: number;
  oldestProspectDays: number;
}
