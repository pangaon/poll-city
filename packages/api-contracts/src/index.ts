/**
 * @poll-city/api-contracts
 *
 * DTO (Data Transfer Object) definitions and naming rules.
 *
 * NAMING CONVENTION:
 *   PublicDTO  — safe to return to any caller including Social and anonymous users
 *   PrivateDTO — campaign-scoped, only returned by routes with auth + membership verification
 *   BridgeDTO  — consent-gated Social → Admin signal types
 *
 * RULE: No PrivateDTO field ever appears in a PublicDTO.
 * RULE: No BridgeDTO carries more fields than the user explicitly submitted.
 * RULE: campaignId never appears in a PublicDTO response body.
 *
 * These types are the source of truth for what crosses product boundaries.
 * The API route layer must enforce that only PublicDTOs are returned from public routes.
 */

// ── Data class marker types ────────────────────────────────────────────────
// These are phantom types used to make data class membership explicit at the
// TypeScript level. They do not exist at runtime.

declare const _publicBrand: unique symbol;
declare const _privateBrand: unique symbol;
declare const _bridgeBrand: unique symbol;

export type PublicData<T> = T & { readonly [_publicBrand]: true };
export type PrivateData<T> = T & { readonly [_privateBrand]: true };
export type BridgeData<T> = T & { readonly [_bridgeBrand]: true };

// ── Public DTOs ────────────────────────────────────────────────────────────
// Returned by: /api/officials, /api/polls, /api/geo, /api/officials/[id]/questions
// Safe for: Social app, anonymous users, public API consumers

export interface OfficialPublicDTO {
  id: string;
  name: string;
  title: string;
  district: string;
  level: string;
  party: string | null;
  bio: string | null;
  email: string | null;       // office contact — not personal email
  phone: string | null;       // office contact
  website: string | null;
  photoUrl: string | null;
  subscriptionStatus: string | null;
  isActive: boolean;
  _count: {
    follows: number;
    questions?: number;
  };
}
// NEVER included: postalCodes[], claimedByUserId, claimedAt, termStart, termEnd

export interface PollPublicDTO {
  id: string;
  question: string;
  description: string | null;
  type: string;
  visibility: "public" | "unlisted"; // "campaign_only" is NEVER in a PublicDTO
  targetRegion: string | null;
  totalResponses: number;
  isActive: boolean;
  isFeatured: boolean;
  startsAt: string;
  endsAt: string | null;
  options: PollOptionPublicDTO[];
}
// NEVER included: campaignId, createdByUserId

export interface PollOptionPublicDTO {
  id: string;
  text: string;
  order: number;
}

// Poll results — aggregate only. Individual votes NEVER returned.
export type PollResultDTO =
  | { type: "binary";          poll: PollPublicDTO; results: { value: string; _count: number }[] }
  | { type: "multiple_choice"; poll: PollPublicDTO; results: (PollOptionPublicDTO & { count: number })[] }
  | { type: "ranked";          poll: PollPublicDTO; results: (PollOptionPublicDTO & { count: number; avgRank: number | null })[] }
  | { type: "slider";          poll: PollPublicDTO; results: { average: number | null; count: number } }
  | { type: "swipe" | "image_swipe"; poll: PollPublicDTO; results: (PollOptionPublicDTO & { breakdown: { value: string; _count: number }[] })[] };

export interface PublicQuestionDTO {
  id: string;
  question: string;
  answer: string | null;
  answeredAt: string | null;
  isPublic: boolean;
  upvotes: number;
  createdAt: string;
}
// NEVER included: userId (voter identity never exposed)

export interface GeoDistrictDTO {
  postalPrefix: string;
  ward: string | null;
  wardCode: string | null;
  riding: string | null;
  ridingCode: string | null;
  province: string | null;
  city: string | null;
  level: string;
}

// ── Private DTOs ───────────────────────────────────────────────────────────
// Returned by: /api/contacts, /api/tasks, /api/campaign-fields, etc.
// Requires: apiAuth() + membership.findUnique() on the handler
// NEVER returned by Social routes or public routes.

export interface ContactPrivateDTO {
  id: string;
  campaignId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address1: string | null;
  city: string | null;
  postalCode: string | null;
  ward: string | null;
  riding: string | null;
  supportLevel: string;
  gotvStatus: string;
  followUpNeeded: boolean;
  followUpDate: string | null;
  notHome: boolean;
  doNotContact: boolean;
  signRequested: boolean;
  volunteerInterest: boolean;
  notes: string | null;
  issues: string[];
  // Full contact has 60+ fields — this lists the most commonly used
}

export interface CampaignPrivateDTO {
  id: string;
  name: string;
  electionType: string;
  jurisdiction: string | null;
  electionDate: string | null;
  candidateName: string | null;
  primaryColor: string;
}

// ── Bridge DTOs ────────────────────────────────────────────────────────────
// Social → API → CRM channel.
// userId taken from session — NEVER from request body (prevents impersonation).
// Only user-submitted fields included. No Social profile data copied automatically.

export type BridgeSignalType =
  | "support"
  | "oppose"
  | "neutral"
  | "volunteer_optin"
  | "sign_request"
  | "contact_permission"
  | "update_optin";

export interface BridgeSignalDTO {
  signalType: BridgeSignalType;
  campaignId: string;
  officialId?: string;
  userProvided?: {
    firstName?: string;       // only if user typed it
    phone?: string;           // only if user typed it
    address?: string;         // only if user typed it
    signType?: string;
    notificationType?: string;
    permissionScope?: "call" | "email" | "text";
  };
  postalCode?: string;
}
// userId is taken from session on the server — never from this DTO

export interface BridgeResultDTO {
  recorded: boolean;
  consentId: string;
  message: string;
}

// ── Standard API response envelope ────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
}

export interface ApiListResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  error: string;
  details?: Record<string, unknown>;
}

// ── HTTP status code reference ─────────────────────────────────────────────
// 200: success
// 201: created
// 400: bad request
// 401: unauthenticated
// 403: forbidden
// 404: not found
// 409: conflict (duplicate vote, duplicate key)
// 410: gone (poll ended)
// 413: payload too large
// 422: validation failed
// 500: unhandled server error
