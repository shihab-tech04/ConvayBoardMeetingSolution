import { GitBranch, Download } from "lucide-react";
import { GenPage } from "../../components/pages/GeneratedTablePage";
import { fc, BADGE, type PageCfg } from "../modulePageUtils";
import { ROW_VIEW } from "../../data/modulePageConfigs";
import { WORKFLOW_HISTORY_DRAWER_COLS } from "../boardMeetingDrawerSchemas";
import { useAuditProjection } from "../../hooks/useAuditProjection";

export function AuditProjectionPage({ workflowOnly = false }: { workflowOnly?: boolean }) {
  const { userId, evidence, loading, error, refresh } = useAuditProjection(workflowOnly);
  const rows = evidence?.rows ?? [];
  const filters = ["entity_type", "action"].map(key => ({ key, label: key === "entity_type" ? "Entity" : "Action", type: "select" as const,
    options: ["All", ...new Set(rows.map(row => row[key as "entity_type" | "action"]))].sort((a, b) => a === "All" ? -1 : b === "All" ? 1 : a.localeCompare(b)) }));
  const title = workflowOnly ? "Workflow History" : "Audit Trail";
  const cfg: PageCfg = {
    title,
    desc: evidence ? `Recorded ${evidence.scope} event metadata only. ${evidence.limited ? "Latest 500 events; older history is not included. " : ""}Not a complete audit of all system activity.` : "Read recorded, authorized audit events. No sample history is displayed.",
    dataLoading: loading, dataError: error, dataErrorTitle: "Audit evidence could not be loaded", dataErrorDescription: error ?? undefined, onDataRetry: refresh,
    cols: [fc("history_id", "Event ID"), fc("workflow_name", "Workflow"), fc("entity_type", "Entity"), fc("entity_title", "Subject"), fc("actor", "Performed By"), fc("action_date", "Date & Time"), fc("action", "Action"), BADGE("status", "Status")],
    mobileCardMapping: { primary: "workflow_name", identifier: "history_id", meta: ["entity_type", "actor", "action_date"], status: "status", date: "action_date" },
    reportDateField: "action_date", filters: [...filters, { key: "from", label: "From Date", type: "date" }, { key: "to", label: "To Date", type: "date" }],
    actions: ROW_VIEW, drawerTitle: "Workflow Event Details", drawerCols: [...WORKFLOW_HISTORY_DRAWER_COLS,
      fc("revision", "Revision"), fc("request_id", "Correlation ID"), fc("tenant_id", "Tenant ID")],
    drawerActions: [{ id: "view_workflow", label: "View Workflow", icon: GitBranch, enabled: false, disabledReason: "Source deep link is not verified." }, { id: "download", label: "Export Event", icon: Download, enabled: false, disabledReason: "Audit export is not certified." }],
    rows, kpis: evidence ? [{ label: "Recorded events in this view", value: String(rows.length), tone: "neutral" }] : [],
    filteredKpis: filtered => [{ label: "Recorded events in this view", value: String(filtered.length), tone: "neutral" }],
    printDisabledReason: "Audit print is not certified.", searchPlaceholder: "Search recorded audit events",
  };
  return <GenPage key={`${userId ?? "signed-out"}:${evidence ? "ready" : "unavailable"}:${workflowOnly}`} cfg={cfg} />;
}
