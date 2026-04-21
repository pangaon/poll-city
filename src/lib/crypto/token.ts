import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  scryptSync,
} from "crypto";

const ENC_PREFIX = "enc:";

function deriveKey(): Buffer {
  const secret =
    process.env.DATABASE_ENCRYPTION_KEY ??
    process.env.NEXTAUTH_SECRET ??
    "dev-fallback-key-not-for-production";
  return scryptSync(secret, "poll-city-social-token-salt", 32);
}

export function encryptToken(value: string): string {
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${ENC_PREFIX}${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptToken(value: string): string {
  if (!value.startsWith(ENC_PREFIX)) return value;
  const key = deriveKey();
  const parts = value.slice(ENC_PREFIX.length).split(":");
  if (parts.length !== 3) return value;
  const [ivHex, authTagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/** Sign arbitrary state data for OAuth flows. Returns a base64url payload.sig string. */
export function signOAuthState(data: Record<string, unknown>): string {
  const payload = Buffer.from(JSON.stringify({ ...data, ts: Date.now() })).toString("base64url");
  const secret = process.env.NEXTAUTH_SECRET ?? "dev-fallback-key-not-for-production";
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

/** Verify and parse OAuth state. Returns null if invalid or expired (>10 min). */
export function verifyOAuthState(state: string): Record<string, unknown> | null {
  const dotIndex = state.lastIndexOf(".");
  if (dotIndex === -1) return null;
  const payload = state.slice(0, dotIndex);
  const sig = state.slice(dotIndex + 1);
  const secret = process.env.NEXTAUTH_SECRET ?? "dev-fallback-key-not-for-production";
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  if (expected !== sig) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;
    if (typeof parsed.ts === "number" && Date.now() - parsed.ts > 10 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}
