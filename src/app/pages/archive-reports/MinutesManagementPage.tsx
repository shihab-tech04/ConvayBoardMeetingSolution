import { Eye, RefreshCw, CheckCircle, Archive } from "lucide-react";
import { GenPage } from "../../components/pages/GeneratedTablePage";
import type { PageCfg, KpiDef, FilterDef, TableRow } from "../modulePageUtils";
import { fc, BADGE, BASE_FILTERS } from "../modulePageUtils";
import { EDIT } from "../../data/modulePageConfigs";
import { MINUTES_DRAWER_COLS } from "../boardMeetingDrawerSchemas";
import { useMinutesRegistry, useMeetingRegistry, generateId } from "../../data/boardMeetingData";
import { MINUTES_FORM_FIELDS } from "../boardMeetingFormFields";
import { patchFormOptions } from "../../utils/patchFormOptions";
import { useAccessSnapshot } from "../../services/supabase/convayAccess";
import { resolveMinutesSource, validateMinutesRevisionRequest } from "./minutesSourceIntegrity";

const STATUS_FLOW = ["Draft", "Under Secretary Review", "Under Chairperson Review", "Member Review", "Revision Requested", "Approved", "Signed", "Archived"];

export function MinutesManagementPage() {
  const registry = useMinutesRegistry();
  const meetingReg = useMeetingRegistry();
  const access = useAccessSnapshot();
  const canWriteMinutes = access.loaded && (access.is_super_admin || access.effective_permissions.includes("min_create"));
  const dynamicFields = patchFormOptions(MINUTES_FORM_FIELDS, {
    meeting_id: meetingReg.items.map(m => m.meeting_id),
    related_meeting: meetingReg.items.map(m => m.meeting_id + " — " + m.meeting_title),
  });

  const items = registry.items;

  const filters: FilterDef[] = [
    ...BASE_FILTERS,
    { key: "approval_status", label: "Status", labelKey: "labels.status", type: "select",
      options: ["All Status", ...STATUS_FLOW],
      optionKeys: { "All Status": "options.allStatus" } },
  ];

  const kpis: KpiDef[] = [
    { label: "Total Minutes",  value: String(items.length),                                                         tone: "primary" },
    { label: "Draft",          value: String(items.filter(m => m.approval_status === "Draft").length),              tone: "neutral" },
    { label: "Under Review",   value: String(items.filter(m => m.approval_status?.includes("Review")).length),      tone: "warning" },
    { label: "Approved",       value: String(items.filter(m => m.approval_status === "Approved" || m.approval_status === "Signed").length), tone: "success" },
  ];

  const cfg: PageCfg = {
    title: "Minutes Management",
    titleKey: "minutesManagement.title",
    desc: "Manage board and committee meeting minutes — drafting, review, approval, and archiving.",
    descKey: "minutesManagement.desc",
    cols: [
      fc("minutes_id",    "Minutes ID",    { headerKey: "headers.psrNo" }),
      fc("meeting_title", "Meeting Title", { headerKey: "headers.meetingTitle" }),
      fc("minute_taker",  "Minute Taker",  { headerKey: "headers.submittedBy" }),
      fc("version",       "Version",       { headerKey: "headers.totalEntry" }),
      fc("created_at",    "Created",       { headerKey: "headers.date" }),
      BADGE("approval_status", "Status"),
    ],
    mobileCardMapping: {
      primary:    "meeting_title",
      identifier: "minutes_id",
      meta:       ["minute_taker", "version"],
      status:     "approval_status",
      date:       "created_at",
    },
    filters,
    actions: [
      { id: "view", label: "View Details", labelKey: "actions.viewDetails", icon: Eye },
    ],
    drawerTitle: "Minutes Details",
    drawerCols: MINUTES_DRAWER_COLS,
    drawerActions: [
      ...EDIT,
      { id: "request_revision", label: "Request Revision", labelKey: "actions.requestRevision", icon: RefreshCw, color: "#f59e0b" },
      { id: "publish",          label: "Sign & Approve",   labelKey: "actions.publish",          icon: CheckCircle, color: "#22c55e" },
      { id: "archive",          label: "Archive",          labelKey: "actions.archive",           icon: Archive, color: "#6b7280" },
    ],
    rows: items.map(m => ({ ...m } as TableRow)),
    dataLoading: Boolean(registry.loading || meetingReg.loading),
    dataError: registry.error ?? meetingReg.error ?? null,
    onDataRetry: async () => {
      await Promise.all([registry.refresh?.(), meetingReg.refresh?.()]);
    },
    kpis,
    entryBtn: canWriteMinutes ? "Create Minutes" : undefined,
    formFields: dynamicFields,
    // MN-02: use the shared confirmation modal and await an authorized SQL
    // revision write before reporting success. This is not a local-only status.
    requestRevisionPermission: "min_approve",
    async onRequestRevision(id, instructions) {
      if (!access.loaded || !(access.is_super_admin || access.effective_permissions.includes("min_approve"))) {
        throw new Error("You do not have permission to request a minutes revision.");
      }
      if (registry.loading || registry.error) {
        throw new Error("Minutes records are not ready. Refresh and retry.");
      }
      const original = registry.items.find(item => item.id === id);
      if (!original) throw new Error("Minutes record not found. Refresh and retry.");
      const reason = validateMinutesRevisionRequest(original.approval_status, instructions);
      // The SQL/RLS registry must confirm the transition. Keeping the typed
      // patch as a variable preserves existing Minutes fields and contracts.
      const revisionPatch = { approval_status: "Revision Requested", revision_instructions: reason };
      const saved = await registry.update(id, revisionPatch);
      if (saved !== true) throw new Error("Revision request was not saved. Refresh and retry.");
      return true;
    },
    async onRowCreate(values) {
      if (!canWriteMinutes) throw new Error("You do not have permission to create minutes.");
      if (registry.loading || meetingReg.loading || registry.error || meetingReg.error) {
        throw new Error("Meeting records are not ready. Refresh and try again.");
      }
      const meeting = resolveMinutesSource(values.meeting_id, values.meeting_title, meetingReg.items);
      const minuteTaker = String(values.minute_taker ?? "").trim();
      if (!minuteTaker) throw new Error("A minute taker is required.");
      const minsId = generateId("MIN", registry.items.map(m => m.minutes_id));
      const saved = await registry.add({
        id:                 minsId,
        minutes_id:         minsId,
        meeting_id:         meeting.meeting_id,
        meeting_title:      meeting.meeting_title,
        meeting_date:       meeting.meeting_date,
        minutes_template:   String(values.minutes_template   ?? "Standard Board Minutes"),
        minute_taker:       minuteTaker,
        co_authors:         String(values.co_authors         ?? ""),
        quorum_statement:   String(values.quorum_statement   ?? ""),
        discussion_summary: String(values.discussion_summary ?? ""),
        next_meeting_date:  String(values.next_meeting_date  ?? ""),
        closing_time:       String(values.closing_time       ?? ""),
        version:            "1.0",
        approval_status:    "Draft",
        created_at:         new Date().toISOString(),
      });
      if (saved !== true) throw new Error("Minutes were not saved. Refresh the register and retry.");
      return true;
    },
    async onRowUpdate(id, values) {
      if (!canWriteMinutes) throw new Error("You do not have permission to edit minutes.");
      const original = registry.items.find(item => item.id === id);
      if (!original) throw new Error("Minutes record not found. Refresh and try again.");
      if (original.approval_status !== "Draft") {
        throw new Error("Only draft minutes can be edited. Approved and signed minutes must retain their original record.");
      }
      // Never accept a changed meeting link, identity, version or approval state from the form.
      if (String(values.meeting_id ?? "").trim() !== original.meeting_id ||
          String(values.meeting_title ?? "").trim() !== original.meeting_title) {
        throw new Error("The source meeting cannot be changed. Create minutes from the correct meeting instead.");
      }
      const minuteTaker = String(values.minute_taker ?? "").trim();
      if (!minuteTaker) throw new Error("A minute taker is required.");
      const saved = await registry.update(id, {
        minutes_template: String(values.minutes_template ?? original.minutes_template),
        minute_taker: minuteTaker,
        co_authors: String(values.co_authors ?? ""),
        quorum_statement: String(values.quorum_statement ?? ""),
        discussion_summary: String(values.discussion_summary ?? ""),
        next_meeting_date: String(values.next_meeting_date ?? ""),
        closing_time: String(values.closing_time ?? ""),
      });
      if (saved !== true) throw new Error("Draft changes were not saved. Refresh and retry.");
      return true;
    },
  };

  return <GenPage cfg={cfg} />;
}
