import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isQuickMeetingActive,
  quickMeetingTokenLifetimeSeconds,
} from "../../supabase/functions/convay-quick-meeting/quickMeetingRules";

const now = Date.parse("2026-11-20T07:00:00.000Z");
const future = (milliseconds: number) => new Date(now + milliseconds).toISOString();
const edgeSource = readFileSync(
  resolve(process.cwd(), "supabase/functions/convay-quick-meeting/index.ts"),
  "utf8",
);

describe("QM-01 LiveKit token expiry is bounded by the meeting", () => {
  it("preserves the existing 120-second ceiling for a long-lived meeting", () => {
    expect(quickMeetingTokenLifetimeSeconds(future(3_600_000), now)).toBe(120);
  });

  it("bounds token lifetime to the remaining meeting seconds", () => {
    expect(quickMeetingTokenLifetimeSeconds(future(75_000), now)).toBe(75);
    expect(quickMeetingTokenLifetimeSeconds(future(1_500), now)).toBe(1);
    expect(quickMeetingTokenLifetimeSeconds(future(45_000), now, 15)).toBe(15);
  });

  it("caps a guest JWT to the earlier invitation or meeting expiration", () => {
    expect(quickMeetingTokenLifetimeSeconds(future(120_000), now, 120, future(12_000))).toBe(12);
    expect(quickMeetingTokenLifetimeSeconds(future(12_000), now, 120, future(90_000))).toBe(12);
    expect(quickMeetingTokenLifetimeSeconds(future(120_000), now, 120, future(1_000))).toBe(1);
  });

  it("fails closed on expired or malformed guest-link deadlines", () => {
    expect(quickMeetingTokenLifetimeSeconds(future(120_000), now, 120, future(0))).toBeNull();
    expect(quickMeetingTokenLifetimeSeconds(future(120_000), now, 120, future(-5_000))).toBeNull();
    expect(quickMeetingTokenLifetimeSeconds(future(120_000), now, 120, "invalid")).toBeNull();
    expect(quickMeetingTokenLifetimeSeconds(future(120_000), now, 120, "")).toBeNull();
  });

  it("rejects exact-expiry, elapsed and sub-second deadlines instead of minting a zero-TTL token", () => {
    expect(quickMeetingTokenLifetimeSeconds(future(999), now)).toBeNull();
    expect(quickMeetingTokenLifetimeSeconds(future(0), now)).toBeNull();
    expect(quickMeetingTokenLifetimeSeconds(future(-1), now)).toBeNull();
  });

  it("fails closed on malformed, absent, or nonfinite meeting timestamps", () => {
    expect(quickMeetingTokenLifetimeSeconds("invalid", now)).toBeNull();
    expect(quickMeetingTokenLifetimeSeconds(undefined as unknown as string, now)).toBeNull();
    expect(quickMeetingTokenLifetimeSeconds(future(5000), Number.NaN)).toBeNull();
    expect(quickMeetingTokenLifetimeSeconds(future(5000), Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("rejects invalid maximum token lifetimes", () => {
    expect(quickMeetingTokenLifetimeSeconds(future(5000), now, 0)).toBeNull();
    expect(quickMeetingTokenLifetimeSeconds(future(5000), now, -3)).toBeNull();
    expect(quickMeetingTokenLifetimeSeconds(future(5000), now, 1.5)).toBeNull();
  });

  it("preserves the previously verified active/expired/ended server meeting gate", () => {
    expect(isQuickMeetingActive({ status: "active", expires_at: future(2000) }, now)).toBe(true);
    expect(isQuickMeetingActive({ status: "ended", expires_at: future(2000) }, now)).toBe(false);
    expect(isQuickMeetingActive({ status: "active", expires_at: future(0) }, now)).toBe(false);
  });

  it("uses the capped TTL for both host and guest JWTs and returns the true expiration", () => {
    expect(edgeSource).toMatch(/const ttl = quickMeetingTokenLifetimeSeconds\(meeting\.expires_at, Date\.now\(\), TOKEN_TTL_SECONDS, linkExpiresAt\)/);
    expect(edgeSource).toMatch(/new AccessToken\(key, secret, \{ identity, name, ttl \}\)/);
    expect(edgeSource).toMatch(/return \{ participantToken: await token\.toJwt\(\), expiresIn: ttl \};/);
    expect(edgeSource).toMatch(/const minted = await issueRoomToken\(identity, host\.name, meeting\);/);
    expect(edgeSource).toMatch(/const minted = await issueRoomToken\(identity, name, meeting, link\.expires_at\);/);
    expect(edgeSource).not.toMatch(/expiresIn: TOKEN_TTL_SECONDS/);
  });
});
