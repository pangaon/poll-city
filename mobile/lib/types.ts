/**
 * Shared TypeScript types for the Poll City Canvasser mobile app.
 *
 * These mirror the Prisma models on the server but are decoupled so the
 * mobile app has no dependency on prisma/client.
 */

// ---------------------------------------------------------------------------
// Enums (match Prisma schema exactly)
// ---------------------------------------------------------------------------

export type SupportLevel =
  | "strong_support"
  | "leaning_support"
  | "undecided"
  | "leaning_opposition"
  | "strong_opposition"
  | "unknown";

export type InteractionType =
  | "door_knock"
  | "phone_call"
  | "text"
  | "email"
  | "event"
  | "note"
  | "follow_up"
  | "field_encounter";

export type InteractionSource =
  | "canvass"
  | "internal_phone"
  | "call_center"
  | "event"
  | "social"
  | "self"
  | "simulation";

// ---------------------------------------------------------------------------
// Domain models
// ---------------------------------------------------------------------------

export interface Contact {
  id: string;
  campaignId: string;
  householdId: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  ward: string | null;
  riding: string | null;
  supportLevel: SupportLevel;
  notes: string | null;
  doNotContact: boolean;
  signRequested: boolean;
  volunteerInterest: boolean;
  followUpNeeded: boolean;
  followUpDate: string | null;
  lastContactedAt: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface Interaction {
  id: string;
  contactId: string;
  userId: string;
  type: InteractionType;
  notes: string | null;
  supportLevel: SupportLevel | null;
  issues: string[];
  signRequested: boolean;
  volunteerInterest: boolean;
  followUpNeeded: boolean;
  followUpDate: string | null;
  doorNumber: string | null;
  duration: number | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
}

export interface WalkListContact extends Contact {
  /** Sequence number within the walk list (1-based). */
  sequence: number;
  /** Whether this door has already been visited this shift. */
  visited: boolean;
  /** Last interaction recorded, if any. */
  lastInteraction: Interaction | null;
}

export interface WalkList {
  id: string;
  campaignId: string;
  name: string;
  contacts: WalkListContact[];
  totalDoors: number;
  doorsVisited: number;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Interaction form payload (what we POST to /api/interactions)
// ---------------------------------------------------------------------------

export interface CreateInteractionPayload {
  contactId: string;
  type: InteractionType;
  notes?: string;
  supportLevel?: SupportLevel;
  issues?: string[];
  signRequested?: boolean;
  volunteerInterest?: boolean;
  followUpNeeded?: boolean;
  followUpDate?: string;
  doorNumber?: string;
  duration?: number;
  latitude?: number;
  longitude?: number;
  // Confidence scoring fields (wired 2026-04-09)
  source?: InteractionSource;
  isProxy?: boolean;
  opponentSign?: boolean;
}

// ---------------------------------------------------------------------------
// E-Day / Scrutineer
// ---------------------------------------------------------------------------

export interface ScrutineerAssignment {
  id: string;
  campaignId: string;
  userId: string;
  pollingStation: string;
  pollingAddress: string | null;
  municipality: string;
  ward: string | null;
  province: string;
  electionDate: string;
  candidateSigned: boolean;
  signedAt: string | null;
  notes: string | null;
}

export interface OcrCandidate {
  name: string;
  party: string | null;
  votes: number;
}

export interface OcrResult {
  pollingStation: string | null;
  municipality: string | null;
  ward: string | null;
  province: string | null;
  office: string | null;
  percentReporting: number;
  candidates: OcrCandidate[];
  totalVotes: number | null;
  rejectedBallots: number | null;
  confidence: "high" | "medium" | "low";
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Sync queue
// ---------------------------------------------------------------------------

export type SyncStatus = "pending" | "syncing" | "synced" | "failed";

export interface PendingMutation {
  id: string;
  endpoint: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  payload: string; // JSON-serialised body
  createdAt: string;
  retryCount: number;
  status: SyncStatus;
  errorMessage?: string;
}

// ---------------------------------------------------------------------------
// API responses
// ---------------------------------------------------------------------------

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface ShiftSummary {
  shift: {
    doors: number;
    supportersFound: number;
    conversionRate: number;
    minutesOnShift: number;
    doorsPerHour: number;
  };
  allTime: {
    totalDoors: number;
    rank: number;
    totalVolunteers: number;
    avgDoorsPerVolunteer: number;
    aboveAverage: boolean;
  };
  message: string;
  emoji: string;
  milestones: string[];
  volunteerName: string;
}

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

export interface Campaign {
  id: string;
  name: string;
  candidateName: string;
  electionDate: string | null;
  municipality: string | null;
  province: string | null;
  status: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // unix ms
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  activeCampaignId: string | null;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}
