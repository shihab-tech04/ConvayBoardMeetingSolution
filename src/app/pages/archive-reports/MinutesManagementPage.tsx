import { Eye, RefreshCw, CheckCircle, Archive, Send, PenLine, Download } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { GenPage } from "../../components/pages/GeneratedTablePage";
import { SConfirmModal } from "../../components/modals/SConfirmModal";
import type { PageCfg, KpiDef, FilterDef, TableRow } from "../modulePageUtils";
import { fc, BADGE, BASE_FILTERS, dg } from "../modulePageUtils";
import { EDIT } from "../../data/modulePageConfigs";
import { MINUTES_DRAWER_COLS } from "../boardMeetingDrawerSchemas";
import { useMinutesRegistry, useMeetingRegistry, generateId } from "../../data/boardMeetingData";
import { MINUTES_FORM_FIELDS } from "../boardMeetingFormFields";
import { patchFormOptions } from "../../utils/patchFormOptions";
import { readAccessSnapshot, useAccessSnapshot } from "../../services/supabase/convayAccess";
import { resolveMinutesSource, validateMinutesRevisionRequest, isEditableMinutesStatus, buildMinutesReviewSubmission, buildMinutesLifecycleTransition, isMinutesLifecycleAction } from "./minutesSourceIntegrity";
import type { MinutesLifecycleAction } from "./minutesSourceIntegrity";
import { buildMinutesHtmlExport } from "./minutesHtmlExport";

const STATUS_FLOW = ["Draft", "Under Secretary Review", "Under Chairperson Review", "Member Review", "Revision Requested", "Approved", "Signed", "Archived"];

export function MinutesManagementPage() {
  const registry = useMinutesRegistry();
  const meetingReg = useMeetingRegistry();
  const access = useAccessSnapshot();
  const canWriteMinutes = access.loaded && (access.is_super_admin || access.effective_permissions.includes("min_create"));
  const canExportMinutes = access.loaded && (access.is_super_admin || access.effective_permissions.includes("arc_view"));
  const exportInFlight = useRef(false);
  const [submissionRow, setSubmissionRow] = useState<TableRow | null>(null);
  const [submissionSaving, setSubmissionSaving] = useState(false);
  const submissionInFlight = useRef(false);
  const [workflowRequest, setWorkflowRequest] = useState<{ row: TableRow; action: MinutesLifecycleAction } | null>(null);
  const [workflowSaving, setWorkflowSaving] = useState(false);
  const workflowInFlight = useRef(false);

  async function submitForSecretaryReview() {
    if (!submissionRow || submissionInFlight.current) return;
    submissionInFlight.current = true;
    setSubmissionSaving(true);
    try {
      const currentAccess = readAccessSnapshot();
      if (!currentAccess.loaded || !(currentAccess.is_super_admin || currentAccess.effective_permissions.includes("min_create"))) {
        throw new Error("You do not have permission to submit minutes for review.");
      }
      if (registry.loading || registry.error) {
        throw new Error("Minutes records are not ready. Refresh and retry.");
      }
      const id = String(submissionRow.id ?? "").trim();
      const original = registry.items.find(item => item.id === id);
      if (!original) throw new Error("Minutes record changed or is missing. Refresh and retry.");
      const patch = buildMinutesReviewSubmission(original.approval_status, original.version);
      // SQL enforces authorship, source, revision order and immutable history.
      const saved = await registry.update(id, patch);
      if (saved !== true) throw new Error("Minutes submission was not confirmed. Refresh and retry.");
      await registry.refresh?.();
      setSubmissionRow(null);
      toast.success("Minutes submitted for secretary review.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to submit minutes. Retry after refreshing.");
    } finally {
      submissionInFlight.current = false;
      setSubmissionSaving(false);
    }
  }
  async function confirmMinutesLifecycle() {
    if (!workflowRequest || workflowInFlight.current) return;
    workflowInFlight.current = true;
    setWorkflowSaving(true);
    try {
      const currentAccess = readAccessSnapshot();
      if (!currentAccess.loaded || !(currentAccess.is_super_admin || currentAccess.effective_permissions.includes("min_approve"))) {
        throw new Error("You do not have permission to review, sign or archive minutes.");
      }
      if (registry.loading || registry.error) {
        throw new Error("Minutes records are unavailable. Refresh and try again.");
      }
      const id = String(workflowRequest.row.id ?? "").trim();
      const current = registry.items.find(m => m.id === id);
      if (!current || String(current.approval_status) !== String(workflowRequest.row.approval_status)) {
        throw new Error("Minutes review stage changed. Refresh before taking action.");
      }
      const patch = buildMinutesLifecycleTransition(current.approval_status, workflowRequest.action);
      // Only a trusted SQL trigger can stamp reviewers/signers and verify
      // stage-specific privileges. The client never supplies actor identity.
      const saved = await registry.update(id, patch);
      if (saved !== true) throw new Error("Minutes transition was not saved. Refresh and retry.");
      await registry.refresh?.();
      const readback = registry.getById(id);
      if (!readback || readback.approval_status !== patch.approval_status) {
        throw new Error("The updated minutes status could not be verified. Refresh and retry.");
      }
      setWorkflowRequest(null);
      toast.success("Minutes status updated and verified.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Minutes transition failed. Refresh and retry.");
    } finally {
      workflowInFlight.current = false;
      setWorkflowSaving(false);
    }
  }
  // MN-02: select a real, accessible meeting; carry title and context from
  // its authoritative register record rather than requiring duplicate typing.
  async function exportMinutes(row: TableRow) {
    if (exportInFlight.current) return;
    exportInFlight.current = true;
    try {
      const nowAccess = readAccessSnapshot();
      if (!nowAccess.loaded || !(nowAccess.is_super_admin || nowAccess.effective_permissions.includes("arc_view"))) {
        throw new Error("You do not have permission to export minutes.");
      }
      // Do not export an optimistic table snapshot or a test fixture.
      await registry.refresh?.();
      const current = registry.getById(String(row.id ?? ""));
      if (!current) throw new Error("Minutes record was not found in the authorized server readback.");
      const exportFile = buildMinutesHtmlExport(current);
      const blob = new Blob([exportFile.content], { type: exportFile.mimeType });
      const url = URL.createObjectURL(blob);
      try {
        const link = document.createElement("a");
        link.href = url;
        link.download = exportFile.filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success("Minutes export file prepared. Check your browser downloads.");
      } finally {
        // Keep the object URL alive until the download has been initiated.
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Minutes export could not be prepared.");
    } finally {
      exportInFlight.current = false;
    }
  }
  const dynamicFields = patchFormOptions(MINUTES_FORM_FIELDS, {
    meeting_id: meetingReg.items.map(m => ({
      value: m.meeting_id,
      label: `${m.meeting_id} — ${m.meeting_title}`,
    })),
  }).map(field => field.key === "meeting_id"
    ? { ...field, type: "select" as const, helper: "Select a completed meeting from your accessible register." }
    : field.key === "meeting_title"
      ? { ...field, required: false, readOnly: true, placeholder: "Automatically taken from the selected meeting" }
      : field);

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
    // Keep every approved drawer group and append read-only source evidence.
    drawerCols: [
      ...MINUTES_DRAWER_COLS,
      dg("Source Meeting Context", [
        { key: "meeting_id", label: "Meeting ID" },
        { key: "meeting_date", label: "Meeting Date" },
        { key: "source_committee", label: "Governance Body" },
        { key: "source_meeting_type", label: "Meeting Type" },
        { key: "source_mode", label: "Meeting Mode" },
        { key: "source_venue", label: "Venue" },
        { key: "source_time_zone", label: "Time Zone" },
        { key: "source_confidentiality", label: "Confidentiality" },
      ]),
    ],
    drawerActionsResolver(row) {
      const status = String(row.approval_status ?? "");
      const exportAction = canExportMinutes
        ? [{ id: "export_minutes", label: "Export Minutes (HTML)", icon: Download, color: "#2563eb" }]
        : [];
      if (isEditableMinutesStatus(status)) return [
        ...EDIT,
        { id: "submit_for_review", label: "Submit for Secretary Review", icon: Send, color: "#2563eb" },
        ...exportAction,
      ];
      if (status === "Under Secretary Review" || status === "Under Chairperson Review") return [
        { id: "request_revision", label: "Request Revision", labelKey: "actions.requestRevision", icon: RefreshCw, color: "#f59e0b" },
        { id: "forward_review", label: status === "Under Secretary Review" ? "Forward to Chairperson Review" : "Forward to Member Review", icon: Send, color: "#2563eb" },
        ...exportAction,
      ];
      if (status === "Member Review") return [
        { id: "request_revision", label: "Request Revision", labelKey: "actions.requestRevision", icon: RefreshCw, color: "#f59e0b" },
        { id: "approve_minutes", label: "Approve Minutes", icon: CheckCircle, color: "#22c55e" },
        ...exportAction,
      ];
      if (status === "Approved") return [
        { id: "sign_minutes", label: "Record Internal Signature", icon: PenLine, color: "#22c55e" },
        ...exportAction,
      ];
      if (status === "Signed") return [
        { id: "archive_minutes", label: "Archive", labelKey: "actions.archive", icon: Archive, color: "#6b7280" },
        ...exportAction,
      ];
      return exportAction;
    },
    rows: items.map(m => ({
      ...m,
      source_committee: m.meeting_context?.committee ?? "",
      source_meeting_type: m.meeting_context?.meeting_type ?? "",
      source_mode: m.meeting_context?.mode ?? "",
      source_venue: m.meeting_context?.venue ?? "",
      source_time_zone: m.meeting_context?.time_zone ?? "",
      source_confidentiality: m.meeting_context?.confidentiality ?? "",
    } as TableRow)),
    dataLoading: Boolean(registry.loading || meetingReg.loading),
    dataError: registry.error ?? meetingReg.error ?? null,
    onDataRetry: async () => {
      await Promise.all([registry.refresh?.(), meetingReg.refresh?.()]);
    },
    kpis,
    entryBtn: canWriteMinutes ? "Create Minutes" : undefined,
    formFields: dynamicFields,
    onCustomAction(actionId, row) {
      if (actionId === "export_minutes") {
        void exportMinutes(row);
        return;
      }
      if (actionId === "submit_for_review") {
        if (!canWriteMinutes) {
          toast.error("You do not have permission to submit minutes for review.");
          return;
        }
        try {
          buildMinutesReviewSubmission(String(row.approval_status ?? ""), String(row.version ?? ""));
          setSubmissionRow(row);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Only draft or returned minutes can be submitted.");
        }
        return;
      }
      if (isMinutesLifecycleAction(actionId)) {
        const currentAccess = readAccessSnapshot();
        if (!currentAccess.loaded || !(currentAccess.is_super_admin || currentAccess.effective_permissions.includes("min_approve"))) {
          toast.error("You do not have permission to review, sign or archive minutes.");
          return;
        }
        try {
          buildMinutesLifecycleTransition(String(row.approval_status ?? ""), actionId);
          setWorkflowRequest({ row, action: actionId });
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "This minutes action is unavailable.");
        }
      }
    },
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
        meeting_context:    meeting.meeting_context,
        minutes_template:   String(values.minutes_template   ?? "Standard Board Minutes"),
        minute_taker:       minuteTaker,
        co_authors:         String(values.co_authors         ?? ""),
        quorum_statement:   String(values.quorum_statement   ?? ""),
        discussion_summary: String(values.discussion_summary ?? ""),
        notes:              String(values.notes ?? ""),
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
      if (!isEditableMinutesStatus(original.approval_status)) {
        throw new Error("Only draft or returned-for-revision minutes can be edited. Approved and signed records remain immutable.");
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
        notes: String(values.notes ?? ""),
        next_meeting_date: String(values.next_meeting_date ?? ""),
        closing_time: String(values.closing_time ?? ""),
      });
      if (saved !== true) throw new Error("Draft changes were not saved. Refresh and retry.");
      return true;
    },
  };

  return (
    <>
      <GenPage cfg={cfg} />
      {submissionRow && (
        <SConfirmModal
          title="Submit Minutes for Secretary Review"
          message="Confirm that your latest minutes edits have been saved. Submission moves this version to secretary review; returned minutes receive a new version. The source meeting and previous review history remain protected."
          confirmLabel={submissionSaving ? "Submitting…" : "Submit for Review"}
          onConfirm={() => { void submitForSecretaryReview(); }}
          onClose={() => { if (!submissionInFlight.current) setSubmissionRow(null); }}
        />
      )}
      {workflowRequest && (
        <SConfirmModal
          title="Confirm Minutes Lifecycle Action"
          message={workflowRequest.action === "sign_minutes"
            ? "Record an internal sign-off for these approved minutes. This records a server-confirmed actor and timestamp; it is not a third-party digital signature."
            : workflowRequest.action === "archive_minutes"
              ? "Archive these signed minutes as an immutable historical record?"
              : "Move these minutes to the next authorized review stage? This action requires reviewer permission and database confirmation."}
          confirmLabel={workflowSaving ? "Saving…" : "Confirm Action"}
          onConfirm={() => { void confirmMinutesLifecycle(); }}
          onClose={() => { if (!workflowInFlight.current) setWorkflowRequest(null); }}
        />
      )}
    </>
  );
}
