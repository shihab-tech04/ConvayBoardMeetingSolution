import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20261106062035_convay_quick_meetings.sql"), "utf8");

const attendance = migration.slice(
  migration.indexOf("create function public.convay_record_quick_attendance("),
  migration.indexOf("create function public.convay_mark_quick_attendance_left("),
);

describe("QM-01 attendance idempotency SQL contract", () => {
  it("still starts the initial joining participant at exactly one", () => {
    expect(migration).toMatch(/join_count integer not null default 1 check \(join_count > 0\)/);
    expect(attendance).toMatch(/on conflict\s*\(meeting_id,livekit_identity\) do update set/i);
  });

  it("does not increment the session count for repeated join confirmation", () => {
    expect(attendance).toMatch(/join_count\s*=\s*public\.convay_quick_meeting_attendance\.join_count\s*\+\s*case when public\.convay_quick_meeting_attendance\.left_at is not null then 1 else 0 end/i);
    expect(attendance).not.toMatch(/join_count\s*=\s*public\.convay_quick_meeting_attendance\.join_count\s*\+\s*1\b/i);
  });

  it("preserves last-seen update and marks a confirmed returning participant online", () => {
    expect(attendance).toMatch(/last_joined_at\s*=\s*now\(\),\s*left_at\s*=\s*null,/i);
    expect(attendance).toMatch(/returning \* into v_row;/i);
  });

  it("keeps browser roles denied and service-only RPC execution", () => {
    expect(migration).toMatch(/revoke all on function public\.convay_record_quick_attendance\(uuid,text,text,uuid,text,uuid\)\s+from public, anon, authenticated/i);
    expect(migration).toMatch(/grant execute on function public\.convay_record_quick_attendance\(uuid,text,text,uuid,text,uuid\)\s+to service_role/i);
  });
});
