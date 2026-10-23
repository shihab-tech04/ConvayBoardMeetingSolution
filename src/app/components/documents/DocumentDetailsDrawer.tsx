import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  X, FileText, File, BarChart2, ExternalLink, Eye,
  Plus, Trash2, RotateCcw, Download, Tag, ChevronRight,
  CheckCircle, Circle, MessageSquare, History, Users,
  GitBranch, Activity, Lock, Loader2, Send,
  Reply, User, GitCompare, HelpCircle,
  Package, CheckSquare, StickyNote, Link2,
} from "lucide-react";
import { toast } from "sonner";
import { ResponsiveOverlay } from "../shared/ResponsiveOverlay";
import { TabBar } from "../tabs/TabBar";
import { Button } from "../buttons/Button";
import { StatusBadge } from "../badges/StatusBadge";
import { AppTextField } from "../forms/AppTextField";
import { AppSelectField } from "../forms/AppSelectField";
import { AppTextArea } from "../forms/AppTextArea";
import {
  useDocumentRegistry,
  useDocumentVersionRegistry,
  useMeetingRegistry,
  useAgendaRegistry,
  useAgendaDocumentLinkRegistry,
  useAuditEventRegistry,
  useWorkflowRegistry,
  useApprovalRuleRegistry,
  useQuestionRegistry,
  useBoardPackRegistry,
  usePrivateNoteRegistry,
  type BoardDocument,
  type DocumentVersion,
  type AuditEvent,
} from "../../data/boardMeetingData";
import {
  useDocumentCommentRegistry,
  useDocumentApprovalRegistry,
  useBoardPackDocumentLinkRegistry,
  useDocumentAcknowledgementRegistry,
  type DocumentCommentThread,
  type CommentReply,
  type BoardPackDocumentLink,
} from "../../data/documentWorkspaceData";
import { useUserRegistry } from "../../hooks/useUserRegistry";
import { usePermissionRegistry } from "../../hooks/usePermissionRegistry";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { getDocumentRepository } from "../../services/repositories/documentRepository";
import { documentContentStore } from "../../services/repositories/documentContentStore";
import type { DocumentRepository, DocumentAccessEntry } from "../../services/types/documents";
import { getDocumentWorkspaceType } from "../../utils/documentFormat";

// ── Utilities ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number | undefined | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDate(iso: string | undefined | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); }
  catch { return String(iso); }
}

function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0] ?? "").join("").toUpperCase() || "?";
}

function getDocFileIcon(doc: BoardDocument) {
  const ext = (doc.file_format ?? doc.file_name?.split(".").pop() ?? "").toLowerCase();
  if (["xls", "xlsx"].includes(ext)) return BarChart2;
  return FileText;
}

function nextVersionNumber(versions: DocumentVersion[]): string {
  const nums = versions.map(v => parseFloat(v.version_number ?? "0")).filter(n => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return (Math.floor(max) + 1).toFixed(1);
}

function newAuditId(): string { return `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; }

// ── Permission hook ────────────────────────────────────────────────────────────

function useDocPermissions() {
  const reg = usePermissionRegistry();
  return useCallback(
    (permId: string) => reg.flatPermissions.some(p => p.id === permId && p.status === "Active"),
    [reg.flatPermissions],
  );
}

// ── Avatar ─────────────────────────────────────────────────────────────────────

function Avatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const sizeClass = size === "md" ? "doc-drawer__avatar doc-drawer__avatar--md" : "doc-drawer__avatar";
  return <div className={sizeClass}>{getInitials(name)}</div>;
}

// ── FieldRow ───────────────────────────────────────────────────────────────────

function FieldRow({ label, value, span }: { label: string; value?: string | null; span?: boolean }) {
  if (!value && value !== "0") return null;
  return (
    <div className={`drawer-field${span ? " drawer-field--wide" : ""}`}>
      <span className="drawer-field__label">{label}</span>
      <span className="drawer-field__value">{value}</span>
    </div>
  );
}

// ── Section ────────────────────────────────────────────────────────────────────

function Section({ title, children, padded = false }: { title: string; children: React.ReactNode; padded?: boolean }) {
  return (
    <div className="detail-section">
      <div className="detail-section__head detail-section__head--static">
        {title}
      </div>
      <div className="detail-section__body">
        {padded ? <div style={{ padding: "0.75rem 1rem", display: "flex", flexDirection: "column", gap: "0.625rem" }}>{children}</div> : children}
      </div>
    </div>
  );
}

// ── OverviewTab ────────────────────────────────────────────────────────────────

function OverviewTab({ doc }: { doc: BoardDocument }) {
  const meetingReg = useMeetingRegistry();
  const agendaReg  = useAgendaRegistry();

  const meetingLabel = useMemo(() => {
    if (!doc.related_meeting) return null;
    const m = meetingReg.items.find(
      m => m.meeting_id === doc.related_meeting || doc.related_meeting.startsWith(m.meeting_id),
    );
    return m?.meeting_title ?? doc.related_meeting;
  }, [doc.related_meeting, meetingReg.items]);

  const agendaLabel = useMemo(() => {
    if (!doc.related_agenda) return null;
    const a = agendaReg.items.find(
      a => a.agenda_id === doc.related_agenda || doc.related_agenda.startsWith(a.agenda_id),
    );
    return (a as { agenda_title?: string })?.agenda_title ?? doc.related_agenda;
  }, [doc.related_agenda, agendaReg.items]);

  const govBody = (doc as { governance_body?: string }).governance_body;
  const hasBoardContext = !!(meetingLabel || agendaLabel || govBody);

  const hasClassification = !!(
    doc.confidentiality ||
    doc.effective_date  ||
    doc.expiry_date     ||
    String(doc.acknowledgement_required) === "Yes" ||
    doc.tags
  );

  const openComments  = doc.unresolved_comment_count  ?? 0;
  const suggestions   = doc.pending_suggestion_count  ?? 0;
  const hasCollab     = openComments > 0 || suggestions > 0 || doc.approval_status === "Under Review" || doc.is_locked;

  return (
    <>
      <Section title="Document Summary">
        <div className="drawer-field-grid">
          <FieldRow label="Document Type"    value={doc.doc_type} />
          <FieldRow label="File Name"        value={doc.file_name} />
          <FieldRow label="File Format"      value={doc.file_format} />
          <FieldRow label="File Size"        value={formatBytes(doc.file_size)} />
          <FieldRow label="Version"          value={doc.version} />
          <FieldRow label="Owner"            value={doc.owner} />
          <FieldRow label="Created By"       value={doc.created_by} />
          <FieldRow label="Created"          value={formatDate(doc.created_at)} />
          <FieldRow label="Last Modified By" value={doc.last_modified_by} />
          <FieldRow label="Last Modified"    value={formatDate(doc.last_modified_at)} />
        </div>
      </Section>

      {hasBoardContext && (
        <Section title="Board Context">
          <div className="drawer-field-grid">
            {meetingLabel && <FieldRow label="Related Meeting"  value={meetingLabel} />}
            {agendaLabel  && <FieldRow label="Agenda Item"      value={agendaLabel} />}
            {govBody      && <FieldRow label="Governance Body"  value={govBody} />}
          </div>
        </Section>
      )}

      {hasClassification && (
        <Section title="Classification">
          <div className="drawer-field-grid">
            <FieldRow label="Confidentiality"         value={doc.confidentiality} />
            <FieldRow label="Effective Date"           value={formatDate(doc.effective_date)} />
            <FieldRow label="Expiry Date"              value={formatDate(doc.expiry_date)} />
            <FieldRow label="Acknowledgement Required" value={String(doc.acknowledgement_required) === "Yes" ? "Required" : undefined} />
            <FieldRow label="Tags"                     value={doc.tags} span />
          </div>
        </Section>
      )}

      {hasCollab && (
        <Section title="Collaboration">
          <div className="drawer-field-grid">
            {openComments > 0 && <FieldRow label="Open Comments"      value={String(openComments)} />}
            {suggestions  > 0 && <FieldRow label="Pending Suggestions" value={String(suggestions)} />}
            {doc.approval_status === "Under Review" && <FieldRow label="Review Status" value="Under Review" />}
            {doc.is_locked && <FieldRow label="Lock Status" value="Locked for approval" />}
          </div>
        </Section>
      )}
    </>
  );
}

// ── AccessTab ──────────────────────────────────────────────────────────────────

const PERM_ROLE_MAP: Record<string, string> = {
  view: "Viewer", comment: "Commenter", edit: "Editor", admin: "Owner",
};
const ROLE_OPTIONS = ["Viewer", "Commenter", "Editor", "Owner"];
const ROLE_PERM_MAP: Record<string, "view" | "comment" | "edit" | "admin"> = {
  Viewer: "view", Commenter: "comment", Reviewer: "comment", Editor: "edit",
  Approver: "edit", Owner: "admin",
};

function AccessTab({
  doc,
  repo,
  can,
}: {
  doc: BoardDocument;
  repo: DocumentRepository | null;
  can: (id: string) => boolean;
}) {
  const { users } = useUserRegistry();
  const [entries, setEntries]     = useState<DocumentAccessEntry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [selUser, setSelUser]     = useState("");
  const [selRole, setSelRole]     = useState("Viewer");
  const [saving, setSaving]       = useState(false);

  const canShare = can("doc_share");
  const docId = doc.doc_id ?? doc.id;

  const reload = useCallback(async () => {
    if (!repo) return;
    setLoading(true);
    try { setEntries(await repo.listAccess(docId)); }
    catch { setEntries([]); }
    finally { setLoading(false); }
  }, [repo, docId]);

  useEffect(() => { reload(); }, [reload]);

  const handleAdd = async () => {
    if (!repo || !selUser) { toast.error("Select a user to add."); return; }
    setSaving(true);
    try {
      await repo.grantAccess({
        document_id: docId,
        subject_type: "user",
        subject_id: selUser,
        permission: ROLE_PERM_MAP[selRole] ?? "view",
        granted_by: "current_user",
      });
      toast.success("Access granted.");
      setShowForm(false); setSelUser(""); setSelRole("Viewer");
      await reload();
    } catch { toast.error("Failed to grant access."); }
    finally { setSaving(false); }
  };

  const handleRevoke = async (entryId: string, name: string) => {
    if (!repo) return;
    try {
      await repo.revokeAccess(entryId);
      toast.success(`Access removed for ${name}.`);
      await reload();
    } catch { toast.error("Failed to remove access."); }
  };

  const userOptions = useMemo(
    () => ["", ...users.filter(u => u.status === "Active").map(u => u.name)],
    [users],
  );

  const getUserName = (subjectId: string) => {
    const u = users.find(u => u.id === subjectId || u.name === subjectId || u.email === subjectId);
    return u?.name ?? subjectId;
  };

  if (loading) return <div className="doc-drawer__loading"><Loader2 size={16} className="spin-icon" /> Loading access…</div>;

  return (
    <>
      {canShare && (
        <div style={{ marginBottom: "0.75rem" }}>
          {!showForm ? (
            <Button variant="secondary" size="sm" leadingIcon={Plus} onClick={() => setShowForm(true)}>
              Add People
            </Button>
          ) : (
            <div className="doc-drawer__add-access">
              <AppSelectField
                id="access-user"
                label="User"
                value={selUser}
                onChange={v => setSelUser(String(v))}
                options={userOptions}
              />
              <AppSelectField
                id="access-role"
                label="Role"
                value={selRole}
                onChange={v => setSelRole(String(v))}
                options={ROLE_OPTIONS}
              />
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <Button variant="primary"  size="sm" loading={saving} onClick={handleAdd}>Grant Access</Button>
                <Button variant="ghost"    size="sm" onClick={() => { setShowForm(false); setSelUser(""); }}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {entries.length === 0 ? (
        <div className="doc-drawer__empty">
          <Users size={28} strokeWidth={1.5} style={{ marginBottom: "0.5rem", opacity: 0.4 }} />
          <div>No access entries. Add people to share this document.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {entries.map(e => {
            const name = getUserName(e.subject_id);
            const roleName = PERM_ROLE_MAP[e.permission] ?? e.permission;
            return (
              <div key={e.id} className="doc-drawer__user-row">
                <Avatar name={name} />
                <div className="doc-drawer__user-info">
                  <div className="doc-drawer__user-name">{name}</div>
                  {e.expires_at && (
                    <div className="doc-drawer__user-sub">Expires {formatDate(e.expires_at)}</div>
                  )}
                </div>
                <span className="doc-drawer__role-badge">{roleName}</span>
                {canShare && (
                  <button
                    type="button"
                    className="doc-drawer__icon-btn"
                    title={`Remove access for ${name}`}
                    onClick={() => handleRevoke(e.id, name)}
                    aria-label={`Remove access for ${name}`}
                  >
                    <Trash2 size={13} strokeWidth={2} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ── WorkflowTab ────────────────────────────────────────────────────────────────

const WORKFLOW_STAGES = [
  "Draft",
  "Under Review",
  "Changes Requested",
  "Pending Approval",
  "Approved",
  "Published",
  "Superseded",
  "Archived",
];

type TransitionDef = {
  label: string;
  to: string;
  permId: string;
  variant: "primary" | "secondary" | "ghost" | "danger";
  locks?: boolean;
  unlocks?: boolean;
  snapshotLabel?: string;
};

const STAGE_TRANSITIONS: Record<string, TransitionDef[]> = {
  "Draft": [
    { label: "Request Review", to: "Under Review", permId: "doc_review", variant: "primary", snapshotLabel: "Review submission" },
  ],
  "Under Review": [
    { label: "Submit for Approval", to: "Pending Approval", permId: "doc_review",  variant: "primary",   locks: true, snapshotLabel: "Approval snapshot" },
    { label: "Request Revision",    to: "Changes Requested", permId: "doc_review",  variant: "secondary" },
    { label: "Reject",              to: "Draft",             permId: "doc_approve", variant: "danger"    },
  ],
  "Changes Requested": [
    { label: "Resubmit for Review", to: "Under Review", permId: "doc_edit", variant: "primary" },
  ],
  "Pending Approval": [
    { label: "Approve",         to: "Approved",          permId: "doc_approve", variant: "primary"                      },
    { label: "Request Changes", to: "Changes Requested", permId: "doc_approve", variant: "secondary", unlocks: true },
    { label: "Reject",          to: "Draft",             permId: "doc_approve", variant: "danger",    unlocks: true },
  ],
  "Approved": [
    { label: "Publish",    to: "Published",  permId: "doc_publish", variant: "primary"   },
    { label: "Supersede",  to: "Superseded", permId: "doc_publish", variant: "secondary" },
  ],
  "Published": [
    { label: "Archive",   to: "Archived",   permId: "doc_archive", variant: "secondary" },
    { label: "Supersede", to: "Superseded", permId: "doc_publish", variant: "ghost"     },
  ],
  "Superseded": [
    { label: "Archive", to: "Archived", permId: "doc_archive", variant: "secondary" },
  ],
  "Archived": [
    { label: "Restore to Draft", to: "Draft", permId: "doc_edit", variant: "secondary" },
  ],
};

function WorkflowTab({
  doc,
  can,
}: {
  doc: BoardDocument;
  can: (id: string) => boolean;
}) {
  const workflowReg     = useWorkflowRegistry();
  const approvalRuleReg = useApprovalRuleRegistry();

  const currentStatus = doc.approval_status ?? "Draft";
  const stageIdx      = WORKFLOW_STAGES.indexOf(currentStatus);

  const docWorkflows = workflowReg.items.filter(w => w.entity_type === "document" && w.status === "Active");
  const docRules     = approvalRuleReg.items.filter(r => r.entity_type === "document" && r.status === "Active");

  return (
    <>
      <Section title="Workflow Stage" padded>
        {doc.is_locked && (
          <div className="doc-drawer__lock-notice">
            <Lock size={12} strokeWidth={2} />
            <span>Locked for approval — editing is disabled until a decision is made.</span>
          </div>
        )}
        <div className="doc-drawer__stages">
          {WORKFLOW_STAGES.map((s, i) => {
            const isDone   = i < stageIdx;
            const isActive = i === stageIdx;
            const cn = `doc-drawer__stage${isDone ? " doc-drawer__stage--done" : isActive ? " doc-drawer__stage--active" : ""}`;
            return (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
                <div className={cn}>
                  <div className="doc-drawer__stage-dot" />
                  {s}
                </div>
                {i < WORKFLOW_STAGES.length - 1 && (
                  <ChevronRight size={10} strokeWidth={2} style={{ color: "var(--color-border)", flexShrink: 0 }} />
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {docWorkflows.length > 0 && (
        <Section title="Applied Workflows" padded>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {docWorkflows.map(w => (
              <div key={w.id} className="doc-drawer__version-row">
                <div className="doc-drawer__version-header">
                  <GitBranch size={13} strokeWidth={2} style={{ color: "var(--color-primary)" }} />
                  <span className="doc-drawer__version-num">{w.workflow_name}</span>
                  <span className="doc-drawer__role-badge" style={{ marginLeft: "auto" }}>{w.status}</span>
                </div>
                {w.trigger_event && (
                  <div className="doc-drawer__version-meta">
                    <span>Trigger: {w.trigger_event}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {docRules.length > 0 && (
        <Section title="Approval Rules" padded>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {docRules.map(r => (
              <div key={r.id} className="doc-drawer__version-row">
                <div className="doc-drawer__version-header">
                  <CheckCircle size={13} strokeWidth={2} style={{ color: "var(--color-success, #10b981)" }} />
                  <span className="doc-drawer__version-num">{r.rule_name}</span>
                </div>
                <div className="doc-drawer__version-meta">
                  {r.approver_role && <span>Approver: {r.approver_role}</span>}
                  {r.deadline_hours && <span>Deadline: {r.deadline_hours}h</span>}
                  {r.escalation_path && <span>Escalation: {r.escalation_path}</span>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

// ── VersionsTab ────────────────────────────────────────────────────────────────

type DiffChunk = { type: "same" | "added" | "removed"; text: string };

function diffText(oldHtml: string, newHtml: string): DiffChunk[] {
  const stripTags = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const oldLines = stripTags(oldHtml).split(/\.\s+/).filter(Boolean);
  const newLines = stripTags(newHtml).split(/\.\s+/).filter(Boolean);
  const result: DiffChunk[] = [];
  let oi = 0, ni = 0;
  while (oi < oldLines.length || ni < newLines.length) {
    if (oi < oldLines.length && ni < newLines.length && oldLines[oi] === newLines[ni]) {
      result.push({ type: "same",    text: oldLines[oi] + "." }); oi++; ni++;
    } else if (ni < newLines.length && (oi >= oldLines.length || !oldLines.slice(oi, oi + 5).includes(newLines[ni]))) {
      result.push({ type: "added",   text: newLines[ni] + "." }); ni++;
    } else {
      result.push({ type: "removed", text: oldLines[oi] + "." }); oi++;
    }
  }
  return result;
}

function VersionsTab({
  doc,
  can,
  onVersionRestored,
}: {
  doc: BoardDocument;
  can: (id: string) => boolean;
  onVersionRestored: (newVersion: string) => void;
}) {
  const versionReg  = useDocumentVersionRegistry();
  const docReg      = useDocumentRegistry();
  const auditReg    = useAuditEventRegistry();
  const [naming, setNaming]             = useState<string | null>(null);
  const [nameInput, setNameInput]       = useState("");
  const [comparing, setComparing]       = useState<string | null>(null);
  const [diffChunks, setDiffChunks]     = useState<DiffChunk[] | null>(null);
  const [diffLoading, setDiffLoading]   = useState(false);

  const docId   = doc.doc_id ?? doc.id;
  const versions = useMemo(
    () => versionReg.items
      .filter(v => v.document_id === docId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [versionReg.items, docId],
  );

  const handleRestore = (v: DocumentVersion) => {
    if (!can("doc_manage_versions")) { toast.error("You don't have permission to restore versions."); return; }
    const newNum = nextVersionNumber(versions);
    const newId  = `DV-${Date.now()}`;
    versionReg.add({
      id: newId,
      version_id: newId,
      document_id: docId,
      document_name: doc.doc_name,
      version_number: newNum,
      change_summary: `Restored from v${v.version_number}`,
      created_by: "current_user",
      created_at: new Date().toISOString(),
      approval_status: "Draft",
      restored_from_version_id: v.version_id,
      snapshot_type: "restore",
      is_named: false,
    });
    docReg.update(doc.id, { version: newNum, approval_status: "Draft", is_locked: false, locked_version_id: undefined });
    // Audit event
    const aud = newAuditId();
    auditReg.add({
      id: aud, event_id: aud,
      entity_type: "Document", entity_id: docId,
      action: "Version restored",
      actor: "current_user", actor_role: "User",
      timestamp: new Date().toISOString(), ip_address: "",
      details: `Restored from v${v.version_number} → new version v${newNum}`,
      approval_status: "Logged",
    });
    onVersionRestored(newNum);
    toast.success(`Restored to v${v.version_number} → new version v${newNum} created.`);
  };

  const handleSaveName = (v: DocumentVersion) => {
    if (!nameInput.trim()) { toast.error("Name cannot be empty."); return; }
    versionReg.update(v.id, { version_name: nameInput.trim(), is_named: true });
    toast.success("Version named.");
    setNaming(null); setNameInput("");
  };

  const handleCompare = async (v: DocumentVersion) => {
    if (comparing === v.id) { setComparing(null); setDiffChunks(null); return; }
    setComparing(v.id);
    setDiffLoading(true);
    setDiffChunks(null);
    try {
      const [liveContent, snapContent] = await Promise.all([
        documentContentStore.getEditorContent(docId),
        documentContentStore.getVersionSnapshot(docId, v.version_id),
      ]);
      if (!liveContent && !snapContent) {
        setDiffChunks([{ type: "same", text: "No text content available for comparison. Save the document first." }]);
      } else {
        setDiffChunks(diffText(snapContent ?? "", liveContent ?? ""));
      }
    } catch {
      setDiffChunks([{ type: "same", text: "Comparison unavailable." }]);
    } finally {
      setDiffLoading(false);
    }
  };

  if (versions.length === 0) {
    return (
      <div className="doc-drawer__empty">
        <History size={28} strokeWidth={1.5} style={{ marginBottom: "0.5rem", opacity: 0.4 }} />
        <div>No version history yet.</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
      {versions.map((v, idx) => {
        const isCurrent = idx === 0 || v.version_number === doc.version;
        const isComparing = comparing === v.id;
        return (
          <div key={v.id} className="doc-drawer__version-row">
            <div className="doc-drawer__version-header">
              <span className="doc-drawer__version-num">v{v.version_number}</span>
              {v.version_name && <span className="doc-drawer__version-name">— {v.version_name}</span>}
              {v.restored_from_version_id && (
                <span className="doc-drawer__version-name" style={{ opacity: 0.6 }}>↩ restored</span>
              )}
              {isCurrent && <span className="doc-drawer__role-badge" style={{ marginLeft: "auto" }}>Current</span>}
              {!isCurrent && v.approval_status && (
                <span className="doc-drawer__role-badge" style={{ marginLeft: "auto" }}>{v.approval_status}</span>
              )}
            </div>
            {v.change_summary && (
              <div className="doc-drawer__version-summary">{v.change_summary}</div>
            )}
            <div className="doc-drawer__version-meta">
              {v.created_by && <span>{v.created_by}</span>}
              {v.created_at && <span>{formatDate(v.created_at)}</span>}
              {v.file_size   && <span>{formatBytes(v.file_size)}</span>}
              {v.comment_count != null && v.comment_count > 0 && (
                <span>{v.comment_count} comment{v.comment_count !== 1 ? "s" : ""}</span>
              )}
            </div>

            {/* Comparison view */}
            {isComparing && (
              <div className="doc-drawer__diff-view">
                <div className="doc-drawer__diff-label">
                  <GitCompare size={11} strokeWidth={2} />
                  Text-level comparison: v{v.version_number} → current. Paragraph-level only.
                </div>
                {diffLoading ? (
                  <div style={{ padding: "0.5rem", opacity: 0.6 }}><Loader2 size={13} className="spin-icon" /> Comparing…</div>
                ) : diffChunks ? (
                  <div className="doc-drawer__diff-chunks">
                    {diffChunks.slice(0, 60).map((c, i) => (
                      c.type === "same" ? null : (
                        <div key={i} className={`doc-drawer__diff-chunk doc-drawer__diff-chunk--${c.type}`}>
                          {c.type === "added" ? "+" : "−"} {c.text}
                        </div>
                      )
                    ))}
                    {diffChunks.every(c => c.type === "same") && (
                      <div style={{ padding: "0.375rem", opacity: 0.6, fontSize: "0.75rem" }}>No text differences found.</div>
                    )}
                  </div>
                ) : null}
              </div>
            )}

            {naming === v.id ? (
              <div style={{ display: "flex", gap: "0.375rem", marginTop: "0.5rem", alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <AppTextField
                    id={`name-ver-${v.id}`}
                    label="Version Name"
                    value={nameInput}
                    onChange={val => setNameInput(val)}
                    placeholder="e.g. Board-approved draft"
                  />
                </div>
                <Button variant="primary" size="sm" onClick={() => handleSaveName(v)}>Save</Button>
                <Button variant="ghost"   size="sm" onClick={() => { setNaming(null); setNameInput(""); }}>Cancel</Button>
              </div>
            ) : (
              <div className="doc-drawer__version-actions">
                {!isCurrent && can("doc_manage_versions") && (
                  <Button variant="ghost" size="sm" leadingIcon={RotateCcw} onClick={() => handleRestore(v)}>
                    Restore
                  </Button>
                )}
                {can("doc_manage_versions") && (
                  <Button variant="ghost" size="sm" leadingIcon={Tag} onClick={() => { setNaming(v.id); setNameInput(v.version_name ?? ""); }}>
                    Name
                  </Button>
                )}
                {can("doc_view") && (
                  <Button
                    variant={isComparing ? "secondary" : "ghost"}
                    size="sm"
                    leadingIcon={GitCompare}
                    onClick={() => handleCompare(v)}
                  >
                    Compare
                  </Button>
                )}
                {can("doc_view") && (
                  <Button variant="ghost" size="sm" leadingIcon={Eye}>Preview</Button>
                )}
                {can("doc_download") && v.original_file_ref && (
                  <Button variant="ghost" size="sm" leadingIcon={Download}>Download</Button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── CommentsTab ────────────────────────────────────────────────────────────────

type CommentFilter = "open" | "resolved" | "all";

function CommentsTab({
  doc,
  can,
}: {
  doc: BoardDocument;
  can: (id: string) => boolean;
}) {
  const threadReg    = useDocumentCommentRegistry();
  const questionReg  = useQuestionRegistry();
  const auditReg     = useAuditEventRegistry();
  const { users }    = useUserRegistry();

  const [filter,     setFilter]     = useState<CommentFilter>("open");
  const [body,       setBody]       = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody,  setReplyBody]  = useState("");
  const [assigningTo, setAssigningTo] = useState<string | null>(null);

  const docId      = doc.doc_id ?? doc.id;
  const canComment = can("doc_comment");
  const canQuestion = can("question_create");

  const userNames = useMemo(
    () => users.filter(u => u.status === "Active").map(u => u.name),
    [users],
  );

  const threads = useMemo(
    () => threadReg.items
      .filter(t => t.document_id === docId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [threadReg.items, docId],
  );

  const filtered = useMemo(() => {
    if (filter === "open")     return threads.filter(t => t.status !== "resolved");
    if (filter === "resolved") return threads.filter(t => t.status === "resolved");
    return threads;
  }, [threads, filter]);

  const handlePost = () => {
    if (!body.trim()) return;
    const now = new Date().toISOString();
    const newId = `CT-${Date.now()}`;
    threadReg.add({
      id: newId, thread_id: newId,
      document_id: docId,
      status: "open",
      created_by: "current_user",
      created_at: now,
      body: body.trim(),
      replies: [],
      mentions: [],
    });
    const aud = newAuditId();
    auditReg.add({
      id: aud, event_id: aud,
      entity_type: "Document", entity_id: docId,
      action: "Comment added",
      actor: "current_user", actor_role: "User",
      timestamp: now, ip_address: "",
      details: body.trim().slice(0, 100),
      approval_status: "Logged",
    });
    setBody("");
    toast.success("Comment posted.");
  };

  const handleResolve = (thread: DocumentCommentThread) => {
    if (!can("doc_comment")) return;
    threadReg.update(thread.id, { status: "resolved" });
    const aud = newAuditId();
    auditReg.add({
      id: aud, event_id: aud,
      entity_type: "Document", entity_id: docId,
      action: "Comment resolved",
      actor: "current_user", actor_role: "User",
      timestamp: new Date().toISOString(), ip_address: "",
      details: thread.body.slice(0, 100),
      approval_status: "Logged",
    });
    toast.success("Comment resolved.");
  };

  const handleReopen = (thread: DocumentCommentThread) => {
    threadReg.update(thread.id, { status: "reopened" });
    toast.success("Comment reopened.");
  };

  const handleReply = (thread: DocumentCommentThread) => {
    if (!replyBody.trim()) return;
    const newReply: CommentReply = {
      id: `R-${Date.now()}`,
      thread_id: thread.id,
      author: "current_user",
      body: replyBody.trim(),
      created_at: new Date().toISOString(),
      mentions: [],
    };
    threadReg.update(thread.id, { replies: [...thread.replies, newReply] });
    setReplyingTo(null);
    setReplyBody("");
    toast.success("Reply added.");
  };

  const handleAssign = (thread: DocumentCommentThread, assignee: string) => {
    threadReg.update(thread.id, { assignee: assignee || undefined });
    setAssigningTo(null);
    toast.success(assignee ? `Assigned to ${assignee}.` : "Assignment removed.");
  };

  const handleCreateQuestion = (thread: DocumentCommentThread) => {
    if (!canQuestion) return;
    const qid = `QST-${Date.now()}`;
    questionReg.add({
      id: qid,
      question_id: qid,
      question_text: thread.body,
      related_meeting: doc.related_meeting ?? "",
      agenda_item: doc.related_agenda ?? "",
      document_ref: docId,
      directed_to: thread.assignee ?? "",
      asked_by: "current_user",
      priority: "Normal",
      visibility: "Board",
      written_response_required: "Yes",
      deadline: "",
      response_text: "",
      responded_by: "",
      response_date: "",
      current_status: "Pending",
      created_at: new Date().toISOString(),
    });
    toast.success("Formal Question created from comment.");
  };

  const FILTER_TABS: Array<{ id: CommentFilter; label: string; count: number }> = [
    { id: "open",     label: "Open",     count: threads.filter(t => t.status !== "resolved").length },
    { id: "resolved", label: "Resolved", count: threads.filter(t => t.status === "resolved").length },
    { id: "all",      label: "All",      count: threads.length },
  ];

  return (
    <>
      {canComment && (
        <div className="doc-drawer__add-comment">
          <AppTextArea
            id="comment-body"
            label="New Comment"
            value={body}
            onChange={v => setBody(v)}
            placeholder="Write a comment…"
            rows={3}
          />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button variant="primary" size="sm" leadingIcon={Send} onClick={handlePost}>
              Post
            </Button>
          </div>
        </div>
      )}

      <div className="doc-drawer__filter-chips">
        {FILTER_TABS.map(t => (
          <button
            key={t.id}
            type="button"
            className={`doc-drawer__chip${filter === t.id ? " doc-drawer__chip--active" : ""}`}
            onClick={() => setFilter(t.id)}
          >
            {t.label} {t.count > 0 && `(${t.count})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="doc-drawer__empty">
          <MessageSquare size={28} strokeWidth={1.5} style={{ marginBottom: "0.5rem", opacity: 0.4 }} />
          <div>No {filter === "all" ? "" : filter + " "}comments yet.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {filtered.map(thread => (
            <div
              key={thread.id}
              className={`doc-drawer__comment${thread.status === "resolved" ? " doc-drawer__comment--resolved" : ""}`}
            >
              {/* Thread header */}
              <div className="doc-drawer__comment-header">
                <Avatar name={thread.created_by} />
                <span className="doc-drawer__comment-author">{thread.created_by}</span>
                {thread.status === "resolved" && (
                  <span className="doc-drawer__role-badge" style={{ background: "var(--color-success-50,#ecfdf5)", color: "var(--color-success,#10b981)", borderColor: "var(--color-success-200,#a7f3d0)" }}>
                    Resolved
                  </span>
                )}
                {thread.status === "reopened" && (
                  <span className="doc-drawer__role-badge">Reopened</span>
                )}
                <span className="doc-drawer__comment-time">{timeAgo(thread.created_at)}</span>
              </div>

              {/* Selected text anchor */}
              {thread.selected_text && (
                <div className="doc-drawer__comment-anchor">
                  <span className="doc-drawer__comment-anchor-text">"{thread.selected_text}"</span>
                </div>
              )}

              {/* Body */}
              <div className="doc-drawer__comment-body">{thread.body}</div>

              {/* Assignee + due date */}
              {(thread.assignee || thread.due_date) && (
                <div className="doc-drawer__comment-meta-row">
                  {thread.assignee && (
                    <span className="doc-drawer__comment-meta-item">
                      <User size={10} strokeWidth={2} /> {thread.assignee}
                    </span>
                  )}
                  {thread.due_date && (
                    <span className="doc-drawer__comment-meta-item">
                      Due {formatDate(thread.due_date)}
                    </span>
                  )}
                </div>
              )}

              {/* Replies */}
              {thread.replies.length > 0 && (
                <div className="doc-drawer__replies">
                  {thread.replies.map(r => (
                    <div key={r.id} className="doc-drawer__reply">
                      <Avatar name={r.author} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="doc-drawer__reply-header">
                          <span className="doc-drawer__comment-author">{r.author}</span>
                          <span className="doc-drawer__comment-time">{timeAgo(r.created_at)}</span>
                        </div>
                        <div className="doc-drawer__comment-body">{r.body}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Assign dropdown */}
              {assigningTo === thread.id && (
                <div className="doc-drawer__assign-row">
                  <AppSelectField
                    id={`assign-${thread.id}`}
                    label="Assign to"
                    value={thread.assignee ?? ""}
                    onChange={v => handleAssign(thread, String(v))}
                    options={["", ...userNames]}
                  />
                  <Button variant="ghost" size="sm" onClick={() => setAssigningTo(null)}>Cancel</Button>
                </div>
              )}

              {/* Reply input */}
              {replyingTo === thread.id && (
                <div className="doc-drawer__reply-input">
                  <AppTextArea
                    id={`reply-${thread.id}`}
                    label="Reply"
                    value={replyBody}
                    onChange={v => setReplyBody(v)}
                    placeholder="Write a reply…"
                    rows={2}
                  />
                  <div style={{ display: "flex", gap: "0.375rem", justifyContent: "flex-end" }}>
                    <Button variant="primary" size="sm" onClick={() => handleReply(thread)}>Reply</Button>
                    <Button variant="ghost" size="sm" onClick={() => { setReplyingTo(null); setReplyBody(""); }}>Cancel</Button>
                  </div>
                </div>
              )}

              {/* Actions */}
              {thread.status !== "resolved" && canComment && (
                <div className="doc-drawer__comment-actions">
                  <button
                    type="button"
                    className="doc-drawer__text-btn"
                    onClick={() => { setReplyingTo(t => t === thread.id ? null : thread.id); setReplyBody(""); }}
                  >
                    <Reply size={11} strokeWidth={2} /> Reply
                  </button>
                  <button
                    type="button"
                    className="doc-drawer__text-btn"
                    onClick={() => setAssigningTo(t => t === thread.id ? null : thread.id)}
                  >
                    <User size={11} strokeWidth={2} /> Assign
                  </button>
                  <button
                    type="button"
                    className="doc-drawer__text-btn"
                    onClick={() => handleResolve(thread)}
                  >
                    <CheckCircle size={11} strokeWidth={2} /> Resolve
                  </button>
                  {canQuestion && (
                    <button
                      type="button"
                      className="doc-drawer__text-btn"
                      onClick={() => handleCreateQuestion(thread)}
                      title="Create a formal board question from this comment"
                    >
                      <HelpCircle size={11} strokeWidth={2} /> Create Formal Question
                    </button>
                  )}
                </div>
              )}
              {thread.status === "resolved" && canComment && (
                <div className="doc-drawer__comment-actions">
                  <button type="button" className="doc-drawer__text-btn" onClick={() => handleReopen(thread)}>
                    <RotateCcw size={11} strokeWidth={2} /> Reopen
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ── ActivityTab ────────────────────────────────────────────────────────────────

const ACTION_ICONS: Record<string, React.ElementType> = {
  create: Plus, upload: Plus, edit: FileText, approve: CheckCircle,
  reject: X, publish: ExternalLink, archive: Lock, restore: RotateCcw,
  comment: MessageSquare, view: Eye, download: Download, share: Users,
  review: Eye, version: History,
};

function ActivityTab({ doc }: { doc: BoardDocument }) {
  const auditReg = useAuditEventRegistry();
  const docId    = doc.doc_id ?? doc.id;

  const events = useMemo<AuditEvent[]>(
    () =>
      auditReg.items
        .filter(e => e.entity_id === docId || e.entity_id === doc.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [auditReg.items, docId, doc.id],
  );

  if (events.length === 0) {
    return (
      <div className="doc-drawer__empty">
        <Activity size={28} strokeWidth={1.5} style={{ marginBottom: "0.5rem", opacity: 0.4 }} />
        <div>No activity recorded for this document yet.</div>
      </div>
    );
  }

  return (
    <div className="doc-drawer__timeline">
      {events.map(e => {
        const actionLower = (e.action ?? "").toLowerCase();
        const IconComp = Object.entries(ACTION_ICONS).find(([k]) => actionLower.includes(k))?.[1] ?? Circle;
        return (
          <div key={e.id} className="doc-drawer__timeline-item">
            <div className="doc-drawer__timeline-dot">
              <IconComp size={10} strokeWidth={2.5} />
            </div>
            <div className="doc-drawer__timeline-content">
              <div className="doc-drawer__timeline-action">
                <strong>{e.actor}</strong> {e.action}
              </div>
              <div className="doc-drawer__timeline-meta">
                {timeAgo(e.timestamp)}
                {e.details && <span> · {e.details}</span>}
                {e.actor_role && <span> · {e.actor_role}</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── BoardPacksTab ──────────────────────────────────────────────────────────────

function BoardPacksTab({ doc, can }: { doc: BoardDocument; can: (id: string) => boolean }) {
  const docId       = doc.doc_id ?? doc.id;
  const linkReg     = useBoardPackDocumentLinkRegistry();
  const packReg     = useBoardPackRegistry();
  const versionReg  = useDocumentVersionRegistry();
  const auditReg    = useAuditEventRegistry();
  const currentUser = useCurrentUser();

  const [showAdd,    setShowAdd]    = useState(false);
  const [selPack,    setSelPack]    = useState("");
  const [selSection, setSelSection] = useState("");
  const [adding,     setAdding]     = useState(false);

  const links = linkReg.items.filter(l => l.document_id === docId && l.link_status !== "removed");

  // Highest version number from the version registry, falling back to the doc's own version field
  const latestVersion = useMemo(() => {
    const vers = versionReg.items.filter(v => v.document_id === docId);
    if (!vers.length) return doc.version ?? "1.0";
    return [...vers]
      .sort((a, b) => parseFloat(b.version_number ?? "0") - parseFloat(a.version_number ?? "0"))[0]
      .version_number ?? doc.version ?? "1.0";
  }, [versionReg.items, docId, doc.version]);

  const linkedPackIds = new Set(links.map(l => l.board_pack_id));
  const packOptions   = packReg.items
    .filter(p => !linkedPackIds.has(p.pack_id))
    .map(p => `${p.pack_id} — ${p.pack_title}`);

  const handleAdd = () => {
    if (!selPack) { toast.error("Select a board pack."); return; }
    setAdding(true);
    const packId = selPack.split(" — ")[0];
    const pack   = packReg.items.find(p => p.pack_id === packId);
    if (!pack) { setAdding(false); return; }
    const linkId = `LNK-${Date.now()}`;
    linkReg.add({
      id: linkId, link_id: linkId,
      board_pack_id: pack.pack_id,
      document_id: docId,
      linked_version_id: latestVersion,
      document_name: doc.doc_name,
      board_pack_name: pack.pack_title,
      section: selSection || undefined,
      sort_order: links.length + 1,
      added_by: currentUser.name,
      added_at: new Date().toISOString(),
      link_status: "active",
    });
    auditReg.add({
      id: `AUD-${Date.now()}`, event_id: `AUD-${Date.now()}`,
      entity_type: "Document", entity_id: docId,
      action: "Added to Board Pack", actor: currentUser.name, actor_role: "User",
      timestamp: new Date().toISOString(), ip_address: "",
      details: `Added to "${pack.pack_title}" at version ${latestVersion}`,
      approval_status: "Logged",
    });
    toast.success(`Added to "${pack.pack_title}" — version ${latestVersion} preserved.`);
    setShowAdd(false); setSelPack(""); setSelSection(""); setAdding(false);
  };

  const handleUpdateVersion = (link: BoardPackDocumentLink) => {
    if (link.linked_version_id === latestVersion) return;
    linkReg.update(link.id, { linked_version_id: latestVersion });
    auditReg.add({
      id: `AUD-${Date.now()}`, event_id: `AUD-${Date.now()}`,
      entity_type: "Document", entity_id: docId,
      action: "Board Pack Link Version Updated", actor: currentUser.name, actor_role: "User",
      timestamp: new Date().toISOString(), ip_address: "",
      details: `Updated "${link.board_pack_name}" link from v${link.linked_version_id} to v${latestVersion}`,
      approval_status: "Logged",
    });
    toast.success(`Board pack link updated to version ${latestVersion}.`);
  };

  const handleRemove = (link: BoardPackDocumentLink) => {
    linkReg.update(link.id, { link_status: "removed" });
    auditReg.add({
      id: `AUD-${Date.now()}`, event_id: `AUD-${Date.now()}`,
      entity_type: "Document", entity_id: docId,
      action: "Removed from Board Pack", actor: currentUser.name, actor_role: "User",
      timestamp: new Date().toISOString(), ip_address: "",
      details: `Removed from "${link.board_pack_name}"`,
      approval_status: "Logged",
    });
    toast.success("Removed from board pack.");
  };

  return (
    <Section title="Board Packs" padded>
      {can("doc_edit") && !showAdd && (
        <div style={{ marginBottom: "0.75rem" }}>
          <Button variant="ghost" size="sm" leadingIcon={Plus} onClick={() => setShowAdd(true)}>
            Add to Board Pack
          </Button>
        </div>
      )}

      {showAdd && (
        <div className="doc-drawer__inline-form">
          <AppSelectField id="bp-pack" label="Board Pack" value={selPack}
            onChange={v => setSelPack(String(v))}
            options={["", ...packOptions]}
          />
          <AppTextField id="bp-section" label="Section (optional)" value={selSection}
            onChange={setSelSection} placeholder="e.g. Financial Reports"
          />
          <div className="doc-drawer__inline-form-actions">
            <Button variant="ghost" size="sm"
              onClick={() => { setShowAdd(false); setSelPack(""); setSelSection(""); }}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" loading={adding} onClick={handleAdd}>Add</Button>
          </div>
        </div>
      )}

      {links.length === 0 && !showAdd && (
        <p className="doc-drawer__empty">This document has not been added to any board pack.</p>
      )}

      {links.map(link => {
        const isOutdated = link.linked_version_id !== latestVersion;
        return (
          <div key={link.id} className="doc-drawer__pack-link">
            <div className="doc-drawer__pack-link-main">
              <Package size={13} strokeWidth={1.75} style={{ flexShrink: 0, opacity: 0.5 }} />
              <div className="doc-drawer__pack-link-body">
                <span className="doc-drawer__pack-link-name">{link.board_pack_name}</span>
                <div className="doc-drawer__pack-link-meta">
                  {link.section && <span>{link.section}</span>}
                  <span>Linked version: {link.linked_version_id}</span>
                  <span>Added {timeAgo(link.added_at)} by {link.added_by}</span>
                </div>
                {isOutdated && (
                  <div className="doc-drawer__pack-version-notice">
                    New version available ({latestVersion}).
                    {can("doc_edit") && (
                      <button type="button" className="doc-drawer__text-btn"
                        onClick={() => handleUpdateVersion(link)}>
                        Update to {latestVersion}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            {can("doc_edit") && (
              <button type="button" className="doc-drawer__comment-action"
                onClick={() => handleRemove(link)} aria-label="Remove from board pack">
                <Trash2 size={12} strokeWidth={2} />
              </button>
            )}
          </div>
        );
      })}
    </Section>
  );
}

// ── AcknowledgementsTab ────────────────────────────────────────────────────────

function AcknowledgementsTab({ doc }: { doc: BoardDocument }) {
  const docId       = doc.doc_id ?? doc.id;
  const ackReg      = useDocumentAcknowledgementRegistry();
  const auditReg    = useAuditEventRegistry();
  const currentUser = useCurrentUser();

  const acks = ackReg.items.filter(a => a.document_id === docId);
  const alreadyAcked = acks.some(
    a => a.acknowledged_by.toLowerCase() === currentUser.name.toLowerCase(),
  );

  const handleAcknowledge = () => {
    if (alreadyAcked) { toast.info("You have already acknowledged this document."); return; }
    const ackId = `ACK-${Date.now()}`;
    ackReg.add({
      id: ackId, ack_id: ackId,
      document_id: docId,
      document_name: doc.doc_name,
      acknowledged_by: currentUser.name,
      acknowledged_at: new Date().toISOString(),
      version_id: doc.version,
    });
    auditReg.add({
      id: `AUD-${Date.now()}`, event_id: `AUD-${Date.now()}`,
      entity_type: "Document", entity_id: docId,
      action: "Document Acknowledged", actor: currentUser.name, actor_role: "User",
      timestamp: new Date().toISOString(), ip_address: "",
      details: `Version ${doc.version ?? "1.0"} explicitly acknowledged`,
      approval_status: "Logged",
    });
    toast.success("Document acknowledged.");
  };

  return (
    <Section title="Acknowledgements" padded>
      {doc.acknowledgement_required === "Yes" && (
        <div className="doc-drawer__lock-notice" style={{ marginBottom: "0.75rem" }}>
          This document requires explicit acknowledgement. Viewing does not count as acknowledgement.
        </div>
      )}

      {doc.acknowledgement_required === "Yes" && !alreadyAcked && (
        <div style={{ marginBottom: "1rem" }}>
          <Button variant="primary" size="sm" leadingIcon={CheckSquare} onClick={handleAcknowledge}>
            Acknowledge Document
          </Button>
        </div>
      )}

      {alreadyAcked && (
        <div className="doc-drawer__ack-self">
          <CheckCircle size={13} strokeWidth={2} style={{ color: "var(--color-success,#16a34a)" }} />
          <span>You have acknowledged this document</span>
        </div>
      )}

      {acks.length === 0 ? (
        <p className="doc-drawer__empty">No acknowledgements recorded yet.</p>
      ) : (
        <div className="doc-drawer__ack-list">
          {acks.map(a => (
            <div key={a.id} className="doc-drawer__ack-item">
              <Avatar name={a.acknowledged_by} />
              <div className="doc-drawer__ack-body">
                <span className="doc-drawer__ack-name">{a.acknowledged_by}</span>
                <span className="doc-drawer__ack-meta">
                  {formatDate(a.acknowledged_at)}{a.version_id ? ` · v${a.version_id}` : ""}
                </span>
              </div>
              <CheckCircle size={14} strokeWidth={2} style={{ color: "var(--color-success,#16a34a)", flexShrink: 0 }} />
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// ── RelatedRecordsTab ──────────────────────────────────────────────────────────

function RelatedRecordsTab({ doc }: { doc: BoardDocument }) {
  const navigate       = useNavigate();
  const meetingReg     = useMeetingRegistry();
  const agendaReg      = useAgendaRegistry();
  const agendaLinkReg  = useAgendaDocumentLinkRegistry();
  const linkReg        = useBoardPackDocumentLinkRegistry();
  const docId          = doc.doc_id ?? doc.id;

  const meeting = useMemo(() =>
    doc.related_meeting
      ? meetingReg.items.find(m =>
          m.meeting_id === doc.related_meeting ||
          doc.related_meeting.startsWith(m.meeting_id),
        ) ?? null
      : null,
    [doc.related_meeting, meetingReg.items],
  );

  const agenda = useMemo(() =>
    doc.related_agenda
      ? agendaReg.items.find(a =>
          a.agenda_id === doc.related_agenda ||
          doc.related_agenda.startsWith(a.agenda_id),
        ) ?? null
      : null,
    [doc.related_agenda, agendaReg.items],
  );

  // Agendas linked via AgendaDocumentLink registry
  const linkedAgendaIds = useMemo(
    () => agendaLinkReg.items.filter(l => l.document_id === docId).map(l => l.agenda_id),
    [agendaLinkReg.items, docId],
  );
  const linkedAgendas = useMemo(
    () => linkedAgendaIds.map(aid => agendaReg.items.find(a => a.id === aid || a.agenda_id === aid)).filter(Boolean),
    [linkedAgendaIds, agendaReg.items],
  );

  const packLinks = linkReg.items.filter(
    l => l.document_id === docId && l.link_status !== "removed",
  );

  const hasAny = meeting || agenda || linkedAgendas.length > 0 || packLinks.length > 0;

  return (
    <Section title="Related Records" padded>
      {!hasAny && (
        <p className="doc-drawer__empty">No related records linked to this document.</p>
      )}
      {meeting && (
        <div className="doc-drawer__related-item">
          <span className="doc-drawer__related-type">Meeting</span>
          <button type="button" className="doc-drawer__related-name"
            onClick={() => navigate("/meetings/all-meetings")}>
            {meeting.meeting_title}
            <ChevronRight size={12} strokeWidth={2.5} />
          </button>
          <span className="doc-drawer__related-meta">{meeting.meeting_id}</span>
        </div>
      )}
      {agenda && (
        <div className="doc-drawer__related-item">
          <span className="doc-drawer__related-type">Agenda Item</span>
          <button type="button" className="doc-drawer__related-name"
            onClick={() => navigate("/agenda-documents/agenda-management")}>
            {(agenda as { agenda_title?: string; agenda_id?: string }).agenda_title ?? agenda.agenda_id}
            <ChevronRight size={12} strokeWidth={2.5} />
          </button>
          <span className="doc-drawer__related-meta">{agenda.agenda_id}</span>
        </div>
      )}
      {linkedAgendas.map(a => {
        if (!a) return null;
        const title = (a as { agenda_title?: string }).agenda_title ?? (a as { agenda_id?: string }).agenda_id ?? "Agenda Item";
        const id    = (a as { agenda_id?: string }).agenda_id ?? "";
        return (
          <div key={id} className="doc-drawer__related-item">
            <span className="doc-drawer__related-type">Linked Agenda</span>
            <button type="button" className="doc-drawer__related-name"
              onClick={() => navigate("/agenda-documents/agenda-management")}>
              {title}
              <ChevronRight size={12} strokeWidth={2.5} />
            </button>
            <span className="doc-drawer__related-meta">{id}</span>
          </div>
        );
      })}
      {packLinks.map(link => (
        <div key={link.id} className="doc-drawer__related-item">
          <span className="doc-drawer__related-type">Board Pack</span>
          <button type="button" className="doc-drawer__related-name"
            onClick={() => navigate("/agenda-documents/board-packs")}>
            {link.board_pack_name}
            <ChevronRight size={12} strokeWidth={2.5} />
          </button>
          <span className="doc-drawer__related-meta">v{link.linked_version_id}</span>
        </div>
      ))}
    </Section>
  );
}

// ── SaveNotePanel ──────────────────────────────────────────────────────────────

function SaveNotePanel({
  doc,
  onClose,
}: {
  doc: BoardDocument;
  onClose: () => void;
}) {
  const noteReg     = usePrivateNoteRegistry();
  const currentUser = useCurrentUser();
  const [title,   setTitle]   = useState("");
  const [body,    setBody]    = useState("");
  const [quote,   setQuote]   = useState("");
  const [saving,  setSaving]  = useState(false);

  const handleSave = () => {
    if (!body.trim()) { toast.error("Note content is required."); return; }
    setSaving(true);
    const noteId = `NOTE-${Date.now()}`;
    noteReg.add({
      id: noteId, note_id: noteId,
      note_title:      title.trim() || `Note on ${doc.doc_name}`,
      note_content:    quote ? `> ${quote}\n\n${body.trim()}` : body.trim(),
      related_meeting: doc.related_meeting ?? "",
      agenda_item:     doc.related_agenda  ?? "",
      document_ref:    doc.doc_id ?? doc.id,
      page_reference:  "",
      tags:            "",
      bookmarked:      "No",
      shared_with:     "",
      created_by:      currentUser.name,
      created_at:      new Date().toISOString(),
    });
    toast.success("Private note saved.");
    setSaving(false);
    onClose();
  };

  return (
    <div className="doc-drawer__note-panel">
      <div className="doc-drawer__note-panel-header">
        <StickyNote size={13} strokeWidth={1.75} />
        <span>Save Private Note</span>
        <button type="button" className="doc-drawer__head-close" onClick={onClose} aria-label="Close">
          <X size={13} strokeWidth={2.5} />
        </button>
      </div>
      <p className="doc-drawer__note-privacy">
        Private — visible only to you. Not shared with other users.
      </p>
      <AppTextField id="note-title" label="Title (optional)"
        value={title} onChange={setTitle}
        placeholder={`Note on ${doc.doc_name}`}
      />
      <AppTextField id="note-quote" label="Selected text (optional)"
        value={quote} onChange={setQuote}
        placeholder="Paste a passage from the document to reference"
      />
      <AppTextArea id="note-body" label="Note" required
        value={body} onChange={setBody} rows={4}
        placeholder="Your private annotation…"
      />
      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
        <Button variant="ghost"   size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" loading={saving} onClick={handleSave}>Save Note</Button>
      </div>
    </div>
  );
}

// ── DocumentDetailsDrawer ──────────────────────────────────────────────────────

interface DocumentDetailsDrawerProps {
  open: boolean;
  onClose: () => void;
  document: BoardDocument | null;
}

const DRAWER_TABS = [
  { id: "overview",  label: "Overview"  },
  { id: "access",    label: "Access"    },
  { id: "workflow",  label: "Workflow"  },
  { id: "versions",  label: "Versions"  },
  { id: "comments",  label: "Comments"  },
  { id: "activity",  label: "Activity"  },
];

export function DocumentDetailsDrawer({ open, onClose, document: doc }: DocumentDetailsDrawerProps) {
  const docReg      = useDocumentRegistry();
  const can         = useDocPermissions();
  const versionReg  = useDocumentVersionRegistry();
  const approvalReg = useDocumentApprovalRegistry();
  const auditReg    = useAuditEventRegistry();
  const threadReg   = useDocumentCommentRegistry();
  const ackReg      = useDocumentAcknowledgementRegistry();
  const linkReg     = useBoardPackDocumentLinkRegistry();
  const navigate    = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [noteOpen,  setNoteOpen]  = useState(false);
  const [repo,      setRepo]      = useState<DocumentRepository | null>(null);
  const prevDocId   = useRef<string | null>(null);

  useEffect(() => { setRepo(getDocumentRepository()); }, []);

  useEffect(() => {
    const newId = doc?.id ?? null;
    if (open && newId !== prevDocId.current) {
      setActiveTab("overview");
      setNoteOpen(false);
      prevDocId.current = newId;
    }
  }, [open, doc?.id]);

  const docId         = doc?.doc_id ?? doc?.id ?? "";
  const currentStatus = doc?.approval_status ?? "Draft";
  const transitions   = STAGE_TRANSITIONS[currentStatus] ?? [];

  // ── Lifted workflow transition handler ─────────────────────────────────────
  const handleTransition = useCallback((t: TransitionDef) => {
    if (!doc) return;
    if (!can(t.permId)) { toast.error("Insufficient permissions."); return; }
    const now    = new Date().toISOString();
    const curVer = parseFloat(doc.version ?? "1.0");
    const newVer = (curVer + 0.1).toFixed(1);
    let snapshotId: string | undefined;

    if (t.locks || t.snapshotLabel) {
      snapshotId = `DV-${Date.now()}`;
      versionReg.add({
        id: snapshotId, version_id: snapshotId,
        document_id: docId,
        document_name: doc.doc_name,
        version_number: t.locks ? newVer : (doc.version ?? "1.0"),
        change_summary: t.snapshotLabel ?? `Stage: ${t.to}`,
        created_by: "current_user", created_at: now,
        approval_status: t.to,
        snapshot_type: t.locks ? "manual" : "auto",
        is_named: !!t.snapshotLabel, version_name: t.snapshotLabel,
      });
    }

    if ((t.to === "Approved" || t.to === "Changes Requested" || t.to === "Draft") && currentStatus === "Pending Approval") {
      const aprId = `APR-${Date.now()}`;
      approvalReg.add({
        id: aprId, approval_id: aprId,
        document_id: docId,
        version_id: doc.locked_version_id ?? doc.current_version_id ?? doc.id,
        stage: currentStatus, approver: "current_user", approver_role: "Approver",
        decision: t.to === "Approved" ? "approved" : "rejected",
        decided_at: now, requested_at: now, requested_by: "current_user",
      });
    }

    const patch: Partial<BoardDocument> = { approval_status: t.to, last_modified_at: now };
    if (t.locks && snapshotId) { patch.is_locked = true; patch.locked_version_id = snapshotId; patch.version = newVer; }
    if (t.unlocks) { patch.is_locked = false; patch.locked_version_id = undefined; }
    docReg.update(doc.id, patch);

    const aud = newAuditId();
    auditReg.add({
      id: aud, event_id: aud,
      entity_type: "Document", entity_id: docId,
      action: t.label, actor: "current_user", actor_role: "User",
      timestamp: now, ip_address: "",
      details: `Status changed from "${currentStatus}" to "${t.to}"${t.locks ? " — locked for approval" : t.unlocks ? " — unlocked" : ""}`,
      approval_status: "Logged",
    });
    toast.success(`Document moved to "${t.to}".`);
  }, [doc, docId, currentStatus, can, docReg, versionReg, approvalReg, auditReg]);

  const handleVersionRestored = useCallback((newVersion: string) => {
    if (!doc) return;
    docReg.update(doc.id, { version: newVersion, approval_status: "Draft", last_modified_at: new Date().toISOString() });
  }, [doc, docReg]);

  const handleOpenDocument = useCallback(() => {
    if (!doc) return;
    navigate(`/agenda-documents/document-library/${doc.doc_id ?? doc.id}/editor`);
  }, [doc, navigate]);

  const handleDownload = useCallback(async () => {
    if (!doc?.file_name) return;
    try {
      const file = await documentContentStore.getOriginalFile(docId);
      if (!file) { toast.error("Original file not found."); return; }
      const url = URL.createObjectURL(file);
      const a   = document.createElement("a");
      a.href = url; a.download = doc.file_name; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Download failed."); }
  }, [doc, docId]);

  // ── Workspace type and action labels ───────────────────────────────────────
  const wsType = doc ? getDocumentWorkspaceType(doc) : "rich-text";

  // Primary open-document action label — format and status aware
  const editorLabel = doc ? (() => {
    if (wsType === "pdf" || wsType === "image" || wsType === "unsupported") return "Open Viewer";
    if (wsType === "spreadsheet") return "Open Spreadsheet";
    // Rich-text: editing availability depends on permission and lock state
    if (!can("doc_edit") || doc.is_locked) return "Open Editor";
    // Draft or changes-requested → user is actively working on this
    if (doc.approval_status === "Draft" || doc.approval_status === "Changes Requested") return "Continue Editing";
    return "Open Editor";
  })() : "Open Editor";

  // Primary workflow action for footer; destructive for secondary
  const workflowPrimary     = transitions.find(t => t.variant === "primary"   && can(t.permId)) ?? null;
  const workflowDestructive = transitions.find(t => (t.variant === "danger" || (t.variant === "secondary" && (t.label.startsWith("Reject") || t.label.startsWith("Request")))) && can(t.permId)) ?? null;

  // ── Tab counts ─────────────────────────────────────────────────────────────
  const versionCount     = versionReg.items.filter(v => v.document_id === docId).length;
  const openCommentCount = threadReg.items.filter(t => t.document_id === docId && t.status !== "resolved").length;
  const packLinkCount    = linkReg.items.filter(l => l.document_id === docId && l.link_status !== "removed").length;
  const ackCount         = ackReg.items.filter(a => a.document_id === docId).length;

  void packLinkCount; void ackCount; // consumed by sub-components

  const tabs = DRAWER_TABS.map(t => ({
    id: t.id, label: t.label,
    count: t.id === "versions" ? (versionCount     > 0 ? versionCount     : undefined)
         : t.id === "comments" ? (openCommentCount > 0 ? openCommentCount : undefined)
         : undefined,
  }));

  const DocIcon = doc ? getDocFileIcon(doc) : FileText;

  // ── Footer ─────────────────────────────────────────────────────────────────
  // Buttons sit directly in the overlay footer (flex-wrap row) — no grid wrapper.
  const footer = doc ? (
    <>
      {can("doc_view") && (
        <Button variant="primary" size="md" leadingIcon={ExternalLink} onClick={handleOpenDocument}>
          {editorLabel}
        </Button>
      )}
      {can("doc_download") && doc.file_name && (
        <Button variant="secondary" size="md" leadingIcon={Download} onClick={handleDownload}>
          Download
        </Button>
      )}
      <Button
        variant="ghost" size="md" leadingIcon={StickyNote}
        onClick={() => setNoteOpen(v => !v)}
        aria-pressed={noteOpen}
      >
        Save Note
      </Button>
      {(workflowPrimary || workflowDestructive) && (
        <>
          {/* Full-width divider forces next items onto a new flex row */}
          <div style={{ flex: "1 1 100%", height: 1, background: "var(--color-border)", margin: "0 -8px" }} />
          {workflowDestructive && (
            <Button variant="ghost" size="md" onClick={() => handleTransition(workflowDestructive)}>
              {workflowDestructive.label}
            </Button>
          )}
          {workflowPrimary && (
            <Button variant="secondary" size="md" onClick={() => handleTransition(workflowPrimary)}>
              {workflowPrimary.label}
            </Button>
          )}
        </>
      )}
    </>
  ) : undefined;

  return (
    <ResponsiveOverlay
      open={open && doc !== null}
      onClose={onClose}
      title="Document Details"
      footer={footer}
      desktopWidth="480px"
    >
      {doc && (
        <>
          {/* ── Drawer summary ── */}
          <div className="drawer-summary">
            <div className="drawer-summary__icon">
              <DocIcon size={20} strokeWidth={1.5} />
            </div>
            <div className="drawer-summary__main">
              <div className="drawer-summary__name">{doc.doc_name}</div>
              <div className="drawer-summary__meta">
                {[
                  doc.doc_id,
                  doc.version ? `v${doc.version}` : null,
                  doc.file_format ? doc.file_format.toUpperCase() : null,
                ].filter(Boolean).join(" · ")}
              </div>
            </div>
            <div className="drawer-summary__status" style={{ display: "flex", alignItems: "center", gap: "0.375rem", flexShrink: 0 }}>
              {doc.approval_status && <StatusBadge value={doc.approval_status} />}
              {doc.is_locked && <Lock size={11} strokeWidth={2} style={{ color: "var(--color-warning,#d97706)" }} />}
            </div>
          </div>

          {/* ── Save Note panel ── */}
          {noteOpen && <SaveNotePanel doc={doc} onClose={() => setNoteOpen(false)} />}

          {/* ── Tabs ── */}
          <div className="doc-drawer__tabs">
            <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />
          </div>

          {/* ── Content ── */}
          <div className="doc-drawer__body" role="tabpanel">
            {activeTab === "overview" && (
              <>
                <OverviewTab doc={doc} />
                <BoardPacksTab doc={doc} can={can} />
                <RelatedRecordsTab doc={doc} />
              </>
            )}
            {activeTab === "access"   && <AccessTab doc={doc} repo={repo} can={can} />}
            {activeTab === "workflow" && (
              <>
                <WorkflowTab doc={doc} can={can} />
                <AcknowledgementsTab doc={doc} />
              </>
            )}
            {activeTab === "versions" && <VersionsTab doc={doc} can={can} onVersionRestored={handleVersionRestored} />}
            {activeTab === "comments" && <CommentsTab doc={doc} can={can} />}
            {activeTab === "activity" && <ActivityTab doc={doc} />}
          </div>
        </>
      )}
    </ResponsiveOverlay>
  );
}
