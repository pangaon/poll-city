/**
 * Standardized API error system for Poll City.
 * Every API route should use these instead of ad-hoc error responses.
 */

import { NextResponse } from "next/server";

export type ErrorCode =
  | "AUTH_001"      // Not authenticated
  | "AUTH_002"      // Not authorized (wrong role/permission)
  | "AUTH_003"      // Session expired
  | "AUTH_004"      // Account suspended
  | "CAMPAIGN_001"  // No active campaign
  | "CAMPAIGN_002"  // Campaign not found
  | "CAMPAIGN_003"  // Not a member of this campaign
  | "VALIDATION_001" // Request body validation failed
  | "VALIDATION_002" // Missing required field
  | "VALIDATION_003" // Invalid format
  | "NOT_FOUND_001" // Resource not found
  | "RATE_LIMIT_001" // Too many requests
  | "CONFLICT_001"  // Duplicate resource
  | "PERMISSION_001" // Feature not available on current tier
  | "PAYMENT_001"   // Payment required
  | "INTERNAL_001"  // Unexpected server error
  | "EXTERNAL_001"; // External service failure (Twilio, Stripe, etc.)

interface ApiError {
  error: string;
  code: ErrorCode;
  details?: unknown;
}

function respond(status: number, body: ApiError): NextResponse {
  return NextResponse.json(body, { status });
}

// ─── Auth errors ────────────────────────────────────────────────────────────

export const unauthorized = () =>
  respond(401, { error: "Authentication required. Please sign in.", code: "AUTH_001" });

export const forbidden = (permission?: string) =>
  respond(403, {
    error: "You do not have permission to perform this action.",
    code: "AUTH_002",
    ...(permission ? { details: { requiredPermission: permission } } : {}),
  });

export const sessionExpired = () =>
  respond(401, { error: "Your session has expired. Please sign in again.", code: "AUTH_003" });

export const accountSuspended = () =>
  respond(403, { error: "Your account has been suspended. Contact your campaign administrator.", code: "AUTH_004" });

// ─── Campaign errors ────────────────────────────────────────────────────────

export const noActiveCampaign = () =>
  respond(400, { error: "No active campaign selected. Please select a campaign first.", code: "CAMPAIGN_001" });

export const campaignNotFound = () =>
  respond(404, { error: "Campaign not found.", code: "CAMPAIGN_002" });

export const notCampaignMember = () =>
  respond(403, { error: "You are not a member of this campaign.", code: "CAMPAIGN_003" });

// ─── Validation errors ──────────────────────────────────────────────────────

export const validationFailed = (details?: unknown) =>
  respond(422, { error: "Validation failed. Please check your input.", code: "VALIDATION_001", details });

export const missingField = (field: string) =>
  respond(400, { error: `${field} is required.`, code: "VALIDATION_002", details: { field } });

export const invalidFormat = (field: string, expected: string) =>
  respond(400, { error: `Invalid format for ${field}. Expected: ${expected}`, code: "VALIDATION_003", details: { field, expected } });

// ─── Resource errors ────────────────────────────────────────────────────────

export const notFound = (resource: string) =>
  respond(404, { error: `${resource} not found.`, code: "NOT_FOUND_001" });

export const conflict = (message: string) =>
  respond(409, { error: message, code: "CONFLICT_001" });

// ─── Rate limiting ──────────────────────────────────────────────────────────

export const rateLimited = () =>
  respond(429, { error: "Too many requests. Please wait a moment and try again.", code: "RATE_LIMIT_001" });

// ─── Tier/payment ───────────────────────────────────────────────────────────

export const featureNotAvailable = (feature: string, requiredTier: string) =>
  respond(403, {
    error: `${feature} requires the ${requiredTier} plan. Upgrade at /billing to unlock this feature.`,
    code: "PERMISSION_001",
    details: { feature, requiredTier },
  });

export const paymentRequired = (reason: string) =>
  respond(402, { error: reason, code: "PAYMENT_001" });

// ─── Server errors ──────────────────────────────────────────────────────────

export const internalError = (message?: string) =>
  respond(500, { error: message ?? "Something went wrong. Please try again.", code: "INTERNAL_001" });

export const externalServiceError = (service: string) =>
  respond(502, { error: `${service} is temporarily unavailable. Please try again later.`, code: "EXTERNAL_001", details: { service } });
