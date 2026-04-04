/**
 * @poll-city/events
 *
 * Internal event type definitions for the consent bridge and platform events.
 *
 * CURRENT STATE: Type definitions only. No runtime event bus implemented.
 * Phase 1: Events are handled synchronously within route handlers.
 * Phase 2: Replace with a real event bus (Redis pub/sub, Inngest, or similar).
 *
 * These types define the contract between products.
 * The consent bridge MUST emit a CONSENT_SIGNAL_RECEIVED event when it writes to CRM.
 * Admin MUST listen for this event to trigger follow-up workflows.
 */

import type { BridgeSignalType, UserId, CampaignId, ContactId, OfficialId, PollId } from "@poll-city/types";

// ── Platform event union ───────────────────────────────────────────────────

export type PlatformEvent =
  | ConsentSignalReceived
  | ContactCreated
  | ContactUpdated
  | PollPublished
  | PollVoteCast
  | GotvVoterConfirmed
  | SignInstalled
  | SignRemoved
  | OfficialQuestionAnswered;

// ── Consent bridge events ──────────────────────────────────────────────────

/**
 * Emitted when a consent-gated signal from Social is written to the campaign CRM.
 * This is the primary event for the Social → Admin data flow.
 * Source: POST /api/social/signal handler
 * Listener: Admin CRM workflow — notify staff, trigger follow-up task
 */
export interface ConsentSignalReceived {
  type: "CONSENT_SIGNAL_RECEIVED";
  payload: {
    userId: UserId;               // Social user who consented
    campaignId: CampaignId;
    signalType: BridgeSignalType;
    contactId: ContactId;         // CRM record created or updated
    auditId: string;              // ActivityLog.id — traceability
    fieldsTransferred: string[];
    consentScope: string;
    timestamp: string;            // ISO 8601
  };
}

// ── CRM events ─────────────────────────────────────────────────────────────

export interface ContactCreated {
  type: "CONTACT_CREATED";
  payload: {
    contactId: ContactId;
    campaignId: CampaignId;
    source: string;               // "import" | "manual" | "social_consent_bridge" | "quick_capture"
    createdByUserId: UserId;
  };
}

export interface ContactUpdated {
  type: "CONTACT_UPDATED";
  payload: {
    contactId: ContactId;
    campaignId: CampaignId;
    changedFields: string[];
    updatedByUserId: UserId;
  };
}

// ── Publishing events ──────────────────────────────────────────────────────

/**
 * Emitted when a poll is made public.
 * Source: Admin — Campaign Manager sets visibility = "public"
 * Listener: Social — invalidate poll list cache (Phase 2)
 */
export interface PollPublished {
  type: "POLL_PUBLISHED";
  payload: {
    pollId: PollId;
    campaignId: CampaignId | null;  // null for platform polls
    publishedByUserId: UserId;
    visibility: "public" | "unlisted";
    timestamp: string;
  };
}

/**
 * Emitted when a vote is cast.
 * For analytics only — payload contains NO individual user identity.
 */
export interface PollVoteCast {
  type: "POLL_VOTE_CAST";
  payload: {
    pollId: PollId;
    pollType: string;
    isAuthenticated: boolean;     // true if userId was set, false if anonymous
    postalCode: string | null;
    ward: string | null;
    riding: string | null;
    timestamp: string;
  };
  // NEVER includes: userId, ipHash, individual vote value
}

// ── GOTV events ────────────────────────────────────────────────────────────

export interface GotvVoterConfirmed {
  type: "GOTV_VOTER_CONFIRMED";
  payload: {
    contactId: ContactId;
    campaignId: CampaignId;
    batchId: string;              // GotvBatch.id
    matchScore: number;           // fuzzy match confidence 0-100
    timestamp: string;
  };
}

// ── Print / Sign events ────────────────────────────────────────────────────

export interface SignInstalled {
  type: "SIGN_INSTALLED";
  payload: {
    signId: string;
    campaignId: CampaignId;
    installedByUserId: UserId;
    lat: number | null;
    lng: number | null;
    timestamp: string;
  };
}

export interface SignRemoved {
  type: "SIGN_REMOVED";
  payload: {
    signId: string;
    campaignId: CampaignId;
    removedByUserId: UserId;
    timestamp: string;
  };
}

// ── Civic directory events ─────────────────────────────────────────────────

export interface OfficialQuestionAnswered {
  type: "OFFICIAL_QUESTION_ANSWERED";
  payload: {
    questionId: string;
    officialId: OfficialId;
    answeredAt: string;
    isPublic: boolean;
  };
}

// ── Event bus interface ────────────────────────────────────────────────────
// Phase 1: Implement with a no-op or synchronous handler.
// Phase 2: Replace with Redis pub/sub, Inngest, or similar.

export interface EventBus {
  emit(event: PlatformEvent): Promise<void>;
  on<T extends PlatformEvent["type"]>(
    eventType: T,
    handler: (event: Extract<PlatformEvent, { type: T }>) => Promise<void>
  ): void;
}

/**
 * Phase 1 stub implementation — synchronous, no persistence.
 * Replace with a real implementation before Phase 2.
 */
export class SynchronousEventBus implements EventBus {
  private handlers: Map<string, ((event: PlatformEvent) => Promise<void>)[]> = new Map();

  async emit(event: PlatformEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) ?? [];
    for (const handler of handlers) {
      await handler(event);
    }
  }

  on<T extends PlatformEvent["type"]>(
    eventType: T,
    handler: (event: Extract<PlatformEvent, { type: T }>) => Promise<void>
  ): void {
    const existing = this.handlers.get(eventType) ?? [];
    existing.push(handler as (event: PlatformEvent) => Promise<void>);
    this.handlers.set(eventType, existing);
  }
}
