import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  FileText, Plus, X, Eye, Search, CheckSquare, Square,
  ChevronUp, ChevronDown, MoreVertical, ClipboardList,
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Link2, Undo2, Redo2,
  Clock, Upload, BookOpen,
} from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  useAgendaRegistry,
  useDocumentRegistry,
  useAgendaDocumentLinkRegistry,
  generateId,
  type AgendaSubmission,
  type AgendaDocumentLink,
} from "../../data/boardMeetingData";
import { useBmsUserRegistry } from "../../data/bmsUsers";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { AppModal } from "../modals/AppModal";
import { AppTextField } from "../forms/AppTextField";
import { AppSelectField } from "../forms/AppSelectField";
import { AppTextArea } from "../forms/AppTextArea";
import { Button } from "../buttons/Button";
import { StatusBadge } from "../badges/StatusBadge";
import { UnifiedDocumentViewer } from "../documents/UnifiedDocumentViewer";
import { DocumentComposerModal } from "../documents/DocumentComposerModal";

// ── Constants ─────────────────────────────────────────────────────────────────

const PURPOSES    = ["For Information", "For Discussion", "For Review", "For Approval", "For Decision"];
const CONFIDENTIAL = ["Public", "Internal", "Confidential", "Restricted"];

// ── Duration helpers ──────────────────────────────────────────────────────────

function parseDurMin(s: string | undefined): number {
  if (!s) return 0;
  // Accept "30 min", "30", "1h 30m"
  const mMin = /(\d+)\s*min/i.exec(s);
  if (mMin) return parseInt(mMin[1], 10);
  const mH = /(\d+)\s*h/i.exec(s);
  if (mH) return parseInt(mH[1], 10) * 60;
  const n = parseInt(s, 10);
  return isNaN(n) ? 0 : n;
}

function fmtMin(m: number): string {
  if (m <= 0) return "—";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r > 0 ? `${h}h ${r}m` : `${h}h`;
}

// ── Rich-text toolbar ─────────────────────────────────────────────────────────

function RichToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl,  setLinkUrl]  = useState("");
  const linkInputRef = useRef<HTMLInputElement>(null);

  if (!editor) return null;

  function openLinkDialog() {
    const existing = editor.getAttributes("link").href as string | undefined;
    setLinkUrl(existing ?? "");
    setLinkOpen(true);
    setTimeout(() => linkInputRef.current?.select(), 40);
  }

  function applyLink() {
    const trimmed = linkUrl.trim();
    if (trimmed) {
      const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      editor.chain().focus().setLink({ href }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setLinkUrl(""); setLinkOpen(false);
  }
  const btn = (active: boolean, onClick: () => void, icon: React.ReactNode, title: string) => (
    <button
      type="button" title={title}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 28, height: 28, borderRadius: 4, border: "none", cursor: "pointer",
        background: active ? "var(--color-primary)" : "transparent",
        color: active ? "#fff" : "var(--color-text-secondary)",
      }}
    >
      {icon}
    </button>
  );
  const sep = <div style={{ width: 1, height: 16, background: "var(--color-border)", margin: "0 2px" }} />;
  return (<>
    <div style={{
      display: "flex", alignItems: "center", gap: 2, padding: "4px 8px",
      borderBottom: "1px solid var(--color-border)", flexWrap: "wrap", overflowX: "auto",
      background: "var(--color-muted)", flexShrink: 0,
    }}>
      {btn(editor.isActive("bold"),        () => editor.chain().focus().toggleBold().run(),        <Bold size={13} />,          "Bold")}
      {btn(editor.isActive("italic"),      () => editor.chain().focus().toggleItalic().run(),      <Italic size={13} />,        "Italic")}
      {btn(editor.isActive("underline"),   () => editor.chain().focus().toggleUnderline().run(),   <UnderlineIcon size={13} />, "Underline")}
      {sep}
      {btn(editor.isActive("bulletList"),  () => editor.chain().focus().toggleBulletList().run(),  <List size={13} />,          "Bullet list")}
      {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered size={13} />,   "Numbered list")}
      {sep}
      {btn(editor.isActive("link"), openLinkDialog, <Link2 size={13} />, "Link")}
      {sep}
      {btn(false, () => editor.chain().focus().undo().run(), <Undo2 size={13} />, "Undo")}
      {btn(false, () => editor.chain().focus().redo().run(), <Redo2 size={13} />, "Redo")}
    </div>

    {/* Inline link URL input — replaces window.prompt */}
    {linkOpen && (
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", borderBottom: "1px solid var(--color-border)", background: "var(--color-card)", flexWrap: "wrap" }}>
        <Link2 size={12} style={{ color: "var(--color-text-secondary)", flexShrink: 0 }} />
        <input
          ref={linkInputRef}
          type="url"
          value={linkUrl}
          onChange={e => setLinkUrl(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); applyLink(); } if (e.key === "Escape") { setLinkOpen(false); } }}
          placeholder="https://example.com"
          style={{ flex: 1, minWidth: 160, border: "1px solid var(--color-border)", borderRadius: 4, padding: "3px 8px", fontSize: "0.78rem", background: "var(--color-card)", color: "var(--color-foreground)", outline: "none" }}
        />
        <button type="button" onClick={applyLink} style={{ padding: "3px 10px", borderRadius: 4, border: "none", background: "var(--color-primary)", color: "#fff", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600 }}>
          {linkUrl.trim() ? "Apply" : "Remove"}
        </button>
        <button type="button" onClick={() => setLinkOpen(false)} style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid var(--color-border)", background: "transparent", fontSize: "0.75rem", cursor: "pointer", color: "var(--color-text-secondary)" }}>
          Cancel
        </button>
      </div>
    )}
  </>);
}

// ── Rich-text editor (keyed per child so Tiptap instance is fresh) ────────────

function ChildRichEditor({ value, onChange, placeholder }: {
  value: string; onChange: (html: string) => void; placeholder?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false, underline: false }),
      Underline,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: placeholder ?? "Enter details…" }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });
  const lastVal = useRef(value);
  useEffect(() => {
    if (editor && value !== lastVal.current && value !== editor.getHTML()) {
      editor.commands.setContent(value || "");
    }
    lastVal.current = value;
  }, [value, editor]);
  useEffect(() => () => { editor?.destroy(); }, [editor]);

  return (
    <div style={{
      border: "1px solid var(--color-border)", borderRadius: 6, overflow: "hidden",
      background: "var(--color-card)", minHeight: 180, display: "flex", flexDirection: "column",
    }}>
      <RichToolbar editor={editor} />
      <EditorContent
        editor={editor}
        style={{ flex: 1, padding: "10px 12px", fontSize: "0.85rem",
          color: "var(--color-foreground)", overflowY: "auto", cursor: "text" }}
      />
    </div>
  );
}

// ── Inline document picker panel ──────────────────────────────────────────────

function DocPickerPanel({ linkedIds, onToggle, onPreview, docReg }: {
  linkedIds: string[];
  onToggle: (docId: string) => void;
  onPreview: (docId: string) => void;
  docReg: ReturnType<typeof useDocumentRegistry>;
}) {
  const [search, setSearch] = useState("");
  const available = docReg.items.filter(d =>
    d.approval_status !== "Archived" &&
    (!search || (d.doc_name ?? d.file_name ?? "").toLowerCase().includes(search.toLowerCase()))
  );
  return (
    <div style={{ border: "1px solid var(--color-border)", borderRadius: 8, overflow: "hidden", marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "var(--color-muted)", borderBottom: "1px solid var(--color-border)" }}>
        <Search size={13} style={{ color: "var(--color-muted-foreground)", flexShrink: 0 }} />
        <input
          value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents…"
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: "0.82rem", color: "var(--color-foreground)" }}
        />
      </div>
      <div style={{ maxHeight: 220, overflowY: "auto" }}>
        {available.length === 0 ? (
          <div style={{ padding: "1.5rem", textAlign: "center", fontSize: "0.82rem", color: "var(--color-muted-foreground)" }}>No documents found.</div>
        ) : available.map(doc => {
          const checked = linkedIds.includes(doc.id);
          return (
            <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderBottom: "1px solid var(--color-border)", background: checked ? "color-mix(in srgb, var(--color-primary) 6%, transparent)" : "transparent" }}>
              <div onClick={() => onToggle(doc.id)} style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0, cursor: "pointer" }}>
                {checked
                  ? <CheckSquare size={13} style={{ color: "var(--color-primary)", flexShrink: 0 }} />
                  : <Square size={13} style={{ color: "var(--color-muted-foreground)", flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 500, color: "var(--color-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {doc.doc_name ?? doc.file_name ?? doc.id}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--color-muted-foreground)" }}>
                    {[doc.doc_type, doc.confidentiality, doc.version ? `v${doc.version}` : null, doc.approval_status].filter(Boolean).join(" · ")}
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => onPreview(doc.id)}
                style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: "var(--color-muted-foreground)", borderRadius: 4, display: "flex" }}>
                <Eye size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Form state types ──────────────────────────────────────────────────────────

interface ParentForm {
  title: string; purpose: string; summary: string;
  owner_user_id: string; confidentiality: string;
}

interface ChildForm {
  id: string | null;   // null = new child (not yet persisted)
  title: string; details: string; purpose: string;
  presenter_user_id: string; duration_mins: string;
}

const EMPTY_PARENT: ParentForm = {
  title: "", purpose: "For Information", summary: "", owner_user_id: "", confidentiality: "Internal",
};

const EMPTY_CHILD: ChildForm = {
  id: null, title: "", details: "", purpose: "For Information", presenter_user_id: "", duration_mins: "",
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  agendaId: string | null;         // null = new; string = editing parent agenda ID
  initialChildId?: string | null;  // pre-select a child in the builder
  /** Called after Save Agenda succeeds with the resulting agenda ID and status. */
  onSaved?: (result: { agendaId: string; status: string }) => void;
  sourceModule?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AgendaFormModal({ open, onClose, agendaId, initialChildId, onSaved }: Props) {
  const agendaReg   = useAgendaRegistry();
  const docReg      = useDocumentRegistry();
  const linkReg     = useAgendaDocumentLinkRegistry();
  const userReg     = useBmsUserRegistry();
  const currentUser = useCurrentUser();

  type Stage = "parent" | "builder";

  // Stage
  const [stage, setStage] = useState<Stage>("parent");

  // Saved parent agenda ID (set once parent is persisted)
  const [parentId, setParentId] = useState<string | null>(null);

  // Parent form
  const [pf,      setPf]      = useState<ParentForm>({ ...EMPTY_PARENT });
  const [pDirty,  setPDirty]  = useState(false);
  const [pErr,    setPErr]    = useState<Partial<Record<keyof ParentForm, string>>>({});

  // Child form state
  const [cf,         setCf]         = useState<ChildForm>({ ...EMPTY_CHILD });
  const [cDirty,     setCDirty]     = useState(false);
  const [cErr,       setCErr]       = useState<Partial<Record<string, string>>>({});
  const [childMode,  setChildMode]  = useState(false); // true = child form visible
  const [saving,     setSaving]     = useState(false);

  // Document picker / uploader
  const [pickerOpen,   setPickerOpen]   = useState(false);
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);

  // Child context menu
  const [menuChildId, setMenuChildId] = useState<string | null>(null);
  useEffect(() => {
    if (!menuChildId) return;
    const h = (e: MouseEvent) => {
      if (!(e.target as Element).closest(`[data-cmenu="${menuChildId}"]`)) setMenuChildId(null);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [menuChildId]);

  // Unsaved-child confirmation pending action
  const [pendingFn, setPendingFn] = useState<(() => void) | null>(null);

  // Close guard (parent or child dirty) — separate from child-switch guard
  const [showCloseGuard, setShowCloseGuard] = useState(false);

  // Child remove confirmation target
  const [removeTargetId, setRemoveTargetId] = useState<string | null>(null);

  // Ref used to pass the just-saved child ID into the uploader's onCreated callback
  // without relying on React state (which updates asynchronously)
  const pendingChildIdRef = useRef<string | null>(null);

  // ── User helpers ──────────────────────────────────────────────────────────

  const activeUsers = userReg.items.filter(u =>
    !["inactive", "deactivated", "archived"].includes(u.account_status ?? "")
  );
  const userNameOpts = ["— Select User —", ...activeUsers.map(u => u.name)];

  function uName(id: string) { return activeUsers.find(u => u.id === id)?.name ?? ""; }
  function uId(name: string) {
    if (!name || name.startsWith("—")) return "";
    return activeUsers.find(u => u.name === name)?.id ?? "";
  }
  function uLabel(id: string) {
    const u = activeUsers.find(x => x.id === id);
    return u ? u.name : "— Select User —";
  }

  // ── Reset on open ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    if (agendaId) {
      // Editing existing — load parent and jump to builder
      const existing = agendaReg.items.find(a => a.id === agendaId);
      const r = existing as unknown as Record<string, string> | undefined;
      setPf({
        title:           existing?.agenda_title ?? "",
        purpose:         existing?.purpose ?? "For Information",
        summary:         existing?.description ?? "",
        owner_user_id:   existing?.owner_user_id ?? r?.owner_user_id ?? "",
        confidentiality: existing?.confidentiality ?? "Internal",
      });
      setParentId(agendaId);
      setStage("builder");
      if (initialChildId) {
        const child = agendaReg.items.find(a => a.id === initialChildId);
        if (child) {
          const cr = child as unknown as Record<string, string>;
          setCf({
            id:                initialChildId,
            title:             child.agenda_title ?? "",
            details:           child.description ?? "",
            purpose:           child.purpose ?? "For Information",
            presenter_user_id: cr.presenter_user_id ?? "",
            duration_mins:     String(parseDurMin(child.estimated_duration) || ""),
          });
          setChildMode(true);
        } else {
          setCf({ ...EMPTY_CHILD });
          setChildMode(false);
        }
      } else {
        setCf({ ...EMPTY_CHILD });
        setChildMode(false);
      }
    } else {
      setPf({ ...EMPTY_PARENT });
      setParentId(null);
      setStage("parent");
      setCf({ ...EMPTY_CHILD });
      setChildMode(false);
    }
    setPDirty(false); setPErr({});
    setCDirty(false); setCErr({});
    setPickerOpen(false); setSaving(false);
    setPendingFn(null); setMenuChildId(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, agendaId]);

  // ── Derived values ────────────────────────────────────────────────────────

  const parentItems = agendaReg.items
    .filter(a => !a.parent_agenda_id)
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

  const savedParent = parentId ? agendaReg.items.find(a => a.id === parentId) ?? null : null;
  const parentNum   = savedParent ? parentItems.indexOf(savedParent) + 1 : parentItems.length + 1;
  const parentTitle = pf.title.trim() || savedParent?.agenda_title || "New Agenda";

  const children = parentId
    ? agendaReg.items
        .filter(a => a.parent_agenda_id === parentId && (a.agenda_level ?? 2) <= 2)
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    : [];

  const linkedDocIds = cf.id
    ? linkReg.items.filter(l => l.agenda_id === cf.id).map(l => l.document_id)
    : [];

  // ── Validation ────────────────────────────────────────────────────────────

  function validateParentFull(): boolean {
    const errs: Partial<Record<keyof ParentForm, string>> = {};
    if (!pf.title.trim())       errs.title         = "Agenda title is required.";
    if (!pf.purpose)            errs.purpose       = "Purpose is required.";
    if (!pf.owner_user_id)      errs.owner_user_id  = "Owner is required.";
    if (!pf.confidentiality)    errs.confidentiality = "Confidentiality is required.";
    setPErr(errs);
    return Object.keys(errs).length === 0;
  }

  function validateParentTitle(): boolean {
    if (!pf.title.trim()) { setPErr({ title: "Agenda title is required." }); return false; }
    setPErr({});
    return true;
  }

  function validateChild(): boolean {
    const errs: Record<string, string> = {};
    if (!cf.title.trim()) errs.title = "Title is required.";
    const bare = cf.details.replace(/<[^>]*>/g, "").trim();
    if (!bare)            errs.details = "Discussion details are required.";
    const dur = parseInt(cf.duration_mins, 10);
    if (!cf.duration_mins || isNaN(dur) || dur <= 0) errs.duration = "A valid duration in minutes is required.";
    if (!cf.purpose)      errs.purpose = "Purpose is required.";
    setCErr(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Persist parent ────────────────────────────────────────────────────────

  function persistParent(status = "Draft"): string {
    const now = new Date().toISOString();
    if (parentId && agendaReg.items.find(a => a.id === parentId)) {
      agendaReg.update(parentId, {
        agenda_title: pf.title.trim(), description: pf.summary, purpose: pf.purpose,
        owner_user_id: pf.owner_user_id, confidentiality: pf.confidentiality,
        approval_status: status, updated_at: now,
      } as never);
      return parentId;
    }
    const id = generateId("AGD", agendaReg.items.map(a => a.agenda_id));
    agendaReg.add({
      id, agenda_id: id, agenda_title: pf.title.trim(), agenda_reference: id,
      description: pf.summary,
      meeting_id: "", meeting_title: "", committee: "", meeting_type: "",
      agenda_category: "Governance", submitted_by: currentUser.name, owner_user_id: pf.owner_user_id,
      submitting_division: "", purpose: pf.purpose, proposed_decision: "", priority: "Normal",
      confidentiality: pf.confidentiality, estimated_duration: "", voting_required: "No",
      financial_impact: "", submission_date: now.slice(0, 10),
      approval_status: status, created_at: now, agenda_level: 1,
      display_order: parentItems.length + 1,
    } as never);
    setParentId(id);
    return id;
  }

  // ── Persist child ─────────────────────────────────────────────────────────

  function persistChild(pid: string): string {
    const now = new Date().toISOString();
    const dur = `${parseInt(cf.duration_mins, 10)} min`;
    if (cf.id && agendaReg.items.find(a => a.id === cf.id)) {
      agendaReg.update(cf.id, {
        agenda_title: cf.title.trim(), description: cf.details, purpose: cf.purpose,
        presenter_user_id: cf.presenter_user_id, estimated_duration: dur, updated_at: now,
      } as never);
      return cf.id;
    }
    const sibs = agendaReg.items.filter(a => a.parent_agenda_id === pid);
    const id = generateId("AGD", agendaReg.items.map(a => a.agenda_id));
    agendaReg.add({
      id, agenda_id: id, agenda_title: cf.title.trim(), agenda_reference: id,
      description: cf.details,
      meeting_id: "", meeting_title: "", committee: "", meeting_type: "",
      agenda_category: "Governance", submitted_by: currentUser.name,
      owner_user_id: savedParent?.owner_user_id ?? "",
      presenter_user_id: cf.presenter_user_id,
      submitting_division: "", purpose: cf.purpose, proposed_decision: "", priority: "Normal",
      confidentiality: savedParent?.confidentiality ?? "Internal",
      estimated_duration: dur, voting_required: "No", financial_impact: "",
      submission_date: now.slice(0, 10), approval_status: "Draft", created_at: now,
      parent_agenda_id: pid, agenda_level: 2, display_order: sibs.length + 1,
    } as never);
    return id;
  }

  // ── Document link helpers ─────────────────────────────────────────────────

  function linkDoc(docId: string, childAgendaId: string) {
    if (linkReg.items.some(l => l.agenda_id === childAgendaId && l.document_id === docId)) return;
    const existing = linkReg.items.filter(l => l.agenda_id === childAgendaId);
    const lid = generateId("ADL", linkReg.items.map(l => l.id));
    linkReg.add({
      id: lid, agenda_id: childAgendaId, document_id: docId,
      linked_at: new Date().toISOString(), linked_by: currentUser.name,
      is_primary: existing.length === 0, display_order: existing.length + 1,
    } as AgendaDocumentLink);
  }

  function unlinkDoc(docId: string, childAgendaId: string) {
    const l = linkReg.items.find(x => x.agenda_id === childAgendaId && x.document_id === docId);
    if (l) linkReg.remove(l.id);
  }

  function toggleDocLink(docId: string) {
    const cid = cf.id ?? pendingChildIdRef.current;
    if (!cid) return;
    if (linkReg.items.some(l => l.agenda_id === cid && l.document_id === docId))
      unlinkDoc(docId, cid);
    else
      linkDoc(docId, cid);
  }

  // ── Child reorder / remove ────────────────────────────────────────────────

  function moveChild(id: string, dir: "up" | "down") {
    const sibs = [...children];
    const idx = sibs.findIndex(c => c.id === id);
    const swi = dir === "up" ? idx - 1 : idx + 1;
    if (swi < 0 || swi >= sibs.length) return;
    agendaReg.update(id,         { display_order: swi + 1 } as never);
    agendaReg.update(sibs[swi].id, { display_order: idx + 1 } as never);
  }

  function removeChild(id: string) {
    linkReg.items.filter(l => l.agenda_id === id).forEach(l => linkReg.remove(l.id));
    agendaReg.remove(id);
    if (cf.id === id) { setCf({ ...EMPTY_CHILD }); setChildMode(false); setCDirty(false); }
  }

  // ── Guard child dirty ─────────────────────────────────────────────────────

  function withGuard(action: () => void) {
    if (cDirty) setPendingFn(() => action);
    else        action();
  }

  // ── Auto-draft: ensure child is persisted before attaching documents ──────
  // Returns the child ID (existing or newly created draft). Returns null when
  // validation fails so the caller can abort.

  function ensureChildDraft(): string | null {
    if (cf.id) return cf.id;
    if (!parentId) return null;
    if (!cf.title.trim()) {
      setCErr(e => ({ ...e, title: "Enter a title before attaching documents." }));
      return null;
    }
    // Auto-save as Draft — synchronous registry add, no async required
    const cid = persistChild(parentId);
    setCf(p => ({ ...p, id: cid }));
    setCDirty(false);
    pendingChildIdRef.current = cid;
    return cid;
  }

  function handleOpenUploader() {
    const cid = ensureChildDraft();
    if (!cid) return;
    pendingChildIdRef.current = cid;
    setUploaderOpen(true);
  }

  function handleOpenPicker() {
    const cid = ensureChildDraft();
    if (!cid) return;
    pendingChildIdRef.current = cid;
    setPickerOpen(p => !p);
  }

  // ── Open child form ───────────────────────────────────────────────────────

  function openChildForm(child: AgendaSubmission | null) {
    if (!child) {
      setCf({ ...EMPTY_CHILD }); setCDirty(false); setCErr({});
    } else {
      const r = child as unknown as Record<string, string>;
      setCf({
        id:                child.id,
        title:             child.agenda_title ?? "",
        details:           child.description ?? "",
        purpose:           child.purpose ?? "For Information",
        presenter_user_id: r.presenter_user_id ?? "",
        duration_mins:     String(parseDurMin(child.estimated_duration) || ""),
      });
      setCDirty(false); setCErr({});
    }
    setChildMode(true);
    setPickerOpen(false);
  }

  // ── Stage 1 actions ───────────────────────────────────────────────────────

  function handleSaveDraftParent() {
    if (!validateParentTitle()) return;
    persistParent("Draft"); setPDirty(false);
  }

  function handleContinue() {
    if (!validateParentFull()) return;
    persistParent("Draft"); setPDirty(false);
    setStage("builder");
  }

  // ── Child actions ─────────────────────────────────────────────────────────

  function doSaveChild(pid: string): string | null {
    if (!validateChild()) return null;
    setSaving(true);
    const cid = persistChild(pid);
    setSaving(false); setCDirty(false); setCErr({});
    return cid;
  }

  function handleSaveChild() {
    if (!parentId) return;
    const cid = doSaveChild(parentId);
    if (cid) { setCf(p => ({ ...p, id: cid })); }
  }

  function handleSaveAndAddAnother() {
    if (!parentId) return;
    const cid = doSaveChild(parentId);
    if (!cid) return;
    // Stay in child mode but reset to blank
    setCf({ ...EMPTY_CHILD }); setCDirty(false); setCErr({}); setPickerOpen(false);
  }

  function handleBackToBuilder() {
    setChildMode(false); setCf({ ...EMPTY_CHILD }); setCDirty(false); setCErr({});
    setPickerOpen(false);
  }

  // ── Builder actions ───────────────────────────────────────────────────────

  function handleSaveDraftBuilder() {
    if (!validateParentTitle()) return;
    if (parentId) {
      agendaReg.update(parentId, {
        agenda_title: pf.title.trim(), description: pf.summary, purpose: pf.purpose,
        owner_user_id: pf.owner_user_id, confidentiality: pf.confidentiality,
        updated_at: new Date().toISOString(),
      } as never);
    }
    setPDirty(false); onClose();
  }

  function handleSaveAgenda() {
    if (!parentId || !pf.title.trim()) { setPErr({ title: "Title is required." }); return; }
    if (children.length === 0) {
      toast.error("Add at least one child agenda before saving.");
      return;
    }
    const incomplete = children.filter(c => {
      const bare = (c.description ?? "").replace(/<[^>]*>/g, "").trim();
      return !c.agenda_title?.trim() || !bare || !parseDurMin(c.estimated_duration);
    });
    if (incomplete.length > 0) {
      toast.error(
        `${incomplete.length} child agenda${incomplete.length > 1 ? "s are" : " is"} missing required fields (title, discussion details, or duration).`,
      );
      return;
    }
    agendaReg.update(parentId, {
      agenda_title: pf.title.trim(), description: pf.summary, purpose: pf.purpose,
      owner_user_id: pf.owner_user_id, confidentiality: pf.confidentiality,
      updated_at: new Date().toISOString(),
    } as never);
    setPDirty(false);
    const savedStatus = agendaReg.items.find(a => a.id === parentId)?.approval_status ?? "Pending Approval";
    onSaved?.({ agendaId: parentId, status: savedStatus });
    onClose();
  }

  // ── Close guard ───────────────────────────────────────────────────────────

  function handleClose() {
    if (pDirty || cDirty) { setShowCloseGuard(true); return; }
    onClose();
  }

  // ── Footer content ────────────────────────────────────────────────────────

  // paddingRight: 52px keeps buttons clear of the floating help widget (bottom-right corner)
  const footerParent = (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: 8 }}>
      <Button variant="ghost" size="sm" onClick={handleClose}>Cancel</Button>
      <div style={{ display: "flex", gap: 8, paddingRight: 52 }}>
        <Button variant="secondary" size="sm" onClick={handleSaveDraftParent} disabled={!pf.title.trim()}>Save Draft</Button>
        <Button variant="primary" size="sm" onClick={handleContinue}>Continue to Builder</Button>
      </div>
    </div>
  );

  const footerChild = (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: 8 }}>
      <Button variant="ghost" size="sm" onClick={() => withGuard(handleBackToBuilder)}>← Back</Button>
      <div style={{ display: "flex", gap: 8, paddingRight: 52 }}>
        <Button variant="secondary" size="sm" onClick={handleSaveChild} disabled={saving}>Save</Button>
        <Button variant="primary" size="sm" onClick={handleSaveAndAddAnother} disabled={saving}>Save & Add Another</Button>
      </div>
    </div>
  );

  const footerBuilder = (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: 8 }}>
      <Button variant="ghost" size="sm" onClick={handleClose}>Close</Button>
      <div style={{ display: "flex", gap: 8, paddingRight: 52 }}>
        <Button variant="secondary" size="sm" onClick={handleSaveDraftBuilder}>Save Draft</Button>
        <Button variant="primary" size="sm" onClick={handleSaveAgenda}>Save Agenda</Button>
      </div>
    </div>
  );

  // ── Derived display ───────────────────────────────────────────────────────

  const previewDoc = previewDocId ? docReg.items.find(d => d.id === previewDocId) : null;
  const isChildMode = childMode;

  // ── Render ────────────────────────────────────────────────────────────────

  return (<>
    <AppModal
      open={open}
      onClose={handleClose}
      fullPage
      title={agendaId ? "Edit Agenda" : "Create Agenda"}
      subtitle={stage === "builder" ? `${parentNum}. ${parentTitle}` : undefined}
      icon={<ClipboardList size={16} />}
      hasUnsavedChanges={false}
      footer={
        stage === "parent" ? footerParent
        : isChildMode      ? footerChild
        : footerBuilder
      }
    >
      {/* ── STAGE 1: Parent details ──────────────────────────────────────── */}
      {stage === "parent" && (
        <div style={{ display: "flex", justifyContent: "center", padding: "2.5rem 1rem 2rem" }}>
          <div style={{ width: "100%", maxWidth: 560 }}>
            <div style={{ marginBottom: "1.75rem" }}>
              <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--color-text-primary)", margin: "0 0 5px" }}>Parent Agenda Details</h2>
              <p style={{ fontSize: "0.83rem", color: "var(--color-text-secondary)", margin: 0 }}>
                Add the main agenda details, then organize the discussion into child agenda items.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Title */}
              <div>
                <AppTextField
                  id="afm-title"
                  label="Agenda Title"
                  value={pf.title}
                  onChange={v => { setPf(p => ({ ...p, title: v })); setPDirty(true); setPErr(e => ({ ...e, title: undefined })); }}
                  required
                  helper="Enter the main subject that will contain the related discussion items."
                  autoComplete="off"
                />
                {pErr.title && <p style={{ color: "#ef4444", fontSize: "0.73rem", margin: "3px 0 0" }}>{pErr.title}</p>}
              </div>

              {/* Purpose */}
              <div>
                <AppSelectField
                  id="afm-purpose"
                  label="Purpose"
                  value={pf.purpose}
                  onChange={v => { setPf(p => ({ ...p, purpose: v })); setPDirty(true); setPErr(e => ({ ...e, purpose: undefined })); }}
                  options={PURPOSES}
                />
                {pErr.purpose && <p style={{ color: "#ef4444", fontSize: "0.73rem", margin: "3px 0 0" }}>{pErr.purpose}</p>}
              </div>

              {/* Background/Summary */}
              <AppTextArea
                id="afm-summary"
                label="Background or Summary"
                value={pf.summary}
                onChange={v => { setPf(p => ({ ...p, summary: v })); setPDirty(true); }}
                rows={3}
                placeholder="Optional — provide context or background for this agenda."
              />

              {/* Owner */}
              <div>
                <AppSelectField
                  id="afm-owner"
                  label="Agenda Owner"
                  value={uLabel(pf.owner_user_id)}
                  onChange={n => { setPf(p => ({ ...p, owner_user_id: uId(n) })); setPDirty(true); setPErr(e => ({ ...e, owner_user_id: undefined })); }}
                  options={userNameOpts}
                />
                {pErr.owner_user_id && <p style={{ color: "#ef4444", fontSize: "0.73rem", margin: "3px 0 0" }}>{pErr.owner_user_id}</p>}
              </div>

              {/* Confidentiality */}
              <div>
                <AppSelectField
                  id="afm-conf"
                  label="Confidentiality"
                  value={pf.confidentiality}
                  onChange={v => { setPf(p => ({ ...p, confidentiality: v })); setPDirty(true); setPErr(e => ({ ...e, confidentiality: undefined })); }}
                  options={CONFIDENTIAL}
                />
                {pErr.confidentiality && <p style={{ color: "#ef4444", fontSize: "0.73rem", margin: "3px 0 0" }}>{pErr.confidentiality}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STAGE 2: Builder ─────────────────────────────────────────────── */}
      {stage === "builder" && (
        <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

          {/* ── LEFT: Child list panel ────────────────────────────────── */}
          <aside style={{
            width: 264, flexShrink: 0,
            borderRight: "1px solid var(--color-border)",
            display: "flex", flexDirection: "column", overflow: "hidden",
            background: "var(--color-surface)",
          }}>
            {/* Parent identity */}
            <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--color-border)", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-secondary)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  {parentNum}.
                </span>
                <p style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--color-text-primary)", margin: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {parentTitle}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {savedParent && <StatusBadge value={savedParent.approval_status} />}
                {pDirty && <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#f59e0b", display: "flex", alignItems: "center", gap: 3 }}>● unsaved</span>}
              </div>
              {children.length > 0 && (
                <p style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)", margin: "6px 0 0" }}>
                  {children.length} {children.length === 1 ? "child agenda" : "child agendas"}
                  {" · "}{fmtMin(children.reduce((s, c) => s + parseDurMin(c.estimated_duration), 0))} total
                </p>
              )}
            </div>

            {/* Child list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px" }}>
              {children.length === 0 && (
                <p style={{ textAlign: "center", padding: "28px 12px", color: "var(--color-text-secondary)", fontSize: "0.8rem", margin: 0, lineHeight: 1.5 }}>
                  No child agendas yet.<br />
                  <span style={{ fontSize: "0.72rem" }}>Click the button below to add one.</span>
                </p>
              )}
              {children.map((child, i) => {
                const isSelected = cf.id === child.id && isChildMode;
                const isNew      = !cf.id && isChildMode && i === -1; // never true, just guard
                const docCt      = linkReg.items.filter(l => l.agenda_id === child.id).length;
                const durMin     = parseDurMin(child.estimated_duration);
                const isMenuOpen = menuChildId === child.id;
                return (
                  <div key={child.id} data-cmenu={child.id} style={{ position: "relative", marginBottom: 4 }}>
                    <div
                      onClick={() => withGuard(() => openChildForm(child))}
                      style={{
                        border: `1.5px solid ${isSelected ? "var(--color-primary)" : "var(--color-border)"}`,
                        borderRadius: 8, padding: "10px 10px 8px", cursor: "pointer",
                        background: isSelected
                          ? "color-mix(in srgb, var(--color-primary) 8%, var(--color-card))"
                          : "var(--color-card)",
                        transition: "border-color 0.1s, background 0.1s",
                      }}
                    >
                      {/* Number + title row */}
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 5 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 1, flexShrink: 0, marginTop: 1 }} onClick={e => e.stopPropagation()}>
                          <button disabled={i === 0} onClick={() => moveChild(child.id, "up")} aria-label="Move up"
                            style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", padding: "1px", color: i === 0 ? "var(--color-border)" : "var(--color-text-secondary)", display: "flex", borderRadius: 3 }}>
                            <ChevronUp size={10} />
                          </button>
                          <button disabled={i === children.length - 1} onClick={() => moveChild(child.id, "down")} aria-label="Move down"
                            style={{ background: "none", border: "none", cursor: i === children.length - 1 ? "default" : "pointer", padding: "1px", color: i === children.length - 1 ? "var(--color-border)" : "var(--color-text-secondary)", display: "flex", borderRadius: 3 }}>
                            <ChevronDown size={10} />
                          </button>
                        </div>
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: isSelected ? "var(--color-primary)" : "var(--color-text-secondary)", flexShrink: 0, paddingTop: 2, minWidth: 24 }}>
                          {parentNum}.{i + 1}
                        </span>
                        <span style={{ flex: 1, fontSize: "0.82rem", fontWeight: 600, color: "var(--color-text-primary)", lineHeight: 1.3, wordBreak: "break-word", minWidth: 0 }}>
                          {child.agenda_title || <span style={{ color: "var(--color-text-secondary)", fontStyle: "italic", fontWeight: 400 }}>Untitled</span>}
                        </span>
                        <div onClick={e => e.stopPropagation()}>
                          <button onClick={() => setMenuChildId(isMenuOpen ? null : child.id)} aria-label="Options"
                            style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 3px", color: "var(--color-text-secondary)", borderRadius: 4, display: "flex", opacity: 0.7 }}>
                            <MoreVertical size={12} />
                          </button>
                        </div>
                      </div>
                      {/* Meta row */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 30 }}>
                        <StatusBadge value={child.approval_status} />
                        {durMin > 0 && (
                          <span style={{ fontSize: "0.68rem", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 2 }}>
                            <Clock size={9} />{fmtMin(durMin)}
                          </span>
                        )}
                        {docCt > 0 && (
                          <span style={{ fontSize: "0.68rem", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 2 }}>
                            <FileText size={9} />{docCt}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Context menu */}
                    {isMenuOpen && (
                      <div style={{ position: "absolute", top: 4, right: 4, zIndex: 50, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, padding: "4px 0", boxShadow: "0 6px 20px rgba(0,0,0,0.14)", minWidth: 148 }}
                        onClick={e => e.stopPropagation()}
                      >
                        {[
                          { label: "Edit",      action: () => { withGuard(() => openChildForm(child)); setMenuChildId(null); } },
                          { label: "Move Up",   action: () => { moveChild(child.id, "up");   setMenuChildId(null); }, disabled: i === 0 },
                          { label: "Move Down", action: () => { moveChild(child.id, "down"); setMenuChildId(null); }, disabled: i === children.length - 1 },
                          { label: "Remove",    action: () => { setRemoveTargetId(child.id); setMenuChildId(null); }, danger: true },
                        ].map(item => (
                          <button key={item.label} onClick={item.action} disabled={item.disabled}
                            style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none",
                              cursor: item.disabled ? "default" : "pointer", padding: "8px 14px",
                              fontSize: "0.82rem", color: (item as { danger?: boolean }).danger ? "#ef4444" : item.disabled ? "var(--color-muted-foreground)" : "var(--color-text-primary)" }}>
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {/* Spacer so last card isn't flush against Add button */}
              <div style={{ height: 8 }} />
            </div>

            {/* Add Child Agenda — sticky at bottom */}
            <div style={{ padding: "10px 10px 12px", borderTop: "1px solid var(--color-border)", flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => withGuard(() => openChildForm(null))}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  width: "100%", padding: "9px 14px", borderRadius: 8,
                  border: `1.5px dashed ${isChildMode && !cf.id ? "var(--color-primary)" : "var(--color-border)"}`,
                  background: isChildMode && !cf.id ? "color-mix(in srgb, var(--color-primary) 5%, transparent)" : "transparent",
                  color: "var(--color-primary)", cursor: "pointer", fontSize: "0.83rem", fontWeight: 600,
                  transition: "all 0.1s",
                }}
              >
                <Plus size={14} />
                Add Child Agenda
              </button>
            </div>
          </aside>

          {/* ── RIGHT / MAIN area ─────────────────────────────────────── */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* Empty state — shown when no child is being edited */}
            {!isChildMode && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem 2rem", gap: 14, textAlign: "center", overflowY: "auto" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--color-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ClipboardList size={26} strokeWidth={1.5} style={{ opacity: 0.4, color: "var(--color-text-secondary)" }} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-text-primary)", margin: "0 0 6px" }}>
                    {children.length === 0 ? "No child agendas added" : "Select a child agenda to edit"}
                  </h3>
                  <p style={{ fontSize: "0.83rem", color: "var(--color-text-secondary)", maxWidth: 300, margin: "0 auto", lineHeight: 1.5 }}>
                    {children.length === 0
                      ? "Break the parent agenda into individual topics that will be discussed."
                      : "Click any item on the left to view and edit it."}
                  </p>
                </div>
                {children.length === 0 && (
                  <Button type="button" variant="primary" size="md" leadingIcon={Plus}
                    onClick={() => openChildForm(null)}>
                    Add Child Agenda
                  </Button>
                )}
              </div>
            )}

            {/* Child form */}
            {isChildMode && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

                {/* Sticky sub-header with breadcrumb */}
                <div style={{
                  padding: "11px 24px 10px", borderBottom: "1px solid var(--color-border)",
                  background: "var(--color-surface)", flexShrink: 0,
                  display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
                }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)" }}>
                    {agendaId ? "Edit Agenda" : "Create Agenda"}
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)" }}>›</span>
                  <span style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {parentTitle}
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)" }}>›</span>
                  <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--color-primary)" }}>
                    {!cf.id ? "New Child Agenda" : "Edit Child Agenda"}
                  </span>
                  {!cf.id && (
                    <span style={{ marginLeft: "auto", fontSize: "0.7rem", color: "var(--color-text-secondary)", background: "var(--color-muted)", padding: "2px 8px", borderRadius: 4 }}>
                      Save to attach documents
                    </span>
                  )}
                </div>

                {/* Scrollable form body */}
                <div style={{ flex: 1, overflowY: "auto" }}>
                  <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 32px 40px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

                      {/* Title */}
                      <div>
                        <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--color-foreground)", display: "block", marginBottom: 5 }}>
                          Agenda Title <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <input
                          id="afm-child-title"
                          type="text"
                          value={cf.title}
                          onChange={e => { setCf(p => ({ ...p, title: e.target.value })); setCDirty(true); setCErr(er => ({ ...er, title: undefined })); }}
                          placeholder="Enter the specific topic that will be discussed."
                          autoComplete="off"
                          style={{
                            width: "100%", borderRadius: 8, padding: "10px 14px",
                            border: `1.5px solid ${cErr.title ? "#ef4444" : "var(--color-border)"}`,
                            background: "var(--color-card)", color: "var(--color-foreground)",
                            fontSize: "0.92rem", outline: "none", fontWeight: 500,
                            boxSizing: "border-box",
                          }}
                        />
                        {cErr.title && <p style={{ color: "#ef4444", fontSize: "0.73rem", margin: "4px 0 0" }}>{cErr.title}</p>}
                      </div>

                      {/* Discussion Details (Tiptap) */}
                      <div>
                        <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--color-foreground)", display: "block", marginBottom: 5 }}>
                          Discussion Details <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <ChildRichEditor
                          key={cf.id ?? "new"}
                          value={cf.details}
                          onChange={v => { setCf(p => ({ ...p, details: v })); setCDirty(true); setCErr(e => ({ ...e, details: undefined })); }}
                          placeholder="Describe the background, key discussion points, proposal, or information the board should review."
                        />
                        {cErr.details && <p style={{ color: "#ef4444", fontSize: "0.73rem", margin: "4px 0 0" }}>{cErr.details}</p>}
                      </div>

                      {/* Purpose + Presenter in a 2-col grid */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <div>
                          <AppSelectField
                            id="afm-child-purpose"
                            label="Purpose"
                            value={cf.purpose}
                            onChange={v => { setCf(p => ({ ...p, purpose: v })); setCDirty(true); setCErr(e => ({ ...e, purpose: undefined })); }}
                            options={PURPOSES}
                          />
                          {cErr.purpose && <p style={{ color: "#ef4444", fontSize: "0.73rem", margin: "4px 0 0" }}>{cErr.purpose}</p>}
                        </div>
                        <AppSelectField
                          id="afm-child-presenter"
                          label="Presenter"
                          value={uLabel(cf.presenter_user_id)}
                          onChange={n => { setCf(p => ({ ...p, presenter_user_id: uId(n) })); setCDirty(true); }}
                          options={userNameOpts}
                        />
                      </div>

                      {/* Duration */}
                      <div>
                        <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--color-foreground)", display: "block", marginBottom: 5 }}>
                          Estimated Duration <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <input
                            id="afm-child-duration"
                            type="number" min={1} max={480}
                            value={cf.duration_mins}
                            onChange={e => { setCf(p => ({ ...p, duration_mins: e.target.value })); setCDirty(true); setCErr(er => ({ ...er, duration: undefined })); }}
                            placeholder="30"
                            style={{
                              width: 100, borderRadius: 8, padding: "9px 12px",
                              border: `1.5px solid ${cErr.duration ? "#ef4444" : "var(--color-border)"}`,
                              background: "var(--color-card)", color: "var(--color-foreground)",
                              fontSize: "0.88rem", outline: "none", textAlign: "center",
                            }}
                          />
                          <span style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>minutes</span>
                          {cf.duration_mins && parseInt(cf.duration_mins, 10) > 0 && (
                            <span style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", background: "var(--color-muted)", padding: "3px 8px", borderRadius: 4 }}>
                              = {fmtMin(parseInt(cf.duration_mins, 10))}
                            </span>
                          )}
                        </div>
                        {cErr.duration && <p style={{ color: "#ef4444", fontSize: "0.73rem", margin: "4px 0 0" }}>{cErr.duration}</p>}
                      </div>

                      {/* Document Attachments — always visible; auto-drafts child on first attach */}
                      <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "1.25rem" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                            Documents {linkedDocIds.length > 0 && <span style={{ fontWeight: 400, color: "var(--color-text-secondary)" }}>({linkedDocIds.length})</span>}
                          </span>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button type="button" onClick={handleOpenUploader}
                              style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-card)", cursor: "pointer", fontSize: "0.78rem", fontWeight: 500, color: "var(--color-foreground)" }}>
                              <Upload size={12} /> Upload
                            </button>
                            <button type="button" onClick={handleOpenPicker}
                              style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 6, border: `1px solid ${pickerOpen ? "var(--color-primary)" : "var(--color-border)"}`, background: pickerOpen ? "color-mix(in srgb, var(--color-primary) 6%, var(--color-card))" : "var(--color-card)", cursor: "pointer", fontSize: "0.78rem", fontWeight: 500, color: pickerOpen ? "var(--color-primary)" : "var(--color-foreground)" }}>
                              <BookOpen size={12} /> Library
                            </button>
                          </div>
                        </div>

                        {pickerOpen && (
                          <DocPickerPanel
                            linkedIds={linkedDocIds}
                            onToggle={toggleDocLink}
                            onPreview={id => setPreviewDocId(id)}
                            docReg={docReg}
                          />
                        )}

                        {linkedDocIds.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: pickerOpen ? 10 : 0 }}>
                            {linkedDocIds.map(docId => {
                              const doc = docReg.items.find(d => d.id === docId);
                              if (!doc) return null;
                              return (
                                <div key={docId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", border: "1px solid var(--color-border)", borderRadius: 8, background: "var(--color-surface)" }}>
                                  <FileText size={14} style={{ color: "var(--color-text-secondary)", flexShrink: 0 }} />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: "0.83rem", fontWeight: 500, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {doc.doc_name ?? doc.file_name ?? docId}
                                    </div>
                                    <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginTop: 1 }}>
                                      {[doc.doc_type, doc.file_format, doc.version ? `v${doc.version}` : null, doc.approval_status].filter(Boolean).join(" · ")}
                                    </div>
                                  </div>
                                  <button type="button" onClick={() => setPreviewDocId(docId)} title="Preview"
                                    style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--color-text-secondary)", borderRadius: 4, display: "flex" }}>
                                    <Eye size={13} />
                                  </button>
                                  <button type="button" onClick={() => { const cid = cf.id ?? pendingChildIdRef.current; if (cid) unlinkDoc(docId, cid); }} title="Unlink"
                                    style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--color-text-secondary)", borderRadius: 4, display: "flex" }}>
                                    <X size={13} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : !pickerOpen && (
                          <p style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", margin: 0, padding: "8px 0" }}>
                            No documents attached yet.
                          </p>
                        )}
                      </div>

                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </AppModal>

    {/* Document preview */}
    {previewDocId && (
      <UnifiedDocumentViewer
        source={{ kind: "stored", documentId: previewDocId }}
        title={previewDoc?.doc_name ?? previewDoc?.file_name ?? previewDocId}
        version={previewDoc?.version}
        documentId={previewDocId}
        mimeType={previewDoc?.mime_type}
        fileName={previewDoc?.file_name}
        onClose={() => setPreviewDocId(null)}
      />
    )}

    {/* Upload new document */}
    <DocumentComposerModal
      open={uploaderOpen}
      onClose={() => setUploaderOpen(false)}
      initialSource="upload"
      sourceModule="agenda"
      initialAgendaId={cf.id ?? null}
      onCreated={docId => {
        const cid = cf.id ?? pendingChildIdRef.current;
        if (cid) linkDoc(docId, cid);
        setUploaderOpen(false);
      }}
    />

    {/* Close guard — unsaved parent or child changes */}
    {showCloseGuard && (
      <AppModal
        open
        title="Unsaved Changes"
        size="sm"
        onClose={() => setShowCloseGuard(false)}
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flex: 1 }}>
            <Button variant="ghost" size="sm" onClick={() => setShowCloseGuard(false)}>Stay Here</Button>
            <Button variant="destructive-subtle" size="sm"
              onClick={() => { setShowCloseGuard(false); onClose(); }}>
              Discard &amp; Close
            </Button>
          </div>
        }
      >
        <p style={{ fontSize: "0.83rem", color: "var(--color-text-secondary)", margin: 0 }}>
          You have unsaved changes. Close now and they will be lost.
        </p>
      </AppModal>
    )}

    {/* Remove child agenda confirmation */}
    {removeTargetId && (
      <AppModal
        open
        title="Remove Child Agenda?"
        size="sm"
        onClose={() => setRemoveTargetId(null)}
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flex: 1 }}>
            <Button variant="ghost" size="sm" onClick={() => setRemoveTargetId(null)}>Cancel</Button>
            <Button variant="destructive-subtle" size="sm"
              onClick={() => { removeChild(removeTargetId); setRemoveTargetId(null); }}>
              Remove
            </Button>
          </div>
        }
      >
        <p style={{ fontSize: "0.83rem", color: "var(--color-text-secondary)", margin: 0 }}>
          This child agenda and its document links will be removed. The documents themselves remain in the library.
        </p>
      </AppModal>
    )}

    {/* Unsaved child changes guard */}
    {pendingFn && (
      <AppModal
        open
        title="Unsaved Changes"
        size="sm"
        onClose={() => setPendingFn(null)}
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flex: 1 }}>
            <Button variant="ghost" size="sm" onClick={() => setPendingFn(null)}>Stay Here</Button>
            <Button variant="secondary" size="sm"
              style={{ color: "#ef4444", borderColor: "#ef4444" }}
              onClick={() => { setCDirty(false); const fn = pendingFn; setPendingFn(null); fn(); }}>
              Discard Changes
            </Button>
            <Button variant="primary" size="sm"
              onClick={() => { if (parentId) { doSaveChild(parentId); } const fn = pendingFn; setPendingFn(null); fn(); }}>
              Save and Continue
            </Button>
          </div>
        }
      >
        <p style={{ fontSize: "0.83rem", color: "var(--color-text-secondary)", margin: 0 }}>
          This child agenda has unsaved changes. Save them before continuing, or discard and proceed.
        </p>
      </AppModal>
    )}
  </>);
}
