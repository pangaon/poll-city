import prisma from "@/lib/db/prisma";

// URL-safe slug alphabet — avoids ambiguous chars (0/O, 1/I/l)
const SLUG_CHARS = "23456789abcdefghjkmnpqrstuvwxyz";

function randomSlug(length = 8): string {
  let s = "";
  const array = new Uint8Array(length);
  // In Node.js we use crypto.getRandomValues equivalent
  for (let i = 0; i < length; i++) {
    s += SLUG_CHARS[Math.floor(Math.random() * SLUG_CHARS.length)];
  }
  return s;
}

/**
 * Generate a unique short slug for a QR code.
 * Retries up to 5 times on collision.
 */
export async function generateQrSlug(prefix?: string): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const slug = prefix ? `${prefix}-${randomSlug()}` : randomSlug();
    const existing = await prisma.qrCode.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) return slug;
  }
  return `${prefix ?? "qr"}-${randomSlug()}${randomSlug()}`;
}

/**
 * Build the full public URL for a QR code scan.
 */
export function buildQrUrl(token: string, baseUrl?: string): string {
  const base = baseUrl ?? process.env.NEXTAUTH_URL ?? "https://app.poll.city";
  return `${base}/q/${token}`;
}

/**
 * Build a QR code image URL via a free QR generation API.
 * Returns a URL that can be embedded as <img src=...> or downloaded.
 */
export function buildQrImageUrl(token: string, size = 300, baseUrl?: string): string {
  const scanUrl = encodeURIComponent(buildQrUrl(token, baseUrl));
  // Uses goqr.me free API — no API key required, suitable for dev/staging
  // For production, replace with a self-hosted or paid QR generator
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${scanUrl}&format=png&margin=2`;
}
