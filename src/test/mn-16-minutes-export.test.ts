import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { Minutes } from "../app/data/boardMeetingData";
import { buildMinutesHtmlExport } from "../app/pages/archive-reports/minutesHtmlExport";

const minutes: Minutes = {
  id: "MIN-1001", minutes_id: "MIN-1001",
  meeting_id: "MTG-2026-01", meeting_title: "Board & <script>alert(1)</script>",
  minutes_template: "Standard Board Minutes",
  minute_taker: "Secretary", co_authors: "Ali & Rahman",
  quorum_statement: "Quorum was present",
  discussion_summary: "উপস্থিতি ও কার্যবিবরণী: সিদ্ধান্ত <ok>",
  notes: "Revision note with Bengali: সভা", next_meeting_date: "2026-12-02",
  closing_time: "16:00", version: "1.0", approval_status: "Draft",
  created_at: "2026-11-20T05:00:00Z", meeting_date: "2026-11-20",
  meeting_context: {
    committee: "Board of Directors", meeting_type: "Annual", mode: "Hybrid",
    venue: "Board Room", time_zone: "Asia/Dhaka", confidentiality: "Internal",
  },
};

describe("MN-16 Unicode-safe, source-bound minutes export", () => {
  it("preserves original Bengali content while escaping HTML/JS injection", () => {
    const result = buildMinutesHtmlExport(minutes);
    expect(result.mimeType).toBe("text/html;charset=utf-8");
    expect(result.filename).toBe("MIN-1001-v1.0.html");
    expect(result.content).toContain("উপস্থিতি ও কার্যবিবরণী");
    expect(result.content).toContain("Revision note with Bengali: সভা");
    expect(result.content).toContain("Board &amp; &lt;script&gt;alert(1)&lt;/script&gt;");
    expect(result.content).not.toContain("<script>alert(1)</script>");
    expect(result.content).toContain("default-src 'none'");
    expect(result.content).toContain("Asia/Dhaka");
    expect(result.content).toContain("Co-authors");
  });
  it("distinguishes draft from final internal status without claiming certified signatures", () => {
    const draft = buildMinutesHtmlExport(minutes);
    expect(draft.content).toContain("DRAFT / IN REVIEW");
    const signed = buildMinutesHtmlExport({ ...minutes, version: "1.1", approval_status: "Signed" });
    expect(signed.filename).toBe("MIN-1001-v1.1.html");
    expect(signed.content).toContain("not a qualified digital signature");
    expect(signed.content).not.toContain("DRAFT / IN REVIEW");
  });
  it("fails closed for incomplete authoritative records", () => {
    for (const key of ["id", "minutes_id", "meeting_id", "meeting_title", "version", "approval_status"] as const) {
      expect(() => buildMinutesHtmlExport({ ...minutes, [key]: "" })).toThrow(/incomplete/);
    }
  });
  it("requires fresh server readback and an active arc_view permission before creating a file", () => {
    const source = readFileSync("src/app/pages/archive-reports/MinutesManagementPage.tsx", "utf8");
    expect(source).toContain('effective_permissions.includes("arc_view")');
    expect(source).toContain('id: "export_minutes"');
    expect(source).toContain("await registry.refresh?.()");
    expect(source).toContain("const current = registry.getById(");
    expect(source).toContain("buildMinutesHtmlExport(current)");
    expect(source).toContain("new Blob([exportFile.content]");
    expect(source).toContain("Export Minutes (HTML)");
    expect(source).not.toContain("Minutes downloaded successfully");
  });
});
