import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  rememberQuickGuestShareToken,
  resolveQuickGuestSessionId,
  resolveQuickGuestShareToken,
  type QuickGuestSessionStore,
} from "../app/pages/meetings/quickGuestSession";

const TOKEN_A = "AAAAAAAAAAAAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const TOKEN_B = "AAAAAAAAAAAAbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const SESSION_A = "11111111-1111-4111-8111-111111111111";
const SESSION_B = "22222222-2222-4222-8222-222222222222";
const SOURCE = readFileSync(resolve(process.cwd(), "src/app/pages/meetings/QuickMeetingPages.tsx"), "utf8");

function store() {
  const data = new Map<string, string>();
  const storage: QuickGuestSessionStore = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value); },
  };
  return { storage, data };
}

describe("QM-01 guest capability continuity and link navigation", () => {
  it("prefers a newly opened route capability over a different stored link", () => {
    const { storage } = store();
    rememberQuickGuestShareToken(TOKEN_A, storage);
    expect(resolveQuickGuestShareToken(TOKEN_B, storage)).toBe(TOKEN_B);
    rememberQuickGuestShareToken(TOKEN_B, storage);
    expect(resolveQuickGuestShareToken(undefined, storage)).toBe(TOKEN_B);
  });

  it("keeps the same session across refresh for the same exact guest link", () => {
    const { storage } = store();
    rememberQuickGuestShareToken(TOKEN_A, storage);
    expect(resolveQuickGuestSessionId(TOKEN_A, storage, () => SESSION_A)).toBe(SESSION_A);
    expect(resolveQuickGuestSessionId(TOKEN_A, storage, () => { throw new Error("must reuse"); })).toBe(SESSION_A);
  });

  it("never reuses another meeting identity, including same-prefix capabilities", () => {
    const { storage } = store();
    expect(TOKEN_A.slice(0, 12)).toEqual(TOKEN_B.slice(0, 12));
    rememberQuickGuestShareToken(TOKEN_A, storage);
    expect(resolveQuickGuestSessionId(TOKEN_A, storage, () => SESSION_A)).toBe(SESSION_A);
    expect(resolveQuickGuestSessionId(TOKEN_B, storage, () => SESSION_B)).toBe(SESSION_B);
    expect(resolveQuickGuestSessionId(TOKEN_A, storage, () => SESSION_B)).toBe(SESSION_A);
  });

  it("migrates the legacy 12-character key only for its exact saved share token", () => {
    const { storage, data } = store();
    data.set("convay.quick.guest.token", TOKEN_A);
    data.set("convay.quick.guest.session." + TOKEN_A.slice(0, 12), SESSION_A);
    expect(resolveQuickGuestSessionId(TOKEN_A, storage, () => SESSION_B)).toBe(SESSION_A);
    expect(resolveQuickGuestSessionId(TOKEN_B, storage, () => SESSION_B)).toBe(SESSION_B);
  });

  it("regenerates invalid persisted UUID sessions rather than admitting corrupt identity", () => {
    const { storage, data } = store();
    data.set("convay.quick.guest.session." + TOKEN_A, "not-a-uuid");
    expect(resolveQuickGuestSessionId(TOKEN_A, storage, () => SESSION_A)).toBe(SESSION_A);
    expect(data.get("convay.quick.guest.session." + TOKEN_A)).toBe(SESSION_A);
    expect(() => resolveQuickGuestSessionId(TOKEN_B, storage, () => "invalid")).toThrow(/valid guest session ID/);
  });

  it("handles browser private mode with unavailable storage without leaking an old token", () => {
    const unavailable: QuickGuestSessionStore = {
      getItem: () => { throw new Error("disabled"); },
      setItem: () => { throw new Error("disabled"); },
    };
    expect(resolveQuickGuestShareToken(undefined, unavailable)).toBe("");
    expect(resolveQuickGuestShareToken(TOKEN_B, unavailable)).toBe(TOKEN_B);
    expect(() => rememberQuickGuestShareToken(TOKEN_B, unavailable)).not.toThrow();
    expect(resolveQuickGuestSessionId(TOKEN_B, unavailable, () => SESSION_B)).toBe(SESSION_B);
    expect(resolveQuickGuestSessionId("", unavailable, () => { throw new Error("must not run"); })).toBe("");
  });

  it("remounts the entire guest prejoin/media flow whenever the capability changes", () => {
    expect(SOURCE).toMatch(/<QuickMeetingGuestFlow\s+key=\{shareToken\}/);
    expect(SOURCE).toMatch(/useMemo\([\s\S]*resolveQuickGuestSessionId\(shareToken/);
    expect(SOURCE).not.toMatch(/const \[shareToken\] = useState/);
  });
});
