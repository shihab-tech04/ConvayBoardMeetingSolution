import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { sanitizeAgendaHtml } from "../app/utils/sanitizeAgendaHtml";
import { isAgendaMeetingReady, validateOptionalMeetingAgendas } from "../app/pages/return-register/meetingAgendaSelection";
import type { AgendaSubmission } from "../app/data/boardMeetingData";

function row(id: string, status = "Approved", parent?: string, readiness?: string): AgendaSubmission {
  return { id, agenda_id: id, agenda_title: id,
    approval_status: status, ...(parent ? { parent_agenda_id: parent } : {}),
    ...(readiness ? { meeting_readiness: readiness } : {}),
  } as AgendaSubmission;
}

describe("AG-360 Agenda UI ↔ SQL workflow integrity", () => {
  it("sanitizes stored rich text: scripts, SVG, event handlers and dangerous links cannot render", () => {
    expect(sanitizeAgendaHtml('<p onclick="alert(1)">Safe<strong>bold</strong></p>'))
      .toBe("<p>Safe<strong>bold</strong></p>");
    expect(sanitizeAgendaHtml('<img src=x onerror=alert(1)><script>alert(2)</script><p>Okay</p>'))
      .toBe("<p>Okay</p>");
    expect(sanitizeAgendaHtml('<svg onload=alert(1)><animate /></svg><p>Hello</p>'))
      .toBe("<p>Hello</p>");
    expect(sanitizeAgendaHtml('<a href="javascript:alert(1)" onclick="alert(1)">unsafe</a>'))
      .toBe("<a>unsafe</a>");
    expect(sanitizeAgendaHtml('<a href="https://example.com" onclick="alert(1)">safe</a>'))
      .toContain('href="https://example.com"');
    expect(sanitizeAgendaHtml('<iframe src="https://bad.example"></iframe><p>Text</p>'))
      .toBe("<p>Text</p>");
    expect(sanitizeAgendaHtml('<p><em>Keep editor formatting</em></p>'))
      .toBe("<p><em>Keep editor formatting</em></p>");
  });

  it("uses one readiness rule for picker and meeting save, including historical missing flags", () => {
    const parent = row("parent");
    const child = row("child", "Approved", "parent");
    expect(isAgendaMeetingReady(parent, [parent, child])).toBe(true);
    expect(validateOptionalMeetingAgendas([{ agenda_id: "parent", display_order: 1 }], [parent, child]))
      .toEqual([]);
    expect(isAgendaMeetingReady(parent, [parent, { ...child, approval_status: "Draft" }])).toBe(false);
    expect(isAgendaMeetingReady(row("parent", "Approved", undefined, "In Review"), [parent, child])).toBe(false);
    expect(isAgendaMeetingReady(row("parent", "Rejected"), [parent])).toBe(false);
    expect(isAgendaMeetingReady({ ...parent, archived_at: "2026-11-23" }, [parent])).toBe(false);
    expect(isAgendaMeetingReady(child, [parent, child])).toBe(false);
  });

  it("review and archive use SQL atomic batches and do not report success before server acknowledgement", () => {
    const src = readFileSync("src/app/pages/register-stock/Register4ListPage.tsx", "utf8");
    expect(src).toContain("await convayAuth.applyAgendaBatch(ops)");
    expect(src).toContain("await convayAuth.applyAgendaBatch(members.map");
    expect(src).toContain("await registry.refresh?.()");
    expect(src).toContain("Approve every active child agenda before approving its parent.");
    expect(src).toContain('approve:          "agd_approve"');
    expect(src).toContain('submit:           "agd_submit"');
    expect(src).not.toContain('ip_address: "127.0.0.1"');
  });

  it("refuses editing approved content and requires SQL ACK for document link, removal and reorder", () => {
    const modal = readFileSync("src/app/components/agenda/AgendaFormModal.tsx", "utf8");
    expect(modal).toContain("EDITABLE_STATUSES.has(savedParent.approval_status)");
    expect(modal).toContain("await linkReg.add(");
    expect(modal).toContain("await linkReg.remove(");
    expect(modal).toContain("await convayAuth.applyBatch([");
    expect(modal).toContain("await convayAuth.applyBatch(operations)");
  });

  it("exposes the actual SQL updated_at for Agenda rows without changing other registry projections", () => {
    const client = readFileSync("src/app/services/supabase/convayAuth.ts", "utf8");
    const cache = readFileSync("src/app/hooks/useEntityRegistry.ts", "utf8");
    expect(client).toContain('entity === "bms.agenda" ? "payload,revision,updated_at" : "payload,revision"');
    expect(cache).toContain('storageKey === "bms.agenda" && x.updated_at');
  });
});
