import crypto from "crypto";
import { cookies } from "next/headers";

const AUTH_SECRET = process.env.AUTH_SECRET || "dev_stream_optimizer_secret_replace_in_prod_123456";
export const SESSION_COOKIE_NAME = "stream_session";
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds
export const MAGIC_LINK_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes in ms

interface MagicLinkPayload {
  email: string;
  exp: number; // Unix timestamp ms
}

interface SessionPayload {
  id: string;
  email: string;
  name?: string | null;
  exp: number; // Unix timestamp ms
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) {
    str += "=";
  }
  return Buffer.from(str, "base64").toString("utf-8");
}

/**
 * Generate HMAC-SHA256 signature
 */
function signData(data: string, salt = ""): string {
  return crypto
    .createHmac("sha256", AUTH_SECRET + salt)
    .update(data)
    .digest("hex");
}

/**
 * Create a stateless, self-expiring magic link token (10 minutes)
 * Salted with user's lastLoginAt timestamp for single-use / replay protection without DB storage.
 */
export function createMagicLinkToken(email: string, lastLoginAt?: Date | null): string {
  const payload: MagicLinkPayload = {
    email: email.toLowerCase().trim(),
    exp: Date.now() + MAGIC_LINK_EXPIRY_MS,
  };

  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  const salt = lastLoginAt ? lastLoginAt.getTime().toString() : "0";
  const signature = signData(payloadEncoded, salt);

  return `${payloadEncoded}.${signature}`;
}

/**
 * Verify a magic link token
 */
export function verifyMagicLinkToken(
  token: string,
  lastLoginAt?: Date | null
): { valid: boolean; email?: string; error?: string } {
  if (!token || !token.includes(".")) {
    return { valid: false, error: "Malformed token" };
  }

  const [payloadEncoded, signature] = token.split(".");
  if (!payloadEncoded || !signature) {
    return { valid: false, error: "Malformed token parts" };
  }

  const salt = lastLoginAt ? lastLoginAt.getTime().toString() : "0";
  const expectedSig = signData(payloadEncoded, salt);

  // Timing safe equal check
  try {
    const isSigMatch = crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSig, "hex")
    );
    if (!isSigMatch) {
      return { valid: false, error: "Invalid signature or token already used" };
    }
  } catch {
    return { valid: false, error: "Signature verification failed" };
  }

  try {
    const payload: MagicLinkPayload = JSON.parse(base64UrlDecode(payloadEncoded));
    if (Date.now() > payload.exp) {
      return { valid: false, error: "Magic link has expired. Please request a new one." };
    }
    return { valid: true, email: payload.email };
  } catch {
    return { valid: false, error: "Failed to decode payload" };
  }
}

/**
 * Create a signed 30-day session token for cookies
 */
export function createSessionToken(user: { id: string; email: string; name?: string | null }): string {
  const payload: SessionPayload = {
    id: user.id,
    email: user.email,
    name: user.name,
    exp: Date.now() + SESSION_MAX_AGE * 1000,
  };

  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  const signature = signData(payloadEncoded, "session");

  return `${payloadEncoded}.${signature}`;
}

/**
 * Verify a 30-day session token
 */
export function verifySessionToken(
  token: string
): { valid: boolean; user?: { id: string; email: string; name?: string | null }; error?: string } {
  if (!token || !token.includes(".")) {
    return { valid: false, error: "Malformed session token" };
  }

  const [payloadEncoded, signature] = token.split(".");
  const expectedSig = signData(payloadEncoded, "session");

  try {
    const isSigMatch = crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSig, "hex")
    );
    if (!isSigMatch) {
      return { valid: false, error: "Invalid session signature" };
    }
  } catch {
    return { valid: false, error: "Session verification error" };
  }

  try {
    const payload: SessionPayload = JSON.parse(base64UrlDecode(payloadEncoded));
    if (Date.now() > payload.exp) {
      return { valid: false, error: "Session expired" };
    }
    return { valid: true, user: { id: payload.id, email: payload.email, name: payload.name } };
  } catch {
    return { valid: false, error: "Failed to parse session payload" };
  }
}

/**
 * Helper to get authenticated user from Next.js cookie store
 */
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }
  const result = verifySessionToken(sessionCookie.value);
  if (!result.valid || !result.user) {
    return null;
  }
  return result.user;
}
