import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Eye, Package, Upload, Download, Pencil, Archive } from "lucide-react";
import { GenPage } from "../../components/pages/GeneratedTablePage";
import type { PageCfg, KpiDef } from "../modulePageUtils";
import { fc, BADGE, BASE_FILTERS, dg } from "../modulePageUtils";
import { useBoardPackRegistry, useMeetingRegistry, type BoardPack } from "../../data/boardMeetingData";
import { BOARD_PACK_FORM_FIELDS } from "../boardMeetingFormFields";
import { hasAccess, readAccessSnapshot, useAccessSnapshot } from "../../services/supabase/convayAccess";
import { convayAuth } from "../../services/supabase/convayAuth";
import { assembleBoardPackDraft, assembleBoardPackDraftUpdate, assertSameBoardPackDraftIntent, persistBoardPackDraft, persistBoardPackDraftUpdate } from "./boardPackDraftPersistence";
import { useBoardPackDocumentLinkRegistry } from "../../data/documentWorkspaceData";
import { activeBoardPackDocumentCount } from "./boardPackActiveDocumentCount";
import { ROW_VIEW } from "../../data/modulePageConfigs";
import { prepareServerBoardPackDownload } from "./boardPackDownloadTransport";
import { publishBoardPack, type PublicationIntent } from "./boardPackPublication";
import { SConfirmModal } from "../../components/modals/SConfirmModal";

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
  const [downloadBusy, setDownloadBusy] = useState(false);
  const downloadInFlight = useRef(false);
  const publishInFlight = useRef(false);
  const [publishIntent, setPublishIntent] = useState<(PublicationIntent & { title: string; epoch: number; access: typeof access }) | null>(null);
  const [publishError, setPublishError] = useState("");
  const canPublish = (row: Record<string,unknown>) =>
    !publishIntent && !publishInFlight.current && !access.error && row.approval_status === "Approved" &&
    ["pack_publish", "pack_create", "pack_view", "mtg_view", "doc_view"].every(permission => hasAccess(permission, access));
  const publicationAccess = (epoch: number, before: typeof access) => {
    const current = readAccessSnapshot();
    if (epoch !== scopeEpoch.current || before !== current || current.error ||
        !["pack_publish", "pack_create", "pack_view", "mtg_view", "doc_view"].every(permission => hasAccess(permission, current))) {
      throw new Error("Board-pack authority changed. Reopen the pack before publishing.");
    }
  };
  const beginPublication = async (row: Record<string,unknown>) => {
    if (publishInFlight.current || !canPublish(row) || typeof row.id !== "string") return;
    const epoch = scopeEpoch.current, before = readAccessSnapshot();
    publishInFlight.current = true;
    try {
      publicationAccess(epoch, before);
      const response = await convayAuth.registry<BoardPack>("bms.boardpacks", "list");
      publicationAccess(epoch, before);
      const matches = response.records.filter(r => r.payload.id === row.id);
      if (matches.length !== 1 || matches[0].payload.approval_status !== "Approved" ||
          matches[0].payload.version !== row.version || !Number.isSafeInteger(matches[0].revision) || matches[0].revision < 1) {
        throw new Error("The approved board pack changed. Refresh and reopen it.");
      }
      setPublishError("");
      setPublishIntent({recordId:row.id,revision:matches[0].revision,version:matches[0].payload.version,
        title:matches[0].payload.pack_title,epoch,access:before});
    } catch(error) {
      if (epoch === scopeEpoch.current) toast.error(error instanceof Error ? error.message : "Unable to verify board pack.");
    } finally { publishInFlight.current=false; }
  };
  const confirmPublication = async () => {
    if (!publishIntent || publishInFlight.current) return;
    const intent = publishIntent;
    publishInFlight.current=true;
    setPublishError("");
    try {
      const assertCurrent = () => publicationAccess(intent.epoch,intent.access);
      await publishBoardPack(intent,(path,init)=>convayAuth.authenticatedRequest(path,init),assertCurrent);
      assertCurrent();
      setPublishIntent(null);
      toast.success("Board pack published with its immutable original versions.");
      try { await reg.refresh?.(); }
      catch { toast.warning("Board pack published. Refresh the list to see the latest records."); }
    } catch(error) {
      if (intent.epoch === scopeEpoch.current) setPublishError(error instanceof Error ? error.message : "Publication not confirmed. Retry this exact revision.");
    } finally { publishInFlight.current=false; }
  };
  const canDownload = (row: Record<string, unknown>) =>
    !downloadBusy && !access.error && row.approval_status === "Published" &&
    typeof row.publication_manifest_id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.publication_manifest_id) &&
    typeof row.frozen_revision === "number" && Number.isSafeInteger(row.frozen_revision) && row.frozen_revision > 0 &&
    ["pack_view", "mtg_view", "doc_download", "doc_view"].every(permission => hasAccess(permission, access));

  const downloadPack = async (row: Record<string, unknown>) => {
    if (downloadInFlight.current || !canDownload(row) || typeof row.id !== "string" || typeof row.frozen_revision !== "number") return;
    const epoch = scopeEpoch.current;
    const accessAtStart = readAccessSnapshot();
    const assertCurrent = () => {
      const current = readAccessSnapshot();
      if (scopeEpoch.current !== epoch || current !== accessAtStart || current.error ||
          !["pack_view", "mtg_view", "doc_download", "doc_view"].every(permission => hasAccess(permission, current))) {
        throw new Error("Board-pack access changed. Reopen the pack before downloading.");
      }
    };
    downloadInFlight.current = true;
    setDownloadBusy(true);
    try {
      const result = await prepareServerBoardPackDownload(row.id, row.frozen_revision,
        (path, init) => convayAuth.authenticatedRequest(path, init), assertCurrent);
      assertCurrent();
      const url = URL.createObjectURL(result.archive);
      const anchor = document.createElement("a");
      try {
        anchor.href = url;
        anchor.download = result.fileName;
        document.body.appendChild(anchor);
        anchor.click();
        toast.success("Authorized board-pack download started.");
      } finally {
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 15_000);
      }
    } catch (error) {
      if (scopeEpoch.current === epoch) toast.error(error instanceof Error ? error.message : "Unable to download board pack. Reopen to retry.");
    } finally {
      downloadInFlight.current = false;
      setDownloadBusy(false);
    }
  };
  useEffect(() => {
    const invalidate = () => { scopeEpoch.current += 1; pending.current = null; setPublishIntent(null); };
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
    if (meetings.loading || meetings.error || reg.loading || reg.error) {
      throw new Error("Board-pack and meeting records must load successfully before editing.");
    }
    const epoch = scopeEpoch.current;
    const assertCurrent = () => {
      const current = readAccessSnapshot();
      if (scopeEpoch.current !== epoch || !current.loaded || current.error ||
          !(current.is_super_admin || current.effective_permissions.includes("pack_create"))) {
        throw new Error("Board-pack authority changed. Reopen the page before editing.");
      }
    };
    assertCurrent();
    const actor = await convayAuth.restore();
    assertCurrent();
    if (!actor) throw new Error("Session expired. Sign in again.");
    const existing = reg.getById(id);
    if (!existing || existing.id !== id) throw new Error("Board pack was not found. Refresh and retry.");
    const patch = assembleBoardPackDraftUpdate(values, existing, meetings.items);
    await persistBoardPackDraftUpdate(existing, patch, {
      assertCurrent,
      list: async () => {
        const result = await convayAuth.registry<BoardPack>("bms.boardpacks", "list");
        return result.records;
      },
      update: async (record, revision) => {
        const result = await convayAuth.registry<BoardPack>("bms.boardpacks", "update", record, revision);
        return result.revision === revision + 1;
      },
    });
    try { await reg.refresh?.(); }
    catch { toast.warning("Board-pack draft saved. Refresh the list to see the latest records."); }
    assertCurrent();
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
      { id: "publish", label: "Publish", icon: Upload, color: "#22c55e", enabled: canPublish(row),
        disabledReason: "Publishing requires server approval, an immutable frozen manifest and an audit trail." },
      { id: "download", label: "Download Pack", icon: Download, color: "#6b7280", enabled: canDownload(row),
        disabledReason: downloadBusy ? "A board-pack download is in progress." : "An authorized published manifest and current download permissions are required." },
      { id: "archive", label: "Archive", icon: Archive, color: "#ef4444", enabled: false,
        disabledReason: "Archiving requires a server-confirmed lifecycle transition and audit record." },
    ]),
    onCustomAction: (action, row) => {
      if (action === "download") void downloadPack(row);
      if (action === "publish") void beginPublication(row);
    },
    entryBtn: "Create Board Pack",
    searchPlaceholder: "Search board packs",
  };

  return <>
    <GenPage cfg={cfg} />
    {publishIntent && <SConfirmModal title="Publish Board Pack"
      message={`Publish ${publishIntent.title} (${publishIntent.version})? Its original versions will be retained and the published record will be immutable.${publishError ? " " + publishError : ""}`}
      confirmLabel="Publish" onConfirm={() => void confirmPublication()}
      onClose={() => { if (!publishInFlight.current) setPublishIntent(null); }} />}
  </>;
}
