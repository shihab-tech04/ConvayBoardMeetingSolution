import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20261106062035_convay_quick_meetings.sql"), "utf8");
const edge = readFileSync(resolve(process.cwd(), "supabase/functions/convay-quick-meeting/index.ts"), "utf8");

describe("Quick Meeting data boundary", () => {
  it("keeps quick meetings in separate server-only tables with RLS enabled", () => {
    for (const table of [
      "convay_quick_meetings",
      "convay_quick_meeting_sessions",
      "convay_quick_meeting_links",
      "convay_quick_meeting_attendance",
    ]) {
      expect(migration).toMatch(new RegExp(`alter table public\\.${table} enable row level security`, "i"));
      expect(migration).toMatch(new RegExp(`create table public\\.${table}`, "i"));
    }
    expect(migration).toMatch(/revoke all on public\.convay_quick_meetings[\s\S]*?from public, anon, authenticated/i);
    expect(migration).toMatch(/grant all on public\.convay_quick_meetings[\s\S]*?to service_role/i);
    expect(migration.match(/for all to anon, authenticated using \(false\) with check \(false\)/gi)).toHaveLength(4);
    expect(migration).not.toMatch(/insert\s+into\s+public\.convay_entity_records/i);
  });

  it("hashes share secrets and keeps LiveKit administration grants disabled", () => {
    expect(edge).toMatch(/crypto\.subtle\.digest\("SHA-256"[\s\S]*?new TextEncoder\(\)\.encode\(value\)/);
    expect(edge).toMatch(/canPublishData:\s*false/);
    expect(edge).toMatch(/roomAdmin:\s*false/);
    expect(edge).toMatch(/roomCreate:\s*false/);
    expect(edge).toMatch(/roomList:\s*false/);
    expect(edge).toMatch(/canCreateQuickMeeting\(host\.isSuperAdmin, host\.permissions\)/);
  });

  it("keeps saved governance admission JWT-protected while the guest route validates itself", () => {
    const config = readFileSync(resolve(process.cwd(), "supabase/config.toml"), "utf8");
    expect(config).toMatch(/\[functions\.convay-livekit\][\s\S]*?verify_jwt\s*=\s*true/i);
    expect(config).toMatch(/\[functions\.convay-quick-meeting\][\s\S]*?verify_jwt\s*=\s*false/i);
    expect(edge).toMatch(/auth\/v1\/user/);
    expect(edge).toMatch(/requireGuestLink\(secret\)/);
  });
});
