/**
 * tracking-token.ts
 *
 * Encode / decode opaque tokens for email open and click tracking.
 * Tokens are base64url-encoded JSON — the IDs are CUIDs (unguessable)
 * so no HMAC secret is required for tracking purposes.
 *
 * Open token:  { t: "o", c: campaignId, b: blastId, co: contactId }
 * Click token: { t: "k", c: campaignId, b: blastId, co: contactId, u: url }
 */

export interface OpenTokenPayload {
  t: "o";
  c: string; // campaignId
  b: string; // notificationLogId (blastId)
  co: string; // contactId
}

export interface ClickTokenPayload {
  t: "k";
  c: string; // campaignId
  b: string; // notificationLogId (blastId)
  co: string; // contactId
  u: string; // destination URL
}

export type TrackingTokenPayload = OpenTokenPayload | ClickTokenPayload;

export function encodeTrackingToken(payload: TrackingTokenPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodeTrackingToken(token: string): TrackingTokenPayload | null {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("t" in parsed) ||
      !("c" in parsed) ||
      !("b" in parsed) ||
      !("co" in parsed)
    ) {
      return null;
    }
    return parsed as TrackingTokenPayload;
  } catch {
    return null;
  }
}
