import { describe, expect, it } from "vitest";
import { assembleBoardPackDraft, assembleBoardPackDraftUpdate } from "../app/pages/agenda-documents/boardPackDraftPersistence";
import type { BoardPack } from "../app/data/boardMeetingData";

const meetings = [{
  meeting_id: "MTG-2026-0003",
  meeting_title: "Board Meeting",
  committee: "Board of Directors",
  meeting_date: "2026-11-25",
}];

const form = {
  pack_title: "November Board Pack",
  meeting_id: "MTG-2026-0003",
  committee: "Board of Directors",
  version: "V1",
  auto_version: true,
  include_notice: true,
  include_minutes: false,
  include_matters: true,
  confidentiality: "Confidential",
  publication_date: "2026-11-24",
  review_deadline: "2026-11-23",
  ack_required: false,
  change_summary: "Initial draft",
};

const previous: BoardPack = assembleBoardPackDraft(
  form, meetings, [], "uuid-draft-1", "Confirmed Actor", new Date("2026-11-20T10:00:00.000Z"),
);

describe("DC-21 board-pack draft-only persistence payload", () => {
  it("sets Draft regardless of client approval_status, pins exact meeting and preserves form flags", () => {
    const draft = assembleBoardPackDraft(
      { ...form, approval_status: "Published", created_by: "Fake client" },
      meetings, [], "uuid-draft-2", "Signed-in Actor", new Date("2026-11-20T10:00:00.000Z"),
    );
    expect(draft.approval_status).toBe("Draft");
    expect(draft.pack_id).toBe("BPK-2026-0001");
    expect(draft.related_meeting).toBe(meetings[0].meeting_id);
    expect(draft.meeting_title).toBe("Board Meeting");
    expect(draft.created_by).toBe("Signed-in Actor");
    expect(draft).toMatchObject({
      include_notice: true, include_minutes: false, include_matters: true,
      confidentiality: "Confidential", review_deadline: "2026-11-23",
    });
  });

  it("numbers after the highest current-year pack, not a past year or unrelated ID", () => {
    const rows = [{ pack_id: "BPK-2025-1000" }, { pack_id: "BPK-2026-0009" },
      { pack_id: "BPK-2026-0004" }, { pack_id: "invalid" }];
    expect(assembleBoardPackDraft(form, meetings, rows, "id-2", "Actor",
      new Date("2026-11-20T10:00:00.000Z")).pack_id).toBe("BPK-2026-0010");
  });

  it("rejects missing or unknown meetings (no unrelated meeting fallback)", () => {
    expect(() => assembleBoardPackDraft({ ...form, meeting_id: "MTG-2026-000" },
      meetings, [], "a", "Actor", new Date())).toThrow(/existing meeting/);
    expect(() => assembleBoardPackDraft({ ...form, meeting_id: "" },
      meetings, [], "a", "Actor", new Date())).toThrow(/existing meeting/);
  });

  it("rejects governance mismatches and unsupported initial version", () => {
    expect(() => assembleBoardPackDraft({ ...form, committee: "Audit Committee" },
      meetings, [], "a", "Actor", new Date())).toThrow(/governance body/);
    expect(() => assembleBoardPackDraft({ ...form, version: "V2" },
      meetings, [], "a", "Actor", new Date())).toThrow(/starts at V1/);
  });

  it("rejects unsaved binary attachments rather than claiming a successful draft", () => {
    expect(() => assembleBoardPackDraft({ ...form, attachments: [new File(["a"], "board.pdf")] },
      meetings, [], "a", "Actor", new Date())).toThrow(/Storage/);
  });

  it("requires a validated actor identity and a nonblank title", () => {
    expect(() => assembleBoardPackDraft(form, meetings, [], "a", "", new Date())).toThrow(/verified actor/);
    expect(() => assembleBoardPackDraft({ ...form, pack_title: "   " },
      meetings, [], "a", "Actor", new Date())).toThrow(/title/);
  });

  it("updates editable draft metadata without changing ID, owner or status", () => {
    const patch = assembleBoardPackDraftUpdate({ ...form, pack_title: "Revised Title" }, previous, meetings);
    expect(patch.pack_title).toBe("Revised Title");
    expect(patch.related_meeting).toBe(meetings[0].meeting_id);
    expect(patch).not.toHaveProperty("id");
    expect(patch).not.toHaveProperty("created_by");
    expect(patch).not.toHaveProperty("approval_status");
    expect(patch).not.toHaveProperty("pack_id");
  });

  it("prevents client mutation of approved/published/superseded records", () => {
    for (const status of ["Approved", "Published", "Superseded"]) {
      expect(() => assembleBoardPackDraftUpdate(form, { ...previous, approval_status: status }, meetings))
        .toThrow(/Only draft/);
    }
  });

  it("never creates or edits a fake document membership link", () => {
    const draft = assembleBoardPackDraft({ ...form, document_count: "200",
      access_policy: "All attendees", attachments: [] }, meetings, [], "a", "Actor", new Date());
    expect(draft.document_count).toBe("0");
    expect(draft.access_policy).toBe("");
    expect(draft).not.toHaveProperty("attachments");
  });
});
