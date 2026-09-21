import { describe, expect, it } from "vitest";
import {
  createMagicLinkToken,
  createSessionToken,
  verifyMagicLinkToken,
  verifySessionToken,
} from "../src/lib/auth";

describe("Stateless Cryptographic Auth", () => {
  it("generates and verifies a valid magic link token", () => {
    const email = "frank@example.com";
    const token = createMagicLinkToken(email);

    const result = verifyMagicLinkToken(token);
    expect(result.valid).toBe(true);
    expect(result.email).toBe(email);
  });

  it("rejects a magic link token with tampered signature", () => {
    const token = createMagicLinkToken("frank@example.com");
    const [payload, sig] = token.split(".");
    const tamperedToken = `${payload}.${sig.slice(0, -2)}aa`;

    const result = verifyMagicLinkToken(tamperedToken);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid signature");
  });

  it("invalidates magic link on replay when lastLoginAt is updated", () => {
    const email = "frank@example.com";
    const initialLoginAt = new Date("2025-01-01T12:00:00Z");

    // Token generated when user's last login was Jan 1
    const token = createMagicLinkToken(email, initialLoginAt);

    // Initial check: Valid
    expect(verifyMagicLinkToken(token, initialLoginAt).valid).toBe(true);

    // User logs in, lastLoginAt updates to Jan 1 12:05:00
    const updatedLoginAt = new Date("2025-01-01T12:05:00Z");

    // Replay check with updated lastLoginAt: Fails!
    const replayResult = verifyMagicLinkToken(token, updatedLoginAt);
    expect(replayResult.valid).toBe(false);
    expect(replayResult.error).toContain("Invalid signature or token already used");
  });

  it("generates and verifies a 30-day session token", () => {
    const user = {
      id: "usr-12345",
      email: "frank@example.com",
      name: "Frank",
    };

    const sessionToken = createSessionToken(user);
    const result = verifySessionToken(sessionToken);

    expect(result.valid).toBe(true);
    expect(result.user?.id).toBe(user.id);
    expect(result.user?.email).toBe(user.email);
  });

  it("rejects a tampered session token", () => {
    const sessionToken = createSessionToken({ id: "usr-1", email: "a@b.com" });
    const tampered = sessionToken.slice(0, -3) + "xyz";

    const result = verifySessionToken(tampered);
    expect(result.valid).toBe(false);
  });
});
