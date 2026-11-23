import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
const panel = readFileSync("src/app/pages/meetings/LiveMeetingWorkspace.tsx", "utf8");
const signalSql = readFileSync("supabase/migrations/20261123172500_convay_live_participant_signals.sql", "utf8");
const types = readFileSync("src/app/data/boardMeetingData.ts", "utf8");
describe("LiveKit online panel, every entry gated by SQL and shared participant signals", () => {
  it("does not mount a media room before exactly one authoritative live SQL session", () => {
    expect(panel).toContain('if (isOnlineMeeting && phase === "meeting" && !canonicalRoomEntry.canJoin)');
    expect(panel).toContain('isOnlineMeeting && canonicalRoomEntry.canJoin && (');
    expect(panel).toContain('setPhase("prejoin")');
  });
  it("does not misreport unconfigured quorum as lost (0/0)", () => {
    expect(panel).toContain('"Quorum Pending"');
    expect(panel).toContain('"Quorum Not Configured"');
    expect(panel).toContain('"Quorum rule has not been configured."');
    expect(panel).toContain('New votes and formal resolutions remain blocked until SQL confirms quorum.');
    expect(panel).not.toContain('{"✓ Quorum" : "✗ No Quorum"} ({presentCount}/{quorumRequired})');
  });
  it("persists interactions under the signed-in actor and reads shared SQL state", () => {
    expect(panel).toContain('interaction_type: kind');
    expect(panel).toContain('metadata: kind === "hand_raise" ? { raised: value } : {}');
    expect(panel).toContain('if (saved === true)');
    expect(panel).toContain('refreshInteractions?.()');
    expect(panel).toContain('confirmedHandStates[currentUser.id]');
    expect(panel).toContain('recentReactions.map');
    expect(types).toContain('| "hand_raise"');
    expect(types).toContain('| "reaction"');
  });
  it("SQL checks meeting activity, identity and typed reaction/hand payload", () => {
    expect(signalSql).toContain("Live signals require exactly one active meeting session");
    expect(signalSql).toContain("Live signals require an authorized meeting participant");
    expect(signalSql).toContain("jsonb_typeof(v_metadata->'raised') <> 'boolean'");
    expect(signalSql).toContain("new.payload->>'content' not in ('👍','👏','❤️','😄','🤔','🙋')");
    expect(signalSql).toContain("new.payload->>'user_id'");
  });
});
