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
// Field Operations Engine
// ---------------------------------------------------------------------------

export type AssignmentType = "canvass" | "lit_drop" | "sign_install" | "sign_remove";

export type AssignmentStatus =
  | "draft"
  | "published"
  | "assigned"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "reassigned";

export type StopStatus =
  | "pending"
  | "completed"
  | "skipped"
  | "exception"
  | "not_home"
  | "no_access";

export type ExceptionType =
  | "aggressive_resident"
  | "no_access"
  | "gated_property"
  | "wrong_address"
  | "sign_already_removed"
  | "sign_damaged"
  | "sign_missing"
  | "weather"
  | "other";

// Type-specific outcome shapes — compose into UpdateStopPayload.outcome
export interface CanvassOutcome {
  supportLevel?: SupportLevel;
  interactionNotes?: string;
  doNotContact?: boolean;
}

export interface LitDropOutcome {
  delivered: boolean;
  quantity?: number;
}

export interface SignInstallOutcome {
  photoUrl?: string;
  notes?: string;
}

export interface SignRemoveOutcome {
  photoUrl?: string;
  condition?: "good" | "damaged" | "missing";
  notes?: string;
}

export type StopOutcome =
  | CanvassOutcome
  | LitDropOutcome
  | SignInstallOutcome
  | SignRemoveOutcome;

export interface AssignmentContactSummary {
  id: string;
  firstName: string;
  lastName: string;
  address1: string | null;
  city: string | null;
  postalCode: string | null;
  phone: string | null;
  supportLevel: SupportLevel;
  doNotContact: boolean;
  notes: string | null;
}

export interface AssignmentHouseholdSummary {
  id: string;
  address1: string;
  city: string | null;
  postalCode: string | null;
  lat: number | null;
  lng: number | null;
  totalVoters: number | null;
}

export interface AssignmentSignSummary {
  id: string;
  address1: string;
  city: string | null;
  postalCode: string | null;
  status: string;
  lat: number | null;
  lng: number | null;
  signType: string;
  quantity: number;
}

export interface AssignmentStop {
  id: string;
  assignmentId: string;
  contactId: string | null;
  householdId: string | null;
  signId: string | null;
  order: number;
  status: StopStatus;
  outcome: StopOutcome | null;
  exceptionType: ExceptionType | null;
  exceptionNotes: string | null;
  completedAt: string | null;
  completedById: string | null;
  notes: string | null;
  createdAt: string;
  contact: AssignmentContactSummary | null;
  household: AssignmentHouseholdSummary | null;
  sign: AssignmentSignSummary | null;
}

export interface AssignmentResourcePackage {
  id: string;
  assignmentId: string;
  scriptPackageId: string | null;
  literaturePackageId: string | null;
  plannedLiteratureQty: number | null;
  actualLiteratureQty: number | null;
  signInventoryItemId: string | null;
  signsAllocated: number | null;
  signsInstalled: number | null;
  signsRecovered: number | null;
}

export interface FieldAssignment {
  id: string;
  campaignId: string;
  assignmentType: AssignmentType;
  name: string;
  description: string | null;
  status: AssignmentStatus;
  fieldUnitId: string | null;
  assignedUserId: string | null;
  assignedVolunteerId: string | null;
  assignedGroupId: string | null;
  scheduledDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  printPacketUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  fieldUnit: { id: string; name: string; ward: string | null } | null;
  resourcePackage: AssignmentResourcePackage | null;
  stops: AssignmentStop[];
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

// ---------------------------------------------------------------------------
// Canvasser App V1 — Mission / Stop / Adoni / Sync
// ---------------------------------------------------------------------------

export interface CanvasserMission {
  id: string;
  name: string;
  type: "canvass";
  status: string;
  totalDoors: number;
  doorsKnocked: number;
  completionPercent: number;
  ward: string | null;
  streets: string[];
  estimatedMinutes: number | null;
  notes: string | null;
  assignedToMe: boolean;
}

export interface CanvasserMissionDetail extends CanvasserMission {
  totalStops: number;
  visitedStops: number;
  pendingStops: number;
}

export interface CanvasserStopContact {
  id: string;
  firstName: string;
  lastName: string;
  address1: string | null;
  address2: string | null;
  city: string | null;
  postalCode: string | null;
  phone: string | null;
  supportLevel: SupportLevel;
  notes: string | null;
  doNotContact: boolean;
  signRequested: boolean;
  volunteerInterest: boolean;
}

export interface CanvasserCurrentStop {
  stopId: string;
  order: number;
  contact: CanvasserStopContact;
}

export type AdoniActionType =
  | "set_support_level"
  | "request_sign"
  | "flag_volunteer"
  | "flag_follow_up"
  | "add_note"
  | "mark_do_not_contact"
  | "skip_stop";

export interface AdoniParsedAction {
  type: AdoniActionType;
  confidence: "high" | "medium" | "low";
  params: Record<string, unknown>;
  displayText: string;
}

export interface CanvasserSyncStatus {
  date: string;
  doorsKnocked: number;
  supportersFound: number;
  signRequests: number;
  volunteerLeads: number;
  conversionRate: number;
}
