import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { Eye, Package, Upload, Download, Pencil, Archive } from "lucide-react";
import { GenPage } from "../../components/pages/GeneratedTablePage";
import type { PageCfg, KpiDef } from "../modulePageUtils";
import { fc, BADGE, BASE_FILTERS, dg } from "../modulePageUtils";
import { useBoardPackRegistry, useMeetingRegistry, type BoardPack } from "../../data/boardMeetingData";
import { BOARD_PACK_FORM_FIELDS } from "../boardMeetingFormFields";
import { readAccessSnapshot, useAccessSnapshot } from "../../services/supabase/convayAccess";
import { convayAuth } from "../../services/supabase/convayAuth";
import { assembleBoardPackDraft, assembleBoardPackDraftUpdate, assertSameBoardPackDraftIntent, persistBoardPackDraft } from "./boardPackDraftPersistence";
import { useBoardPackDocumentLinkRegistry } from "../../data/documentWorkspaceData";
import { activeBoardPackDocumentCount } from "./boardPackActiveDocumentCount";
import { ROW_VIEW } from "../../data/modulePageConfigs";

const DRAWER_COLS = [
  dg("Pack Details", [
    { key: "pack_id",      label: "Pack ID" },
    { key: "pack_title",   label: "Title" },
    { key: "committee",    label: "Governance Body" },
    { key: "version",      label: "Version" },
    { key: "approval_status", label: "Status", badge: true },
  ]),
  dg("Meeting", [
    { key: "related_meeting", label: "Meeting ID" },
    { key: "meeting_title",   label: "Meeting Title" },
    { key: "meeting_date",    label: "Meeting Date" },
    { key: "publication_date", label: "Publication Date" },
  ]),
  dg("Content", [
    { key: "document_count",   label: "Documents" },
    { key: "review_completion", label: "Review Completion" },
    { key: "access_policy",    label: "Access Policy" },
    { key: "change_summary",   label: "Change Summary" },
  ]),
  dg("Authorship", [
    { key: "created_by", label: "Created By" },
    { key: "created_at", label: "Created At" },
  ]),
];

export function BoardPacksPage() {
  const reg = useBoardPackRegistry();
  const meetings = useMeetingRegistry();
  const access = useAccessSnapshot();
  const packLinks = useBoardPackDocumentLinkRegistry();
  const canCreate = access.loaded && (access.is_super_admin || access.effective_permissions.includes("pack_create"));

  const pending = useRef<{ actorId: string; draft: BoardPack; dispatched: boolean } | null>(null);
  const scopeEpoch = useRef(0);
  useEffect(() => {
    const invalidate = () => { scopeEpoch.current += 1; pending.current = null; };
    window.addEventListener("convay:entity-cache-cleared", invalidate);
    return () => { window.removeEventListener("convay:entity-cache-cleared", invalidate); invalidate(); };
  }, []);

  const createDraft = async (values: Record<string, unknown>): Promise<boolean> => {
    if (!canCreate) throw new Error("Board-pack creation permission could not be verified.");
    if (meetings.loading || meetings.error || ((reg.loading || reg.error) && !pending.current)) {
      throw new Error("Board-pack and meeting records must load successfully before saving.");
    }
    const epoch = scopeEpoch.current;
    const assertCurrent = () => {
      const current = readAccessSnapshot();
      if (scopeEpoch.current !== epoch || !current.loaded || current.error ||
          !(current.is_super_admin || current.effective_permissions.includes("pack_create"))) {
        throw new Error("Board-pack authority changed. Reopen the page before saving.");
      }
    };
    assertCurrent();
    const actor = await convayAuth.restore();
    assertCurrent();
    if (!actor) throw new Error("Session expired. Sign in again.");
    const list = async () => {
      assertCurrent();
      const result = await convayAuth.registry<BoardPack>("bms.boardpacks", "list");
      assertCurrent();
      return result.records.map(row => row.payload);
    };
    let attempt = pending.current;
    if (attempt) {
      if (attempt.actorId !== actor.user_id) throw new Error("Board-pack save belongs to a different account. Reopen the page.");
      assertSameBoardPackDraftIntent(values, attempt.draft, meetings.items);
    } else {
      const existing = await list();
      attempt = {
        actorId: actor.user_id,
        draft: assembleBoardPackDraft(values, meetings.items, existing, globalThis.crypto.randomUUID(),
          actor.display_name || actor.username || actor.user_id, new Date()),
        dispatched: false,
      };
    }
    const currentAttempt = attempt;
    await persistBoardPackDraft(currentAttempt.draft, {
      list, assertCurrent, create: async draft => (await reg.add(draft)) === true,
    }, currentAttempt.dispatched, () => {
      currentAttempt.dispatched = true;
      pending.current = currentAttempt;
    });
    assertCurrent();
    pending.current = null;
    try { await reg.refresh?.(); }
    catch { toast.warning("Board-pack draft saved. Refresh the list to see the latest records."); }
    assertCurrent();
    return true;
  };

  const updateDraft = async (id: string, values: Record<string, unknown>): Promise<boolean> => {
    if (!canCreate) throw new Error("Board-pack editing permission could not be verified.");
    const existing = reg.getById(id);
    if (!existing) throw new Error("Board pack was not found. Refresh and retry.");
    const patch = assembleBoardPackDraftUpdate(values, existing, meetings.items);
    const ack = await reg.update(id, patch);
    if (ack !== true) throw new Error("Board-pack changes were not confirmed by SQL.");
    return true;
  };
  const rows = useMemo(() => reg.items.map(pack => ({
    ...pack,
    document_count: activeBoardPackDocumentCount(pack, packLinks.items),
  })), [reg.items, packLinks.items]);

  const kpis: KpiDef[] = [
    { label: "Total Packs",      value: String(rows.length),                                              tone: "primary"  },
    { label: "Published",        value: String(rows.filter(r => r.approval_status === "Published").length),   tone: "success"  },
    { label: "Pending Approval", value: String(rows.filter(r => r.approval_status === "Pending Approval").length), tone: "warning" },
    { label: "Draft",            value: String(rows.filter(r => r.approval_status === "Draft").length),       tone: "neutral"  },
  ];

  const cfg: PageCfg = {
    title:   "Board Packs",
    desc:    "Manage board packs — compile, review, approve and publish document bundles for governance meetings.",
    cols: [
      fc("pack_id",          "Pack ID"),
      fc("pack_title",       "Title"),
      fc("committee",        "Governance Body"),
      fc("version",          "Version"),
      fc("document_count",   "Documents"),
      fc("review_completion","Review"),
      fc("publication_date", "Published"),
      BADGE("approval_status", "Status"),
    ],
    mobileCardMapping: {
      primary:    "pack_title",
      identifier: "pack_id",
      meta:       ["committee", "version", "document_count"],
      status:     "approval_status",
      date:       "publication_date",
    },
    filters:    BASE_FILTERS,
    actions:    ROW_VIEW,
    drawerTitle: "Board Pack Details",
    drawerCols:  DRAWER_COLS,
    drawerActions: [
      { id: "edit",    label: "Edit Pack",      icon: Pencil,  color: "#3b82f6" },
      // DC-25: retain approved actions, but never offer an unimplemented
      // publication/download/archive as if SQL and audit had confirmed it.
      // Re-enable only with authenticated server handlers and actor tests.
      { id: "publish", label: "Publish",         icon: Upload,  color: "#22c55e",
        enabled: false, disabledReason: "Publishing requires server approval, an immutable frozen manifest and an audit trail." },
      { id: "download",label: "Download Pack",   icon: Download,color: "#6b7280",
        enabled: false, disabledReason: "An authorized published manifest, original versions and server audit receipt are not connected yet." },
      { id: "archive", label: "Archive",         icon: Archive, color: "#ef4444",
        enabled: false, disabledReason: "Archiving requires a server-confirmed lifecycle transition and audit record." },
    ],
    rows,
    // Read-only pack listing must not depend on separate meeting permissions.
    dataLoading: Boolean(reg.loading),
    dataError: reg.error,
    onDataRetry: async () => { await Promise.all([reg.refresh?.(), meetings.refresh?.()]); },
    kpis,
    formFields: BOARD_PACK_FORM_FIELDS,
    onRowCreate: createDraft,
    onRowUpdate: updateDraft,
    drawerActionsResolver: row => ([
      { id: "edit", label: "Edit Pack", icon: Pencil, color: "#3b82f6",
        enabled: row.approval_status === "Draft",
        disabledReason: row.approval_status === "Draft" ? undefined : "Only server-confirmed draft packs may be edited." },
      { id: "publish", label: "Publish", icon: Upload, color: "#22c55e", enabled: false,
        disabledReason: "Publishing requires server approval, an immutable frozen manifest and an audit trail." },
      { id: "download", label: "Download Pack", icon: Download, color: "#6b7280", enabled: false,
        disabledReason: "An authorized published manifest, original versions and server audit receipt are not connected yet." },
      { id: "archive", label: "Archive", icon: Archive, color: "#ef4444", enabled: false,
        disabledReason: "Archiving requires a server-confirmed lifecycle transition and audit record." },
    ]),
    entryBtn: "Create Board Pack",
    searchPlaceholder: "Search board packs",
  };

  return <GenPage cfg={cfg} />;
}
