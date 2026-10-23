import { GenPage } from "../../components/pages/GeneratedTablePage";
import type { PageCfg, FilterDef } from "../modulePageUtils";
import { fc, BADGE, BASE_FILTERS } from "../modulePageUtils";
import { ROW_VIEW, EDIT } from "../../data/modulePageConfigs";
import { SECURITY_POLICY_DRAWER_COLS } from "../boardMeetingDrawerSchemas";
import { buildPageKpis } from "../../utils/buildPageKpis";
import { SECURITY_POLICY_FORM_FIELDS } from "../boardMeetingFormFields";
import { useAuditEventRegistry, generateId } from "../../data/boardMeetingData";

export function AuditSelectionPage() {
  const registry = useAuditEventRegistry();

  const rows = registry.items.map(e => ({
    ...e,
    id:           e.id,
    meeting_title:e.action + " — " + e.entity_type,
    audit_type:   e.entity_type,
    committee:    e.actor_role,
    audit_date:   e.timestamp.slice(0, 10),
    auditor:      e.actor,
    audit_status: e.approval_status,
  }));

  const filters: FilterDef[] = [
    ...BASE_FILTERS,
    { key: "audit_type", label: "Entity Type", labelKey: "labels.type", type: "select",
      options: ["All Types", "Meeting", "Decision", "Resolution", "Action Item", "Board Pack", "Document", "Minutes", "User"],
      optionKeys: { "All Types": "options.allTypes" } },
    { key: "audit_status", label: "Status", labelKey: "labels.status", type: "select",
      options: ["All Status", "Logged"],
      optionKeys: { "All Status": "options.allStatus" } },
  ];

  const kpis = buildPageKpis(rows, {
    totalLabel: "Total Events",
    statusField: "audit_status",
    statuses: [
      { value: "Logged", label: "Logged", tone: "success" },
    ],
  });

  const cfg: PageCfg = {
    title: "Audit Trail",
    titleKey: "auditSelection.title",
    desc: "View the full audit trail of all system actions, approvals, and governance events.",
    descKey: "auditSelection.desc",
    cols: [
      fc("meeting_title", "Event",        { headerKey: "headers.meetingTitle" }),
      fc("audit_type",    "Entity Type",  { headerKey: "headers.type" }),
      fc("committee",     "Actor Role",   { headerKey: "headers.committee" }),
      fc("audit_date",    "Timestamp",    { headerKey: "headers.date" }),
      fc("auditor",       "Actor",        { headerKey: "headers.submittedBy" }),
      BADGE("audit_status", "Status"),
    ],
    filters,
    actions: ROW_VIEW,
    drawerActions: EDIT,
    drawerTitle: "Audit Event Details",
    drawerCols: SECURITY_POLICY_DRAWER_COLS,
    rows,
    kpis,
    entryBtn: "Add Security Policy",
    formFields: SECURITY_POLICY_FORM_FIELDS,
    mobileCardMapping: {
      primary: "meeting_title",
      meta: ["audit_type", "committee", "auditor"],
      status: "audit_status",
      date: "audit_date",
    },
    onRowCreate(values) {
      const eId = generateId("AUD", registry.items.map(e => e.event_id));
      registry.add({
        id: eId, event_id: eId,
        entity_type:  String(values.entity_type  ?? "Policy"),
        entity_id:    String(values.entity_id    ?? eId),
        action:       String(values.action       ?? "Created"),
        actor:        String(values.actor        ?? "User"),
        actor_role:   String(values.actor_role   ?? "System Admin"),
        timestamp:    new Date().toISOString(),
        ip_address:   "—",
        details:      String(values.details      ?? ""),
        approval_status: "Logged",
      } as never);
    },
    onRowUpdate(id, values) {
      registry.update(id, {
        entity_type: values.audit_type  != null ? String(values.audit_type)  : undefined,
        action:      values.action      != null ? String(values.action)      : undefined,
        actor:       values.auditor     != null ? String(values.auditor)     : undefined,
        actor_role:  values.committee   != null ? String(values.committee)   : undefined,
        details:     values.details     != null ? String(values.details)     : undefined,
      } as never);
    },
  };

  return <GenPage cfg={cfg} />;
}
