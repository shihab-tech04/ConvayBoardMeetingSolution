import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseAuditProjection } from "../app/services/reports/auditProjection";
const A = "11111111-1111-4111-8111-111111111111";
const event = { event_id: "template:1", source: "Meeting template", target_id: A, actor_id: A, occurred_at: "2026-11-28T10:00:00.123+00:00", action: "publish", revision: "2", request_id: A, tenant_id: A };
const view = (events: unknown[], scope = "tenant", limited = false) => ({ events, scope, limited });
describe("AD-04/RP-09 immutable audit read projection", () => {
  it("uses persisted identity, revision, actor and correlation without copying secret payloads", () => {
    const result = parseAuditProjection(view([{ ...event, details: { password: "hidden", vote: "hidden" } }]), false);
    expect(result.rows[0]).toMatchObject({ id: "template:1", entity_title: A, actor: A, revision: "2", request_id: A });
    expect(JSON.stringify(result)).not.toContain("hidden");
  });
  it("rejects unscoped and secret ballot records in a tenant report", () => {
    expect(() => parseAuditProjection(view([{ ...event, tenant_id: null }]), false)).toThrow();
    expect(() => parseAuditProjection(view([{ ...event, event_id: "entity:2", source: "bms.meetings", action: "UPDATE" }]), false)).toThrow();
    expect(() => parseAuditProjection(view([{ ...event, event_id: "entity:2", source: "bms.votes", action: "UPDATE" }], "platform"), false)).toThrow();
  });
  it("rejects duplicates, malformed identities and actions, and unapproved workflow scope", () => {
    for (const patch of [{ event_id: "draft:1" }, { actor_id: "invalid" }, { action: "delete" }, { occurred_at: "2026-11-28" }, { revision: "invalid" }])
      expect(() => parseAuditProjection(view([{ ...event, ...patch }]), false)).toThrow();
    expect(() => parseAuditProjection(view([event, event]), false)).toThrow();
    expect(() => parseAuditProjection(view([event]), true)).toThrow();
    expect(() => parseAuditProjection(view([event], "platform", true), true)).toThrow();
  });
  it("preserves honest absent and bounded evidence", () => {
    expect(parseAuditProjection(view([], "platform"), true).rows).toEqual([]);
    const limited = parseAuditProjection(view(Array.from({ length: 500 }, (_, i) => ({ ...event, event_id: `template:${i+1}` })), "platform", true), true);
    expect(limited.limited).toBe(true);
    expect(limited.rows).toHaveLength(500);
  });
  it("routes Audit Trail and Workflow History to the authorized read; no fallback fixtures", () => {
    expect(readFileSync("src/app/routes.tsx", "utf8")).toContain("function AuditTrailRoute()              { return <AuditProjectionPage />; }");
    expect(readFileSync("src/app/pages/administration/WorkflowPages.tsx", "utf8")).toContain("return <AuditProjectionPage workflowOnly />");
    expect(readFileSync("src/app/hooks/useAuditProjection.ts", "utf8")).toContain("/rest/v1/rpc/convay_report_audit_events");
  });
});
