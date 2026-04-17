/**
 * TOTP (RFC 6238) implementation using Node.js crypto.
 * No external library required.
 */
import { createHmac, randomBytes } from "crypto";

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buf: Buffer): string {
  let output = "";
  let bits = 0;
  let value = 0;
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_CHARS[(value << (5 - bits)) & 31];
  return output;
}

function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/=+$/, "").replace(/\s/g, "");
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const char of clean) {
    const idx = BASE32_CHARS.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function hotpToken(keyBuf: Buffer, counter: bigint): string {
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(counter);
  const hmac = createHmac("sha1", keyBuf);
  hmac.update(counterBuf);
  const hash = hmac.digest();
  const offset = hash[hash.length - 1] & 0x0f;
  const code =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);
  return (code % 1_000_000).toString().padStart(6, "0");
}

/** Generate a new random TOTP secret (base32-encoded, 20 bytes). */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

/** Build an otpauth:// URI for QR-code generation. */
export function totpUri(secret: string, accountName: string, issuer = "Poll City"): string {
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?${params}`;
}

/**
 * Verify a 6-digit TOTP token.
 * Accepts ±1 time step (30 s window on each side) to allow clock drift.
 */
export function verifyTotp(secret: string, token: string, windowSize = 1): boolean {
  if (!/^\d{6}$/.test(token)) return false;
  const keyBuf = base32Decode(secret);
  const counter = BigInt(Math.floor(Date.now() / 1000 / 30));
  for (let i = -windowSize; i <= windowSize; i++) {
    if (hotpToken(keyBuf, counter + BigInt(i)) === token) return true;
  }
  return false;
}

/** Generate n cryptographically random backup codes (e.g. "abc12-def34"). */
export function generateBackupCodes(n = 10): string[] {
  return Array.from({ length: n }, () => {
    const buf = randomBytes(5);
    const hex = buf.toString("hex"); // 10 hex chars
    return `${hex.slice(0, 5)}-${hex.slice(5)}`;
  });
}
