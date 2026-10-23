import { GenPage } from "../../components/pages/GeneratedTablePage";
import type { PageCfg, KpiDef, FilterDef } from "../modulePageUtils";
import { fc, BADGE } from "../modulePageUtils";
import { ROW_VIEW, DOCUMENT_ACTIONS } from "../../data/modulePageConfigs";
import { BOARD_PACK_DRAWER_COLS } from "../boardMeetingDrawerSchemas";
import { useBoardPackRegistry, useMeetingRegistry, useGovernanceRegistry, generateId } from "../../data/boardMeetingData";
import { BOARD_PACK_FORM_FIELDS } from "../boardMeetingFormFields";
import { patchFormOptions } from "../../utils/patchFormOptions";

export function StockRegisterPage() {
  const registry = useBoardPackRegistry();
  const meetingReg = useMeetingRegistry();
  const govReg = useGovernanceRegistry();
  const dynamicFields = patchFormOptions(BOARD_PACK_FORM_FIELDS, {
    related_meeting: meetingReg.items.map(m => m.meeting_id + " — " + m.meeting_title),
    committee: govReg.items.map(g => g.body_name),
    governance_body: govReg.items.map(g => g.body_name),
  });

  const filters: FilterDef[] = [
    { key: "committee", label: "Committee", labelKey: "labels.committee", type: "select", options: ["All Committees", ...govReg.items.map(g => g.body_name)], optionKeys: { "All Committees": "options.allCommittees" } },
    { key: "approval_status", label: "Status", labelKey: "labels.status", type: "select", options: ["All Status", "Draft", "Pending Approval", "Approved", "Published", "Superseded"], optionKeys: { "All Status": "options.allStatus" } },
    { key: "from", label: "From Date", labelKey: "labels.fromDate", type: "date" },
    { key: "to",   label: "To Date",   labelKey: "labels.toDate",   type: "date" },
  ];

  const items = registry.items;
  const kpis: KpiDef[] = [
    { label: "Total Board Packs",  value: String(items.length),                                                       tone: "primary" },
    { label: "Draft",              value: String(items.filter(p => p.approval_status === "Draft").length),             tone: "neutral" },
    { label: "Pending Approval",   value: String(items.filter(p => p.approval_status === "Pending Approval").length),  tone: "warning" },
    { label: "Published",          value: String(items.filter(p => p.approval_status === "Published").length),         tone: "success" },
  ];

  const cfg: PageCfg = {
    title: "Board Packs",
    titleKey: "stockRegister.title",
    desc: "Manage board pack creation, version control, approval, and publication.",
    descKey: "stockRegister.desc",
    cols: [
      fc("pack_title",       "Board Pack",        { headerKey: "headers.meetingTitle" }),
      fc("related_meeting",  "Meeting",           { headerKey: "headers.meetingId" }),
      fc("version",          "Version",           { headerKey: "headers.totalEntry" }),
      fc("document_count",   "Documents",         { headerKey: "headers.totalRelatedRevenue" }),
      fc("publication_date", "Published",         { headerKey: "headers.date" }),
      BADGE("approval_status", "Status"),
    ],
    mobileCardMapping: { primary: "pack_title", identifier: "pack_id", meta: ["related_meeting", "version"], status: "approval_status", date: "publication_date" },
    filters,
    actions: ROW_VIEW,
    drawerActions: DOCUMENT_ACTIONS,
    drawerTitle: "Board Pack Details",
    drawerCols: BOARD_PACK_DRAWER_COLS,
    rows: items.map(p => ({ ...p })),
    kpis,
    entryBtn: "Create Board Pack",
    formFields: dynamicFields,
    onRowCreate(values) {
      const packId = generateId("BPK", registry.items.map(p => p.pack_id));
      registry.add({
        id: packId, pack_id: packId,
        pack_title:        String(values.pack_title       ?? ""),
        related_meeting:   String(values.related_meeting  ?? ""),
        meeting_title:     String(values.meeting_title    ?? ""),
        committee:         String(values.committee        ?? ""),
        version:           String(values.version          ?? "V1"),
        document_count:    "0",
        review_completion: "0%",
        publication_date:  String(values.publication_date ?? ""),
        change_summary:    String(values.change_summary   ?? "Initial version"),
        access_policy:     String(values.access_policy    ?? "Board Members Only"),
        approval_status:   "Draft",
        created_at:        new Date().toISOString(),
        created_by:        "User",
      });
    },
  };
  return <GenPage cfg={cfg} />;
}
