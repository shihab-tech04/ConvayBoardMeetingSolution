import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261106062035_convay_quick_meetings.sql"),
  "utf8",
);

const attendanceBlock = migration.match(
  /create function public\.convay_record_quick_attendance\([\s\S]*?end \$\$;/i,
)?.[0] ?? "";
const leaveBlock = migration.match(
  /create function public\.convay_mark_quick_attendance_left\([\s\S]*?\$\$;/i,
)?.[0] ?? "";

describe("QM-01 attendance SQL idempotency contract", () => {
  it("initializes a new attendance identity at join count one", () => {
    expect(migration).toMatch(/join_count integer not null default 1 check \(join_count > 0\)/i);
    expect(migration).toMatch(/primary key \(meeting_id, livekit_identity\)/i);
    expect(attendanceBlock).toMatch(/on conflict\(meeting_id,livekit_identity\) do update set/i);
  });

  it("increments only when the previously confirmed attendance was marked left", () => {
    expect(attendanceBlock).toMatch(
      /join_count\s*=\s*public\.convay_quick_meeting_attendance\.join_count\s*\+\s*case\s+when\s+public\.convay_quick_meeting_attendance\.left_at\s+is\s+not\s+null\s+then\s+1\s+else\s+0\s+end/i,
    );
    expect(attendanceBlock).not.toMatch(/join_count\s*=\s*public\.convay_quick_meeting_attendance\.join_count\s*\+\s*1\b/i);
  });

  it("preserves last-seen refresh and clears left state after an acknowledged reconnect", () => {
    expect(attendanceBlock).toMatch(/last_joined_at\s*=\s*now\(\),\s*left_at\s*=\s*null/i);
    expect(leaveBlock).toMatch(/left_at\s*=\s*now\(\)/i);
    expect(leaveBlock).toMatch(/left_at is null/i);
  });

  it("does not open attendance RPCs to anonymous or authenticated browser roles", () => {
    expect(migration).toMatch(
      /revoke all on function public\.convay_record_quick_attendance\(uuid,text,text,uuid,text,uuid\)\s+from public, anon, authenticated;/i,
    );
    expect(migration).toMatch(
      /grant execute on function public\.convay_record_quick_attendance\(uuid,text,text,uuid,text,uuid\)\s+to service_role;/i,
    );
    expect(migration).toMatch(
      /revoke all on function public\.convay_mark_quick_attendance_left\(uuid,text\)\s+from public, anon, authenticated;/i,
    );
  });
});
