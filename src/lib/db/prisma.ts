import { PrismaClient } from "@prisma/client";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Append connection_limit to the DATABASE_URL so each serverless container
 * holds at most 3 Postgres connections. Without this, Vercel's concurrent
 * lambdas exhaust Railway's ~100-connection limit.
 */
function buildDatabaseUrl(): string {
  const url = process.env.DATABASE_URL ?? "";
  if (!url || url.includes("connection_limit")) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}connection_limit=3`;
}

const client =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    datasources: { db: { url: buildDatabaseUrl() } },
  });

// ---------------------------------------------------------------------------
// Field-level encryption middleware (AES-256-GCM)
// Only activates when DATABASE_ENCRYPTION_KEY is set.
// ---------------------------------------------------------------------------

const ENCRYPTION_KEY_ENV = process.env.DATABASE_ENCRYPTION_KEY;

/** Model → fields to encrypt/decrypt */
const SENSITIVE_FIELDS: Record<string, string[]> = {
  Contact: ["phone", "email"],
  User: ["email"],
  Donation: ["amount"],
};

const ENC_PREFIX = "enc:";

function deriveKey(secret: string): Buffer {
  return scryptSync(secret, "poll-city-salt", 32);
}

function encryptValue(value: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Format: enc:<iv-hex>:<authTag-hex>:<ciphertext-hex>
  return `${ENC_PREFIX}${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decryptValue(value: string, key: Buffer): string {
  if (!value.startsWith(ENC_PREFIX)) return value;
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

if (ENCRYPTION_KEY_ENV) {
  const key = deriveKey(ENCRYPTION_KEY_ENV);

  client.$use(async (params, next) => {
    const model = params.model;
    if (!model || !SENSITIVE_FIELDS[model]) return next(params);

    const fields = SENSITIVE_FIELDS[model];

    // Encrypt on create/update
    if (params.action === "create" || params.action === "update" || params.action === "upsert") {
      const dataKeys = params.action === "upsert" ? ["create", "update"] : ["data"];
      for (const dk of dataKeys) {
        const data = (params.args as Record<string, Record<string, unknown>>)[dk];
        if (!data) continue;
        for (const field of fields) {
          const val = data[field];
          if (val !== undefined && val !== null && typeof val === "string") {
            data[field] = encryptValue(val, key);
          } else if (val !== undefined && val !== null && typeof val === "number") {
            data[field] = encryptValue(String(val), key);
          }
        }
      }
      // Also handle top-level data for create/update
      if (params.action !== "upsert") {
        const data = (params.args as Record<string, Record<string, unknown>>).data;
        if (data) {
          for (const field of fields) {
            const val = data[field];
            if (val !== undefined && val !== null && typeof val === "string" && !val.startsWith(ENC_PREFIX)) {
              data[field] = encryptValue(val, key);
            } else if (val !== undefined && val !== null && typeof val === "number") {
              data[field] = encryptValue(String(val), key);
            }
          }
        }
      }
    }

    const result = await next(params);

    // Decrypt on read
    if (result) {
      const decryptRecord = (record: Record<string, unknown>) => {
        for (const field of fields) {
          const val = record[field];
          if (typeof val === "string" && val.startsWith(ENC_PREFIX)) {
            const decrypted = decryptValue(val, key);
            // For Donation.amount, convert back to number
            if (model === "Donation" && field === "amount") {
              record[field] = parseFloat(decrypted);
            } else {
              record[field] = decrypted;
            }
          }
        }
      };

      if (Array.isArray(result)) {
        for (const record of result) {
          if (record && typeof record === "object") decryptRecord(record as Record<string, unknown>);
        }
      } else if (typeof result === "object") {
        decryptRecord(result as Record<string, unknown>);
      }
    }

    return result;
  });
}

globalForPrisma.prisma = client;

export const prisma = client;
export default prisma;
