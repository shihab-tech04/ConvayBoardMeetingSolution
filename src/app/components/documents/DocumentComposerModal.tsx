/**
 * DocumentComposerModal — unified "Add Document" composer.
 * Sources: Upload File · Blank Document · Use Template (only when templates exist).
 * Owner field uses canonical BmsUser selector; all other metadata optional under "More Details".
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { toast } from "sonner";
import {
  FilePlus, UploadCloud, LayoutTemplate,
  FileText, ChevronDown, ChevronRight,
  File as FileIcon, Info, X as XIcon,
} from "lucide-react";
import { AppModal } from "../modals/AppModal";
import { Button } from "../buttons/Button";
import { AppFileUpload } from "../forms/AppFileUpload";
import { AppTextField } from "../forms/AppTextField";
import { AppSelectField } from "../forms/AppSelectField";
import { AppDateField } from "../forms/AppDateField";
import { AppTextArea } from "../forms/AppTextArea";
import { SToggle } from "../forms/SToggle";
import {
  useDocumentRegistry,
  useDocumentVersionRegistry,
  useAuditEventRegistry,
  useMeetingRegistry,
  useAgendaRegistry,
  useGovernanceRegistry,
  generateId,
  DOCUMENT_TYPES,
  CONFIDENTIALITY_LEVELS,
  TEMPLATE_BODIES,
} from "../../data/boardMeetingData";
import { useBmsUserRegistry } from "../../data/bmsUsers";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { documentContentStore } from "../../services/repositories/documentContentStore";
import { useSearchParams } from "react-router";

// ── Types ──────────────────────────────────────────────────────────────────────

type Source = "upload" | "blank" | "template";

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(1)} ${units[i]}`;
}

function newAuditId() { return `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; }

/** Safely infer document type from file extension — only when unambiguous. */
function guessDocType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (["xls", "xlsx", "xlsm", "csv", "tsv"].includes(ext)) return "Supporting Document";
  if (["ppt", "pptx"].includes(ext))                         return "Supporting Document";
  return "";
}

// ── Form state ─────────────────────────────────────────────────────────────────

interface ComposerForm {
  doc_name:                 string;
  doc_type:                 string;
  owner_user_id:            string;   // canonical BmsUser.user_id
  owner:                    string;   // display name (derived, kept for registry compat)
  description:              string;
  confidentiality:          string;
  // More Details (collapsed by default)
  tags:                     string;
  related_meeting:          string;
  related_agenda:           string;
  governance_body:          string;
  effective_date:           string;
  expiry_date:              string;
  acknowledgement_required: boolean;
  // Template-specific placeholders
  template_id:    string;
  chairperson:    string;
  secretary:      string;
  agenda_ref:     string;
  resolution_ref: string;
}

// ── Props ──────────────────────────────────────────────────────────────────────

export interface DocumentComposerModalProps {
  open:           boolean;
  onClose:        () => void;
  initialSource?: Source;
  /** Pre-select an agenda context (shows context banner; caller must handle linking via onCreated). */
  initialAgendaId?:          string | null;
  initialMeetingId?:         string | null;
  initialGovernanceBodyId?:  string | null;
  /** Which module opened the composer ("agenda", "meeting", "library"). */
  sourceModule?:             string;
  /** Called with the new document ID after successful creation. */
  onCreated?:     (docId: string) => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function DocumentComposerModal({
  open,
  onClose,
  initialSource = "upload",
  initialAgendaId,
  initialMeetingId,
  initialGovernanceBodyId,
  sourceModule,
  onCreated,
}: DocumentComposerModalProps) {
  const registry        = useDocumentRegistry();
  const versionRegistry = useDocumentVersionRegistry();
  const auditRegistry   = useAuditEventRegistry();
  const meetingReg      = useMeetingRegistry();
  const agendaReg       = useAgendaRegistry();
  const govReg          = useGovernanceRegistry();
  const bmsUserReg      = useBmsUserRegistry();
  const currentUser     = useCurrentUser();
  const [, setSearchParams] = useSearchParams();

  // ── Active users for owner selector ─────────────────────────────────────────

  const activeUsers = useMemo(
    () => bmsUserReg.items.filter(u => u.is_active !== false),
    [bmsUserReg.items],
  );

  const userNameOpts = useMemo(() => activeUsers.map(u => u.name), [activeUsers]);

  // Resolve entity id ↔ name (BmsUser.id is the stable canonical ID from EntityRecord)
  const uId    = useCallback((name: string): string => activeUsers.find(u => u.name === name)?.id ?? "", [activeUsers]);
  const uLabel = useCallback((uid: string):  string => activeUsers.find(u => u.id === uid)?.name ?? "",  [activeUsers]);
  const uInfo  = useCallback((uid: string) => activeUsers.find(u => u.id === uid), [activeUsers]);

  // Find current user's id for default owner
  const defaultOwnerUserId: string = useMemo(
    () => activeUsers.find(u => u.name === currentUser.name || u.employee_id === currentUser.employeeId)?.id ?? "",
    [activeUsers, currentUser.name, currentUser.employeeId],
  );

  // ── Initial form factory (re-computed when context props change) ─────────────

  const makeInitialForm = useCallback((): ComposerForm => {
    const meetingLabel = initialMeetingId
      ? meetingReg.items.find(m => m.meeting_id === initialMeetingId)
          ? `${initialMeetingId} — ${meetingReg.items.find(m => m.meeting_id === initialMeetingId)?.meeting_title ?? ""}`
          : initialMeetingId
      : "";
    const govLabel = initialGovernanceBodyId
      ? govReg.items.find(g => g.id === initialGovernanceBodyId || g.body_name === initialGovernanceBodyId)?.body_name ?? initialGovernanceBodyId
      : "";
    const agendaLabel = initialAgendaId ?? "";
    return {
      doc_name: "", doc_type: "",
      owner_user_id: defaultOwnerUserId,
      owner: currentUser.name ?? "",
      description: "", confidentiality: "Internal",
      tags: "",
      related_meeting: meetingLabel,
      related_agenda: agendaLabel,
      governance_body: govLabel,
      effective_date: "", expiry_date: "",
      acknowledgement_required: false,
      template_id: "", chairperson: "", secretary: "", agenda_ref: "", resolution_ref: "",
    };
  }, [defaultOwnerUserId, currentUser.name, initialMeetingId, initialGovernanceBodyId, initialAgendaId, meetingReg.items, govReg.items]);

  // ── State ────────────────────────────────────────────────────────────────────

  const [source,           setSource]           = useState<Source>(initialSource);
  const [files,            setFiles]            = useState<File[]>([]);
  const [form,             setForm]             = useState<ComposerForm>(makeInitialForm);
  const [busy,             setBusy]             = useState(false);
  const [moreOpen,         setMoreOpen]         = useState(false);
  const [tmplContextOpen,  setTmplContextOpen]  = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // Re-seed form when modal opens with different context
  useEffect(() => {
    if (open) {
      setForm(makeInitialForm());
      setSource(initialSource);
      setFiles([]);
      setBusy(false);
      setMoreOpen(false);
      setTmplContextOpen(false);
      setShowCloseConfirm(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = useCallback(
    <K extends keyof ComposerForm>(key: K, value: ComposerForm[K]) =>
      setForm(p => ({ ...p, [key]: value })),
    [],
  );

  // ── Templates ────────────────────────────────────────────────────────────────

  const templateDocs = useMemo(
    () => registry.items.filter(d => d.is_template),
    [registry.items],
  );
  const hasTemplates = templateDocs.length > 0;

  // ── Meeting options ──────────────────────────────────────────────────────────

  const meetingOptions = useMemo(
    () => meetingReg.items.map(m => `${m.meeting_id} — ${m.meeting_title}`),
    [meetingReg.items],
  );

  // Agenda options, filtered by selected meeting
  const agendaSelectOptions = useMemo(() => {
    const meetingId = form.related_meeting.split(" — ")[0];
    const candidates = meetingId
      ? agendaReg.items.filter(a => String(a.meeting_id ?? "").startsWith(meetingId))
      : agendaReg.items;
    return [
      { value: "", label: "" },
      ...candidates.map(a => ({ value: a.agenda_id, label: `${a.agenda_id} — ${a.agenda_title}` })),
    ];
  }, [agendaReg.items, form.related_meeting]);

  // ── Dirty check ──────────────────────────────────────────────────────────────

  const isDirty = useCallback(() =>
    files.length > 0 ||
    form.doc_name.trim() !== "" ||
    form.doc_type       !== "" ||
    form.template_id    !== "",
  [files, form.doc_name, form.doc_type, form.template_id]);

  // ── Close handling ───────────────────────────────────────────────────────────

  function resetAndClose() {
    setFiles([]);
    setForm(makeInitialForm());
    setSource(initialSource);
    setBusy(false);
    setMoreOpen(false);
    setTmplContextOpen(false);
    setShowCloseConfirm(false);
    onClose();
  }

  function tryClose() {
    if (isDirty()) {
      setShowCloseConfirm(true);
    } else {
      resetAndClose();
    }
  }

  // ── Owner helpers ─────────────────────────────────────────────────────────────

  function handleOwnerChange(name: string) {
    const uid = uId(name);
    setForm(p => ({ ...p, owner_user_id: uid, owner: name }));
  }

  // Derive owner name for saving
  function resolvedOwnerName() {
    return uLabel(form.owner_user_id) || form.owner || currentUser.name || "System";
  }

  // ── Lifecycle types ───────────────────────────────────────────────────────────

  const LIFECYCLE_TYPES = new Set(["Policy", "Charter", "Terms of Reference", "Framework", "Circular", "Controlled Document"]);
  const showLifecycle   = LIFECYCLE_TYPES.has(form.doc_type);

  // ── Context banner ───────────────────────────────────────────────────────────

  const contextAgenda = initialAgendaId
    ? agendaReg.items.find(a => a.agenda_id === initialAgendaId || a.id === initialAgendaId)
    : null;

  // ── Submit: blank ─────────────────────────────────────────────────────────────

  const handleSubmitBlank = useCallback(async () => {
    if (!form.doc_name.trim()) { toast.error("Document name is required."); return; }
    if (!form.doc_type)        { toast.error("Document type is required."); return; }
    setBusy(true);
    try {
      const now    = new Date().toISOString();
      const docId  = generateId("DOC", registry.items.map(d => d.doc_id));
      const meetId = form.related_meeting.split(" — ")[0];
      const owner  = resolvedOwnerName();
      await documentContentStore.putEditorContent(docId, JSON.stringify({ type: "doc", content: [] }));
      registry.add({
        id: docId, doc_id: docId, doc_number: docId,
        doc_name:                 form.doc_name.trim(),
        doc_type:                 form.doc_type,
        related_meeting:          meetId,
        related_agenda:           form.related_agenda,
        owner,
        version:                  "1.0",
        confidentiality:          form.confidentiality || "Internal",
        effective_date:           form.effective_date,
        expiry_date:              form.expiry_date,
        acknowledgement_required: form.acknowledgement_required ? "Yes" : "No",
        approval_status:          "Draft",
        created_at:               now,
        content_type:             "editor",
        tags:                     form.tags,
      });
      const vId = `DV-${Date.now()}`;
      versionRegistry.add({
        id: vId, version_id: vId, document_id: docId,
        document_name:  form.doc_name.trim(), version_number: "1.0",
        change_summary: "Document created", created_by: owner,
        created_at: now, approval_status: "Draft",
        snapshot_type: "manual", is_named: true,
      });
      const aid = newAuditId();
      auditRegistry.add({
        id: aid, event_id: aid,
        entity_type: "Document", entity_id: docId,
        action: "Document created", actor: owner, actor_role: "User",
        timestamp: now, ip_address: "", details: form.doc_name.trim(), approval_status: "Logged",
      });
      toast.success(`"${form.doc_name.trim()}" created.`);
      onCreated?.(docId);
      setSearchParams(p => { const n = new URLSearchParams(p); n.set("view", docId); return n; });
      resetAndClose();
    } catch { toast.error("Could not create document. Please try again."); }
    finally { setBusy(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, registry, versionRegistry, auditRegistry, onCreated, setSearchParams]);

  // ── Submit: upload ────────────────────────────────────────────────────────────

  const handleSubmitUpload = useCallback(async () => {
    if (!files.length)         { toast.error("Please select a file to upload."); return; }
    if (!form.doc_name.trim()) { toast.error("Document name is required."); return; }
    if (!form.doc_type)        { toast.error("Document type is required."); return; }
    setBusy(true);
    try {
      const file   = files[0];
      const now    = new Date().toISOString();
      const docId  = generateId("DOC", registry.items.map(d => d.doc_id));
      const ext    = file.name.split(".").pop()?.toUpperCase() ?? "";
      const meetId = form.related_meeting.split(" — ")[0];
      const owner  = resolvedOwnerName();
      // 1. Store file first — if this fails, nothing else is created
      await documentContentStore.putOriginalFile(docId, file);
      // 2. Metadata
      registry.add({
        id: docId, doc_id: docId, doc_number: docId,
        doc_name:                 form.doc_name.trim(),
        doc_type:                 form.doc_type,
        related_meeting:          meetId,
        related_agenda:           form.related_agenda,
        owner,
        version:                  "1.0",
        confidentiality:          form.confidentiality || "Internal",
        effective_date:           form.effective_date,
        expiry_date:              form.expiry_date,
        acknowledgement_required: form.acknowledgement_required ? "Yes" : "No",
        approval_status:          "Draft",
        created_at:               now,
        file_name:                file.name,
        file_format:              ext,
        mime_type:                file.type,
        file_size:                file.size,
        content_type:             "uploaded",
        tags:                     form.tags,
      });
      // 3. Version
      const vId = `DV-${Date.now()}`;
      versionRegistry.add({
        id: vId, version_id: vId, document_id: docId,
        document_name: form.doc_name.trim(), version_number: "1.0",
        change_summary: "Initial upload", created_by: owner,
        created_at: now, approval_status: "Draft",
        original_file_ref: file.name, file_size: file.size,
        snapshot_type: "manual", is_named: true,
      });
      // 4. Audit
      const aid = newAuditId();
      auditRegistry.add({
        id: aid, event_id: aid,
        entity_type: "Document", entity_id: docId,
        action: "Document uploaded", actor: owner, actor_role: "User",
        timestamp: now, ip_address: "",
        details: `${file.name} (${formatBytes(file.size)})`,
        approval_status: "Logged",
      });
      toast.success(`"${form.doc_name.trim()}" uploaded.`);
      // 5. Notify caller (caller handles agenda-document link via onCreated)
      onCreated?.(docId);
      setSearchParams(p => { const n = new URLSearchParams(p); n.set("view", docId); return n; });
      resetAndClose();
    } catch { toast.error("Upload failed. Please try again."); }
    finally { setBusy(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, form, registry, versionRegistry, auditRegistry, onCreated, setSearchParams]);

  // ── Submit: template ──────────────────────────────────────────────────────────

  const handleSubmitTemplate = useCallback(async () => {
    const tmpl = templateDocs.find(t => (t.doc_id ?? t.id) === form.template_id);
    if (!tmpl)               { toast.error("Select a template."); return; }
    if (!form.doc_name.trim()) { toast.error("Document name is required."); return; }
    setBusy(true);
    try {
      const now       = new Date().toISOString();
      const meetId    = form.related_meeting.split(" — ")[0];
      const meeting   = meetingReg.items.find(m => m.meeting_id === meetId);
      const mtTitle   = meeting?.meeting_title ?? form.related_meeting ?? "";
      const mtDate    = (meeting as { meeting_date?: string })?.meeting_date ?? "";
      const owner     = resolvedOwnerName();
      const baseName  = (tmpl.doc_name ?? "").replace(/ Template$/, "");
      const rawBody   = TEMPLATE_BODIES[baseName] ?? `<h1>${form.doc_name.trim()}</h1><p>Document content goes here.</p>`;
      const resolved  = rawBody
        .replace(/\{\{DOCUMENT_TITLE\}\}/g,    form.doc_name.trim())
        .replace(/\{\{MEETING_TITLE\}\}/g,     mtTitle)
        .replace(/\{\{MEETING_DATE\}\}/g,      mtDate)
        .replace(/\{\{GOVERNANCE_BODY\}\}/g,   form.governance_body  || "[Governance Body]")
        .replace(/\{\{CHAIRPERSON\}\}/g,       form.chairperson      || "[Chairperson]")
        .replace(/\{\{MEETING_SECRETARY\}\}/g, form.secretary        || "[Meeting Secretary]")
        .replace(/\{\{PREPARED_BY\}\}/g,       owner)
        .replace(/\{\{AGENDA_REF\}\}/g,        form.agenda_ref       || "[Agenda Reference]")
        .replace(/\{\{RESOLUTION_REF\}\}/g,    form.resolution_ref   || "[Resolution Reference]");

      const docId = generateId("DOC", registry.items.map(d => d.doc_id));
      await documentContentStore.putEditorContent(docId, resolved);
      registry.add({
        id: docId, doc_id: docId, doc_number: docId,
        doc_name:                 form.doc_name.trim(),
        doc_type:                 tmpl.doc_type,
        related_meeting:          meetId,
        related_agenda:           form.related_agenda || form.agenda_ref || "",
        owner, version: "1.0", confidentiality: form.confidentiality || "Internal",
        effective_date: "", expiry_date: "", acknowledgement_required: "No",
        approval_status: "Draft", created_at: now,
        content_type: "editor", is_template: false,
      });
      const vId = `DV-${Date.now()}`;
      versionRegistry.add({
        id: vId, version_id: vId, document_id: docId,
        document_name: form.doc_name.trim(), version_number: "1.0",
        change_summary: `Created from template: ${tmpl.doc_name}`,
        created_by: owner, created_at: now, approval_status: "Draft",
        snapshot_type: "manual", is_named: true,
      });
      const aid = newAuditId();
      auditRegistry.add({
        id: aid, event_id: aid,
        entity_type: "Document", entity_id: docId,
        action: "Document created from template", actor: owner, actor_role: "User",
        timestamp: now, ip_address: "", details: `Template: ${tmpl.doc_name}`,
        approval_status: "Logged",
      });
      toast.success(`"${form.doc_name.trim()}" created from template.`);
      onCreated?.(docId);
      setSearchParams(p => { const n = new URLSearchParams(p); n.set("view", docId); return n; });
      resetAndClose();
    } catch { toast.error("Could not create document from template."); }
    finally { setBusy(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, templateDocs, meetingReg.items, registry, versionRegistry, auditRegistry, onCreated, setSearchParams]);

  function handleSubmit() {
    if (source === "blank")    return handleSubmitBlank();
    if (source === "upload")   return handleSubmitUpload();
    if (source === "template") return handleSubmitTemplate();
  }

  const primaryLabel =
    source === "upload"   ? "Upload & Create" :
    source === "template" ? "Create from Template" :
    "Create Document";

  const selectedFile   = files[0] ?? null;
  const detectedFormat = selectedFile ? (selectedFile.name.split(".").pop()?.toUpperCase() ?? "") : "";

  // ── Owner display ─────────────────────────────────────────────────────────────

  const ownerUser = uInfo(form.owner_user_id);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <AppModal
      open={open}
      title="Add Document"
      size="lg"
      icon={<FilePlus size={18} strokeWidth={1.75} />}
      onClose={tryClose}
      footer={
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
          <Button variant="ghost" size="md" onClick={tryClose}>Cancel</Button>
          <Button variant="primary" size="md" loading={busy} onClick={handleSubmit} disabled={busy}>
            {primaryLabel}
          </Button>
        </div>
      }
    >
      <div className="doc-lib__form">

        {/* ── Source selector ── */}
        <div className="composer-source">
          {/* Upload File */}
          <button
            type="button"
            className={`composer-source__card${source === "upload" ? " composer-source__card--active" : ""}`}
            onClick={() => setSource("upload")}
          >
            <span className="composer-source__card-icon"><UploadCloud size={18} strokeWidth={1.75} /></span>
            <span className="composer-source__card-label">Upload File</span>
            <span className="composer-source__card-desc">PDF, DOCX, XLSX, or other supported file.</span>
          </button>

          {/* Blank Document */}
          <button
            type="button"
            className={`composer-source__card${source === "blank" ? " composer-source__card--active" : ""}`}
            onClick={() => setSource("blank")}
          >
            <span className="composer-source__card-icon"><FilePlus size={18} strokeWidth={1.75} /></span>
            <span className="composer-source__card-label">Blank Document</span>
            <span className="composer-source__card-desc">Start with an empty rich-text document.</span>
          </button>

          {/* Use Template — only shown when templates exist */}
          {hasTemplates && (
            <button
              type="button"
              className={`composer-source__card${source === "template" ? " composer-source__card--active" : ""}`}
              onClick={() => setSource("template")}
            >
              <span className="composer-source__card-icon"><LayoutTemplate size={18} strokeWidth={1.75} /></span>
              <span className="composer-source__card-label">Use Template</span>
              <span className="composer-source__card-desc">Create from a saved document template.</span>
            </button>
          )}
        </div>

        {/* ── Context banner — shown when opened from Agenda Builder ── */}
        {sourceModule === "agenda" && contextAgenda && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            padding: "10px 14px", borderRadius: 8,
            background: "color-mix(in srgb, var(--color-primary) 6%, var(--color-card))",
            border: "1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)",
            marginBottom: 2,
          }}>
            <Info size={14} style={{ color: "var(--color-primary)", flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: "0.78rem", fontWeight: 600, color: "var(--color-primary)" }}>
                Adding to agenda
              </p>
              <p style={{ margin: "2px 0 0", fontSize: "0.73rem", color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {contextAgenda.agenda_title || contextAgenda.agenda_id}
              </p>
            </div>
          </div>
        )}

        {/* ── Upload file picker ── */}
        {source === "upload" && (
          <div>
            <AppFileUpload
              id="composer-file"
              label="Document File"
              required
              value={files}
              onChange={newFiles => {
                setFiles(newFiles);
                if (newFiles.length > 0) {
                  // Auto-fill name from filename
                  if (!form.doc_name) {
                    const auto = newFiles[0].name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
                    set("doc_name", auto);
                  }
                  // Auto-suggest type if unambiguous
                  if (!form.doc_type) {
                    const guessed = guessDocType(newFiles[0].name);
                    if (guessed) set("doc_type", guessed);
                  }
                }
              }}
              maxFiles={1}
              maxSizeMB={50}
              accept={[".pdf", ".doc", ".docx", ".xls", ".xlsx", ".xlsm", ".ppt", ".pptx", ".odt", ".ods", ".odp", ".rtf", ".csv", ".tsv", ".txt"]}
              helper="PDF · DOCX · DOC · XLSX · XLS · XLSM · PPTX · PPT · ODT · ODS · ODP · RTF · CSV · TSV · TXT — up to 50 MB"
            />
            {selectedFile && (
              <div className="composer-file-info">
                <span className="composer-file-info__icon"><FileIcon size={13} strokeWidth={1.75} /></span>
                <span className="composer-file-info__name">{selectedFile.name}</span>
                {detectedFormat && <span className="composer-file-info__badge">{detectedFormat}</span>}
                <span className="composer-file-info__size">{formatBytes(selectedFile.size)}</span>
              </div>
            )}
          </div>
        )}

        {/* ── Template selector ── */}
        {source === "template" && (
          <AppSelectField
            id="composer-template"
            label="Template"
            required
            value={form.template_id}
            onChange={v => {
              const id = String(v);
              const t  = templateDocs.find(d => (d.doc_id ?? d.id) === id);
              setForm(p => ({
                ...p,
                template_id: id,
                doc_name: p.doc_name || (t ? t.doc_name.replace(/ Template$/, "") : ""),
                doc_type: t?.doc_type ?? p.doc_type,
              }));
            }}
            options={[
              { value: "", label: "Select a template…" },
              ...templateDocs.map(t => ({ value: t.doc_id, label: t.doc_name })),
            ]}
          />
        )}

        {/* ── Essential document fields ── */}
        <div className="doc-lib__form-grid">

          {/* Document Name — full width */}
          <div className="doc-lib__form-span">
            <AppTextField
              id="composer-doc-name"
              label="Document Name"
              required
              value={form.doc_name}
              onChange={v => set("doc_name", v)}
              placeholder="e.g. Annual Budget 2026–27"
              helper={source === "upload" ? "Auto-filled from the filename — edit as needed." : undefined}
            />
          </div>

          {/* Document Type */}
          <AppSelectField
            id="composer-doc-type"
            label="Document Type"
            required
            value={form.doc_type}
            onChange={v => setForm(p => ({ ...p, doc_type: String(v) }))}
            options={["", ...DOCUMENT_TYPES]}
          />

          {/* Confidentiality */}
          <AppSelectField
            id="composer-conf"
            label="Confidentiality"
            value={form.confidentiality}
            onChange={v => setForm(p => ({ ...p, confidentiality: String(v) }))}
            options={CONFIDENTIALITY_LEVELS}
          />

          {/* Document Owner — canonical user selector */}
          <div className="doc-lib__form-span">
            <AppSelectField
              id="composer-owner"
              label="Document Owner"
              required
              value={uLabel(form.owner_user_id) || form.owner}
              onChange={handleOwnerChange}
              options={["", ...userNameOpts]}
            />
            {ownerUser && (
              <p style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
                {[ownerUser.designation, ownerUser.org_unit ?? (ownerUser as { primary_org_unit_id?: string }).primary_org_unit_id].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>

          {/* Description — full width, optional */}
          <div className="doc-lib__form-span">
            <AppTextArea
              id="composer-desc"
              label="Description"
              value={form.description}
              onChange={v => set("description", v)}
              rows={2}
              helper="Optional — brief summary of the document."
            />
          </div>

        </div>

        {/* ── Template context placeholders (collapsed by default) ── */}
        {source === "template" && (
          <MoreSection
            label="Template Context"
            open={tmplContextOpen}
            onToggle={() => setTmplContextOpen(p => !p)}
          >
            <div className="doc-lib__form-grid">
              <AppTextField id="composer-chair"  label="Chairperson"       value={form.chairperson}    onChange={v => set("chairperson", v)}    placeholder="[Chairperson]" />
              <AppTextField id="composer-sec"    label="Meeting Secretary"  value={form.secretary}      onChange={v => set("secretary", v)}      placeholder="[Meeting Secretary]" />
              <AppTextField id="composer-agdref" label="Agenda Reference"   value={form.agenda_ref}     onChange={v => set("agenda_ref", v)}     placeholder="e.g. AGD-2026-0001" />
              <AppTextField id="composer-resref" label="Resolution Ref."    value={form.resolution_ref} onChange={v => set("resolution_ref", v)} placeholder="e.g. RES-2026-001" />
            </div>
            <p style={{ fontSize: "0.73rem", color: "var(--color-text-secondary)", margin: "8px 0 0" }}>
              These values replace placeholders in the template body. Leave blank to fill in later.
            </p>
          </MoreSection>
        )}

        {/* ── More Details (collapsed by default) ── */}
        <MoreSection
          label="More Details"
          open={moreOpen}
          onToggle={() => setMoreOpen(p => !p)}
        >
          <div className="doc-lib__form-grid">
            <AppSelectField
              id="composer-gov"
              label="Governance Body"
              value={form.governance_body}
              onChange={v => setForm(p => ({ ...p, governance_body: String(v) }))}
              options={["", ...govReg.items.map(g => g.body_name)]}
            />
            <AppSelectField
              id="composer-meeting"
              label="Related Meeting"
              value={form.related_meeting}
              onChange={v => setForm(p => ({ ...p, related_meeting: String(v), related_agenda: "" }))}
              options={["", ...meetingOptions]}
            />
            <div className="doc-lib__form-span">
              <AppSelectField
                id="composer-agenda"
                label="Related Agenda Item"
                value={form.related_agenda}
                onChange={v => set("related_agenda", String(v))}
                options={agendaSelectOptions}
              />
            </div>
            <AppTextField
              id="composer-tags"
              label="Tags"
              value={form.tags}
              onChange={v => set("tags", v)}
              placeholder="Comma-separated tags"
            />
            <div className="doc-lib__form-span">
              <SToggle
                id="composer-ack"
                label="Acknowledgement Required"
                checked={form.acknowledgement_required}
                onChange={v => set("acknowledgement_required", v)}
              />
            </div>
            {showLifecycle && (
              <>
                <AppDateField id="composer-eff" label="Effective Date" value={form.effective_date} onChange={v => set("effective_date", v)} />
                <AppDateField id="composer-exp" label="Expiry Date"    value={form.expiry_date}    onChange={v => set("expiry_date", v)} />
              </>
            )}
          </div>
        </MoreSection>

        {/* ── Unsaved-change confirmation ── */}
        {showCloseConfirm && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 60,
            background: "rgba(0,0,0,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: "inherit",
          }}>
            <div style={{
              background: "var(--color-card)", border: "1px solid var(--color-border)",
              borderRadius: 12, padding: "24px 28px", maxWidth: 360, width: "90%",
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            }}>
              <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--color-text-primary)", margin: "0 0 8px" }}>
                Discard changes?
              </p>
              <p style={{ fontSize: "0.83rem", color: "var(--color-text-secondary)", margin: "0 0 20px", lineHeight: 1.5 }}>
                You have unsaved information in this form. Closing now will discard it.
              </p>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Button variant="ghost" size="sm" onClick={() => setShowCloseConfirm(false)}>
                  Continue Editing
                </Button>
                <Button variant="destructive-subtle" size="sm" onClick={resetAndClose}>
                  Discard
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppModal>
  );
}

// ── More Details collapsible section ─────────────────────────────────────────

function MoreSection({
  label, open, onToggle, children,
}: { label: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="composer-section">
      <button
        type="button"
        className="composer-section__header"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className="composer-section__icon"><FileText size={14} strokeWidth={1.75} /></span>
        <span className="composer-section__title">{label}</span>
        <span className="composer-section__chevron">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>
      {open && <div className="composer-section__body">{children}</div>}
    </div>
  );
}
