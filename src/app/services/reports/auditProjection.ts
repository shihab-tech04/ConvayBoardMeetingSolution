/** AD-04/RP-09: explicitly allowlisted audit metadata, never raw event payloads. */
const SOURCE_ACTIONS: Readonly<Record<string, readonly string[]>> = {
  "Meeting template": ["create", "copy", "revise", "publish"],
  "Company meeting draft": ["company_meeting_draft_updated", "company_meeting_draft_discarded"],
  ...Object.fromEntries(["meetings", "agenda", "decisions", "resolutions", "actionitems", "minutes", "boardpacks", "documents", "workflows", "approvalrules", "quorumrules", "votingmethods"].map(key => ["bms." + key, ["INSERT", "UPDATE", "DELETE"]])),
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isObject = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const text = (x: unknown): x is string => typeof x === "string" && x.trim().length > 0;
export interface AuditProjectionRow {
  id: string; history_id: string; workflow_name: string; entity_type: string; entity_title: string;
  actor: string; action_date: string; action: string; status: string; notes: string;
  revision: string; request_id: string; tenant_id: string;
}
export interface AuditProjection { rows: AuditProjectionRow[]; limited: boolean; scope: "platform" | "tenant" }
export function parseAuditProjection(raw: unknown, workflowOnly: boolean): AuditProjection {
  if (!isObject(raw) || !Array.isArray(raw.events) || raw.events.length > 500 ||
      typeof raw.limited !== "boolean" || (raw.limited && raw.events.length !== 500) ||
      (raw.scope !== "platform" && raw.scope !== "tenant") || (workflowOnly && raw.scope !== "platform")) {
    throw new Error("Invalid audit evidence response.");
  }
  const seen = new Set<string>();
  const scope = raw.scope;
  const rows = raw.events.map(e => {
    if (!isObject(e) || !text(e.event_id) || !text(e.source) || !text(e.target_id) ||
        !text(e.action) || !Object.prototype.hasOwnProperty.call(SOURCE_ACTIONS, e.source) || !SOURCE_ACTIONS[e.source].includes(e.action) ||
        !text(e.occurred_at) || !/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(e.occurred_at) || !Number.isFinite(Date.parse(e.occurred_at)) ||
        (e.actor_id !== null && (!text(e.actor_id) || !UUID.test(e.actor_id))) ||
        (e.tenant_id !== null && (!text(e.tenant_id) || !UUID.test(e.tenant_id))) ||
        (e.request_id !== null && (!text(e.request_id) || !UUID.test(e.request_id))) ||
        (e.revision !== null && (typeof e.revision !== "string" || !/^\d+$/.test(e.revision))) ||
        seen.has(e.event_id) || (scope === "tenant" && (e.tenant_id === null || e.source.startsWith("bms.")))) {
      throw new Error("Invalid or out-of-scope audit event.");
    }
    const prefix = e.source === "Meeting template" ? "template:" : e.source === "Company meeting draft" ? "draft:" : "entity:";
    if (!e.event_id.startsWith(prefix) || !/^\d+$/.test(e.event_id.slice(prefix.length))) throw new Error("Invalid audit event identity.");
    seen.add(e.event_id);
    return { id: e.event_id, history_id: e.event_id, workflow_name: e.source, entity_type: e.source, entity_title: e.target_id,
      actor: e.actor_id ?? "Not recorded", action_date: e.occurred_at, action: e.action, status: "Recorded",
      notes: "Recorded event metadata only; reason and before/after state are not included.", revision: e.revision ?? "Not recorded",
      request_id: e.request_id ?? "Not recorded", tenant_id: e.tenant_id ?? "Not recorded" };
  });
  return { rows, limited: raw.limited, scope };
}
