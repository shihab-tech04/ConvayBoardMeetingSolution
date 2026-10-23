import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit }       from "@tiptap/starter-kit";
import { Underline }        from "@tiptap/extension-underline";
import { Highlight }        from "@tiptap/extension-highlight";
import { TextAlign }        from "@tiptap/extension-text-align";
import { Link }             from "@tiptap/extension-link";
import { Image }            from "@tiptap/extension-image";
import { Table }            from "@tiptap/extension-table";
import { TableRow }         from "@tiptap/extension-table-row";
import { TableCell }        from "@tiptap/extension-table-cell";
import { TableHeader }      from "@tiptap/extension-table-header";
import { Placeholder }      from "@tiptap/extension-placeholder";
import { CharacterCount }   from "@tiptap/extension-character-count";
import { toast } from "sonner";
import {
  ArrowLeft, FileText, AlertCircle, CheckCircle, Loader2,
  Lock, Share2, MessageSquare, History, GitBranch,
  ChevronRight, List, Bookmark, AlignLeft, MoreHorizontal,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Highlighter,
  AlignCenter, AlignRight, AlignJustify, ListOrdered,
  Quote, Minus, Link as LinkIcon, Image as ImageIcon,
  Table as TableIcon, Undo2, Redo2,
  Eye, EyeOff, Columns, Activity, Globe, WifiOff,
  AlertTriangle, Send,
} from "lucide-react";
import { FullScreenWorkspaceShell } from "../../components/shared/FullScreenWorkspaceShell";
import { DocumentWorkspaceRouter } from "../../components/documents/DocumentWorkspaceRouter";
import { getDocumentWorkspaceType } from "../../utils/documentFormat";
import { Button } from "../../components/buttons/Button";
import { StatusBadge } from "../../components/badges/StatusBadge";
import { AppTextArea } from "../../components/forms/AppTextArea";
import {
  useDocumentRegistry,
  useDocumentVersionRegistry,
  useAuditEventRegistry,
  type BoardDocument,
} from "../../data/boardMeetingData";
import {
  useDocumentCommentRegistry,
  type DocumentCommentThread,
} from "../../data/documentWorkspaceData";
import { documentContentStore } from "../../services/repositories/documentContentStore";
import { getEditorProvider, type EditorCapabilities } from "../../components/documents/editor/DocumentEditorProvider";

// ── Types ──────────────────────────────────────────────────────────────────────

type SaveState  = "saving" | "saved" | "error" | "readonly" | "locked" | "offline";
type EditorMode = "editing" | "viewing";
type LeftPanel  = "outline" | "sections" | "bookmarks" | null;
type RightPanel = "comments" | "versions" | "approvals" | "activity" | null;

// ── Utilities ──────────────────────────────────────────────────────────────────

function getDocExt(doc: BoardDocument): string {
  return (doc.file_format ?? doc.file_name?.split(".").pop() ?? "")
    .toLowerCase()
    .replace(/^\./, "");
}

function needsMammothConversion(doc: BoardDocument): boolean {
  if (doc.content_type === "editor") return false;
  const ext = getDocExt(doc);
  return ["docx", "odt", "rtf"].includes(ext);
}

function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0] ?? "").join("").toUpperCase() || "?";
}

function newAuditId(): string { return `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; }

// ── Content loader ─────────────────────────────────────────────────────────────

async function loadDocumentContent(doc: BoardDocument): Promise<{
  content: string | null;
  isHtml: boolean;
  banner: string | null;
}> {
  const docId = doc.doc_id ?? doc.id;

  const existing = await documentContentStore.getEditorContent(docId);
  if (existing) {
    const isHtml = existing.trim().startsWith("<");
    return { content: existing, isHtml, banner: null };
  }

  if (needsMammothConversion(doc)) {
    const file = await documentContentStore.getOriginalFile(docId);
    if (file) {
      try {
        const mammoth = await import("mammoth");
        const buffer  = await file.arrayBuffer();
        const result  = await mammoth.default.convertToHtml({ arrayBuffer: buffer });
        const html    = result.value;
        await documentContentStore.putEditorContent(docId, html);
        return {
          content: html,
          isHtml: true,
          banner: "This document was converted for in-app editing. The original file is preserved.",
        };
      } catch {
        return { content: null, isHtml: false, banner: "Document conversion failed. Starting with a blank editor." };
      }
    }
    return { content: null, isHtml: false, banner: null };
  }

  return { content: null, isHtml: false, banner: null };
}

// ── Toolbar button ─────────────────────────────────────────────────────────────

function ToolbarBtn({
  label, active, disabled, onClick, children,
}: {
  label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      type="button" title={label} aria-label={label} aria-pressed={active}
      disabled={disabled} onClick={onClick}
      className={`doc-editor__toolbar-btn${active ? " doc-editor__toolbar-btn--active" : ""}`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="doc-editor__toolbar-divider" aria-hidden="true" />;
}

// ── Editor Toolbar ─────────────────────────────────────────────────────────────

function canUndo(editor: NonNullable<ReturnType<typeof useEditor>>): boolean {
  try { return editor.can().undo(); } catch { return false; }
}
function canRedo(editor: NonNullable<ReturnType<typeof useEditor>>): boolean {
  try { return editor.can().redo(); } catch { return false; }
}

function EditorToolbar({ editor, disabled }: { editor: ReturnType<typeof useEditor>; disabled?: boolean }) {
  if (!editor || !editor.view) return null;

  const headingOptions = [
    { label: "Paragraph", value: 0 },
    { label: "Heading 1",  value: 1 },
    { label: "Heading 2",  value: 2 },
    { label: "Heading 3",  value: 3 },
  ];
  const activeHeading = headingOptions.findIndex(
    h => h.value > 0 ? editor.isActive("heading", { level: h.value }) : editor.isActive("paragraph"),
  );
  const selectedHeading = activeHeading >= 0 ? headingOptions[activeHeading].label : "Paragraph";

  return (
    <div className="doc-editor__toolbar" role="toolbar" aria-label="Formatting">
      <select
        className="doc-editor__toolbar-select"
        value={selectedHeading}
        disabled={disabled}
        aria-label="Text style"
        onChange={e => {
          const val = headingOptions.find(h => h.label === e.target.value);
          if (!val) return;
          if (val.value === 0) editor.chain().focus().setParagraph().run();
          else editor.chain().focus().toggleHeading({ level: val.value as 1 | 2 | 3 }).run();
        }}
      >
        {headingOptions.map(h => (
          <option key={h.value} value={h.label}>{h.label}</option>
        ))}
      </select>

      <ToolbarDivider />

      <ToolbarBtn label="Bold"          active={editor.isActive("bold")}      disabled={disabled} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={14} strokeWidth={2.5} /></ToolbarBtn>
      <ToolbarBtn label="Italic"        active={editor.isActive("italic")}    disabled={disabled} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={14} strokeWidth={2.5} /></ToolbarBtn>
      <ToolbarBtn label="Underline"     active={editor.isActive("underline")} disabled={disabled} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon size={14} strokeWidth={2.5} /></ToolbarBtn>
      <ToolbarBtn label="Strikethrough" active={editor.isActive("strike")}    disabled={disabled} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={14} strokeWidth={2.5} /></ToolbarBtn>
      <ToolbarBtn label="Highlight"     active={editor.isActive("highlight")} disabled={disabled} onClick={() => editor.chain().focus().toggleHighlight().run()}><Highlighter size={14} strokeWidth={2.5} /></ToolbarBtn>

      <ToolbarDivider />

      <ToolbarBtn label="Align left"   active={editor.isActive({ textAlign: "left" })}    disabled={disabled} onClick={() => editor.chain().focus().setTextAlign("left").run()}><AlignLeft size={14} strokeWidth={2} /></ToolbarBtn>
      <ToolbarBtn label="Align center" active={editor.isActive({ textAlign: "center" })}  disabled={disabled} onClick={() => editor.chain().focus().setTextAlign("center").run()}><AlignCenter size={14} strokeWidth={2} /></ToolbarBtn>
      <ToolbarBtn label="Align right"  active={editor.isActive({ textAlign: "right" })}   disabled={disabled} onClick={() => editor.chain().focus().setTextAlign("right").run()}><AlignRight size={14} strokeWidth={2} /></ToolbarBtn>
      <ToolbarBtn label="Justify"      active={editor.isActive({ textAlign: "justify" })} disabled={disabled} onClick={() => editor.chain().focus().setTextAlign("justify").run()}><AlignJustify size={14} strokeWidth={2} /></ToolbarBtn>

      <ToolbarDivider />

      <ToolbarBtn label="Bullet list"    active={editor.isActive("bulletList")}  disabled={disabled} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={14} strokeWidth={2} /></ToolbarBtn>
      <ToolbarBtn label="Ordered list"   active={editor.isActive("orderedList")} disabled={disabled} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={14} strokeWidth={2} /></ToolbarBtn>
      <ToolbarBtn label="Blockquote"     active={editor.isActive("blockquote")}  disabled={disabled} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={14} strokeWidth={2} /></ToolbarBtn>
      <ToolbarBtn label="Horizontal rule" active={false} disabled={disabled} onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus size={14} strokeWidth={2} /></ToolbarBtn>

      <ToolbarDivider />

      <ToolbarBtn label="Insert link" active={editor.isActive("link")} disabled={disabled} onClick={() => {
        const url = window.prompt("Enter URL");
        if (url) editor.chain().focus().setLink({ href: url }).run();
      }}><LinkIcon size={14} strokeWidth={2} /></ToolbarBtn>
      <ToolbarBtn label="Insert image" active={false} disabled={disabled} onClick={() => {
        const url = window.prompt("Enter image URL");
        if (url) editor.chain().focus().setImage({ src: url }).run();
      }}><ImageIcon size={14} strokeWidth={2} /></ToolbarBtn>
      <ToolbarBtn label="Insert table" active={editor.isActive("table")} disabled={disabled} onClick={() =>
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
      }><TableIcon size={14} strokeWidth={2} /></ToolbarBtn>

      <ToolbarDivider />

      <ToolbarBtn label="Undo" active={false} disabled={disabled || !canUndo(editor)} onClick={() => editor.chain().focus().undo().run()}><Undo2 size={14} strokeWidth={2} /></ToolbarBtn>
      <ToolbarBtn label="Redo" active={false} disabled={disabled || !canRedo(editor)} onClick={() => editor.chain().focus().redo().run()}><Redo2 size={14} strokeWidth={2} /></ToolbarBtn>
    </div>
  );
}

// ── Left Panel ─────────────────────────────────────────────────────────────────

type OutlineItem = { level: number; text: string; key: string };

function extractOutline(editor: ReturnType<typeof useEditor>): OutlineItem[] {
  if (!editor) return [];
  const items: OutlineItem[] = [];
  let i = 0;
  editor.state.doc.forEach(node => {
    if (node.type.name === "heading") {
      items.push({ level: node.attrs.level as number, text: node.textContent, key: `h${i++}` });
    }
  });
  return items;
}

function EditorLeftPanel({ panel, editor, onClose }: { panel: LeftPanel; editor: ReturnType<typeof useEditor>; onClose: () => void }) {
  const outline = useMemo(() => (panel === "outline" ? extractOutline(editor) : []), [panel, editor?.state]);

  return (
    <div className="doc-editor__left-panel">
      <div className="doc-editor__panel-head">
        <span className="doc-editor__panel-title">
          {panel === "outline"   && "Outline"}
          {panel === "sections"  && "Sections"}
          {panel === "bookmarks" && "Bookmarks"}
        </span>
        <button type="button" className="doc-editor__panel-close" onClick={onClose} aria-label="Close panel">
          <ChevronRight size={14} strokeWidth={2.5} />
        </button>
      </div>
      <div className="doc-editor__panel-body">
        {panel === "outline" && (
          outline.length === 0 ? (
            <div className="doc-editor__panel-empty">No headings found. Use Heading 1–3 to build an outline.</div>
          ) : (
            <nav aria-label="Document outline">
              {outline.map(item => (
                <div key={item.key} className="doc-editor__outline-item" style={{ paddingLeft: `${(item.level - 1) * 12 + 8}px` }}>
                  {item.text || <em style={{ opacity: 0.5 }}>Untitled heading</em>}
                </div>
              ))}
            </nav>
          )
        )}
        {panel === "sections"  && <div className="doc-editor__panel-empty">Section navigation coming soon.</div>}
        {panel === "bookmarks" && <div className="doc-editor__panel-empty">No bookmarks yet.</div>}
      </div>
    </div>
  );
}

// ── Right Panel: Comments ──────────────────────────────────────────────────────

function RightPanelComments({ doc, editor }: { doc: BoardDocument; editor: ReturnType<typeof useEditor> }) {
  const threadReg = useDocumentCommentRegistry();
  const auditReg  = useAuditEventRegistry();
  const [body,    setBody]    = useState("");

  const docId = doc.doc_id ?? doc.id;

  const threads = useMemo(
    () => threadReg.items
      .filter(t => t.document_id === docId && t.status !== "resolved")
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [threadReg.items, docId],
  );

  const handlePost = () => {
    if (!body.trim()) return;
    // Capture any active selection text from the editor as anchor context
    const selectedText = editor?.state.selection.empty
      ? undefined
      : editor?.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, " ").trim().slice(0, 120) || undefined;

    const now  = new Date().toISOString();
    const newId = `CT-${Date.now()}`;
    threadReg.add({
      id: newId, thread_id: newId,
      document_id: docId,
      selected_text: selectedText,
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
    toast.success("Resolved.");
  };

  return (
    <>
      <div className="doc-editor__comment-input">
        <AppTextArea id="editor-comment" label="Add comment" value={body} onChange={setBody} rows={2} placeholder="Write a comment… (select text first to anchor)" />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.375rem" }}>
          <Button variant="primary" size="sm" leadingIcon={Send} onClick={handlePost}>Post</Button>
        </div>
      </div>
      {threads.length === 0 ? (
        <div className="doc-editor__panel-empty">No open comments.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", padding: "0.5rem" }}>
          {threads.map(thread => (
            <div key={thread.id} className="doc-editor__comment-item">
              <div className="doc-editor__comment-head">
                <div className="doc-editor__comment-avatar">{getInitials(thread.created_by)}</div>
                <span className="doc-editor__comment-author">{thread.created_by}</span>
                <span className="doc-editor__comment-time">{timeAgo(thread.created_at)}</span>
              </div>
              {thread.selected_text && (
                <div className="doc-editor__comment-anchor-preview">
                  "{thread.selected_text}"
                </div>
              )}
              <div className="doc-editor__comment-body">{thread.body}</div>
              {thread.replies.length > 0 && (
                <div style={{ paddingLeft: "0.75rem", borderLeft: "2px solid var(--color-border)", marginTop: "0.25rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  {thread.replies.map(r => (
                    <div key={r.id}>
                      <span style={{ fontSize: "0.7rem", fontWeight: 600, opacity: 0.7 }}>{r.author}</span>
                      <div className="doc-editor__comment-body">{r.body}</div>
                    </div>
                  ))}
                </div>
              )}
              <button type="button" className="doc-editor__text-action" onClick={() => handleResolve(thread)}>
                <CheckCircle size={10} strokeWidth={2} /> Resolve
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ── Right Panel: Versions ──────────────────────────────────────────────────────

function RightPanelVersions({ doc }: { doc: BoardDocument }) {
  const versionReg = useDocumentVersionRegistry();
  const docId = doc.doc_id ?? doc.id;

  const versions = useMemo(
    () => versionReg.items
      .filter(v => v.document_id === docId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20),
    [versionReg.items, docId],
  );

  if (versions.length === 0) {
    return <div className="doc-editor__panel-empty">No versions yet. Use "Save Version" to create a named checkpoint.</div>;
  }

  return (
    <div style={{ padding: "0.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {versions.map((v, idx) => (
        <div key={v.id} className="doc-editor__version-item">
          <div style={{ display: "flex", gap: "0.375rem", alignItems: "center" }}>
            <span className="doc-editor__ver-num">v{v.version_number}</span>
            {idx === 0 && <span className="doc-editor__ver-badge">Current</span>}
            {v.version_name && <span className="doc-editor__ver-badge" style={{ background: "var(--color-primary-alpha-8,rgba(99,102,241,0.08))", color: "var(--color-primary)" }}>{v.version_name}</span>}
            {v.snapshot_type === ("approval_lock" as never) && <Lock size={10} strokeWidth={2} style={{ color: "var(--color-warning,#d97706)" }} />}
          </div>
          {v.change_summary && <div className="doc-editor__ver-summary">{v.change_summary}</div>}
          <div className="doc-editor__ver-meta">{v.created_by} · {timeAgo(v.created_at)}</div>
        </div>
      ))}
    </div>
  );
}

// ── Right Panel: Approvals ─────────────────────────────────────────────────────

const APPROVAL_STAGE_ORDER = [
  "Draft", "Under Review", "Changes Requested", "Pending Approval",
  "Approved", "Published", "Superseded", "Archived",
];

function RightPanelApprovals({ doc, caps }: { doc: BoardDocument; caps: EditorCapabilities }) {
  const currentStatus = doc.approval_status ?? "Draft";
  const stageIdx = APPROVAL_STAGE_ORDER.indexOf(currentStatus);

  return (
    <div style={{ padding: "0.75rem 0.5rem", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
      {/* Current status */}
      <div>
        <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.375rem" }}>
          Current Stage
        </div>
        <StatusBadge value={currentStatus} />
        {doc.is_locked && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginTop: "0.375rem", fontSize: "0.75rem", color: "var(--color-warning,#d97706)" }}>
            <Lock size={11} strokeWidth={2} />
            <span>Locked for approval — editing is disabled.</span>
          </div>
        )}
      </div>

      {/* Stage progress */}
      <div>
        <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.375rem" }}>
          Workflow Progress
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          {APPROVAL_STAGE_ORDER.map((s, i) => {
            const isDone   = i < stageIdx;
            const isActive = i === stageIdx;
            return (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                  background: isDone ? "var(--color-success,#10b981)" : isActive ? "var(--color-primary)" : "var(--color-border)",
                  border: isActive ? "2px solid var(--color-primary)" : "2px solid transparent",
                  boxSizing: "content-box",
                }} />
                <span style={{
                  fontSize: "0.75rem",
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? "var(--color-text)" : isDone ? "var(--color-text-secondary)" : "var(--color-text-disabled,var(--color-text-secondary))",
                  opacity: i > stageIdx + 1 ? 0.5 : 1,
                }}>
                  {s}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Suggestions / Tracked changes notice */}
      {!caps.trackedChanges && (
        <div className="doc-editor__capability-notice">
          <AlertTriangle size={12} strokeWidth={2} style={{ flexShrink: 0 }} />
          <span>Tracked changes require the configured collaborative document provider.</span>
        </div>
      )}

      <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
        Use the Workflow tab in the Document Details drawer to advance or change the document stage.
      </div>
    </div>
  );
}

// ── Right Panel: Activity ──────────────────────────────────────────────────────

function RightPanelActivity({ doc }: { doc: BoardDocument }) {
  const auditReg = useAuditEventRegistry();
  const docId    = doc.doc_id ?? doc.id;

  const events = useMemo(
    () => auditReg.items
      .filter(e => e.entity_id === docId || e.entity_id === doc.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 30),
    [auditReg.items, docId, doc.id],
  );

  if (events.length === 0) {
    return <div className="doc-editor__panel-empty">No activity yet.</div>;
  }

  return (
    <div style={{ padding: "0.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {events.map(e => (
        <div key={e.id} className="doc-editor__version-item">
          <div className="doc-editor__comment-head">
            <span className="doc-editor__comment-author">{e.actor}</span>
            <span className="doc-editor__comment-time">{timeAgo(e.timestamp)}</span>
          </div>
          <div className="doc-editor__comment-body">{e.action}{e.details ? ` — ${e.details}` : ""}</div>
        </div>
      ))}
    </div>
  );
}

// ── Right Panel container ──────────────────────────────────────────────────────

function EditorRightPanel({
  panel, doc, editor, caps, onClose,
}: {
  panel: RightPanel;
  doc: BoardDocument;
  editor: ReturnType<typeof useEditor>;
  caps: EditorCapabilities;
  onClose: () => void;
}) {
  return (
    <div className="doc-editor__right-panel">
      <div className="doc-editor__panel-head">
        <span className="doc-editor__panel-title">
          {panel === "comments"  && "Comments"}
          {panel === "versions"  && "Version History"}
          {panel === "approvals" && "Workflow"}
          {panel === "activity"  && "Activity"}
        </span>
        <button type="button" className="doc-editor__panel-close" onClick={onClose} aria-label="Close panel">
          <ChevronRight size={14} strokeWidth={2.5} style={{ transform: "rotate(180deg)" }} />
        </button>
      </div>
      <div className="doc-editor__panel-body">
        {panel === "comments"  && <RightPanelComments  doc={doc} editor={editor} />}
        {panel === "versions"  && <RightPanelVersions  doc={doc} />}
        {panel === "approvals" && <RightPanelApprovals doc={doc} caps={caps} />}
        {panel === "activity"  && <RightPanelActivity  doc={doc} />}
      </div>
    </div>
  );
}

// ── Save state indicator ────────────────────────────────────────────────────────

function SaveIndicator({ state }: { state: SaveState }) {
  return (
    <div className="doc-editor__save-state" aria-live="polite" aria-atomic="true">
      {state === "saving"   && <><Loader2 size={12} className="spin-icon" /><span>Saving…</span></>}
      {state === "saved"    && <><CheckCircle size={12} style={{ color: "var(--color-success,#10b981)" }} /><span>Saved</span></>}
      {state === "error"    && <><AlertCircle size={12} style={{ color: "var(--color-error,#ef4444)" }} /><span>Save failed</span></>}
      {state === "readonly" && <><EyeOff size={12} /><span>Read only</span></>}
      {state === "locked"   && <><Lock size={12} style={{ color: "var(--color-warning,#d97706)" }} /><span>Locked for approval</span></>}
      {state === "offline"  && <><WifiOff size={12} /><span>Offline</span></>}
    </div>
  );
}

// ── Status bar ─────────────────────────────────────────────────────────────────

function EditorStatusBar({ editor, providerLabel, online }: { editor: ReturnType<typeof useEditor>; providerLabel: string; online: boolean }) {
  const words = editor?.storage?.characterCount?.words?.() ?? 0;
  const chars = editor?.storage?.characterCount?.characters?.() ?? 0;

  return (
    <div className="doc-editor__statusbar">
      <span className="doc-editor__status-item">{words} word{words !== 1 ? "s" : ""}</span>
      <span className="doc-editor__status-sep">·</span>
      <span className="doc-editor__status-item">{chars} char{chars !== 1 ? "s" : ""}</span>
      <span className="doc-editor__status-sep" style={{ flex: 1 }} />
      <span className="doc-editor__status-item" style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
        {online
          ? <><Globe size={11} strokeWidth={2} style={{ color: "var(--color-success,#10b981)" }} /> Online</>
          : <><WifiOff size={11} strokeWidth={2} style={{ color: "var(--color-error,#ef4444)" }} /> Offline</>
        }
      </span>
      <span className="doc-editor__status-sep">·</span>
      <span className="doc-editor__status-item">{providerLabel}</span>
    </div>
  );
}

// ── Banners ────────────────────────────────────────────────────────────────────

function ConvertBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="doc-editor__banner" role="status">
      <AlertCircle size={14} strokeWidth={2} style={{ flexShrink: 0 }} />
      <span>{message}</span>
      <button type="button" className="doc-editor__banner-dismiss" onClick={onDismiss} aria-label="Dismiss">✕</button>
    </div>
  );
}

function LockedBanner() {
  return (
    <div className="doc-editor__banner doc-editor__banner--warning" role="status">
      <Lock size={14} strokeWidth={2} style={{ flexShrink: 0 }} />
      <span>This document is locked for approval. Editing is disabled until the approval process completes or a reviewer requests changes.</span>
    </div>
  );
}

// ── Editor shell ───────────────────────────────────────────────────────────────

function DocumentEditorShell({ doc, onClose }: { doc: BoardDocument; onClose: () => void }) {
  const provider      = useMemo(() => getEditorProvider(), []);
  const caps          = provider.capabilities;
  const docRegistry   = useDocumentRegistry();
  const versionReg    = useDocumentVersionRegistry();
  const auditReg      = useAuditEventRegistry();

  const [saveState,    setSaveState]    = useState<SaveState>("saved");
  const [mode,         setMode]         = useState<EditorMode>("editing");
  const [leftPanel,    setLeftPanel]    = useState<LeftPanel>(null);
  const [rightPanel,   setRightPanel]   = useState<RightPanel>(null);
  const [loading,      setLoading]      = useState(true);
  const [convertBanner,setConvertBanner] = useState<string | null>(null);
  const [title,        setTitle]        = useState(doc.doc_name);
  const [online]       = useState(navigator.onLine);

  const docId      = doc.doc_id ?? doc.id;
  const wsType     = useMemo(() => getDocumentWorkspaceType(doc), [doc]);
  const isLocked   = !!doc.is_locked;

  // Editable only if: capability + editing mode + NOT locked (non-rich-text already routed away)
  const isEditable = caps.editing && mode === "editing" && !isLocked;

  const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);

  // Locked state overrides save state
  useEffect(() => {
    if (isLocked) setSaveState("locked");
  }, [isLocked]);

  // ── Tiptap setup ──
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false, underline: false } as any),
      Underline,
      Highlight.configure({ multicolor: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false }),
      Image,
      Table.configure({ resizable: false }),
      TableRow, TableHeader, TableCell,
      Placeholder.configure({ placeholder: "Start writing your document…" }),
      CharacterCount,
    ],
    editable: isEditable,
    onUpdate: ({ editor: ed }) => {
      if (!isEditable) return;
      setSaveState("saving");
      if (autosaveRef.current) clearTimeout(autosaveRef.current);
      autosaveRef.current = setTimeout(async () => {
        try {
          const json = JSON.stringify(ed.getJSON());
          await documentContentStore.putEditorContent(docId, json);
          setSaveState("saved");
          // Audit autosave quietly (no toast)
          const aud = newAuditId();
          auditReg.add({
            id: aud, event_id: aud,
            entity_type: "Document", entity_id: docId,
            action: "Autosaved",
            actor: "current_user", actor_role: "User",
            timestamp: new Date().toISOString(), ip_address: "",
            details: "", approval_status: "Logged",
          });
        } catch {
          setSaveState("error");
        }
      }, 1500);
    },
  }, [isEditable]);

  // Keep editorRef current so async callbacks always access the live editor instance.
  useEffect(() => {
    editorRef.current = editor;
  });

  useEffect(() => {
    editor?.setEditable(isEditable);
  }, [editor, isEditable]);

  // ── Load content ──
  useEffect(() => {
    loadDocumentContent(doc).then(({ content, isHtml, banner }) => {
      if (banner) setConvertBanner(banner);
      const ed = editorRef.current;
      if (content && ed) {
        if (isHtml) {
          ed.commands.setContent(content);
        } else {
          try { ed.commands.setContent(JSON.parse(content)); }
          catch { ed.commands.setContent(content); }
        }
      }
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  // ── Save Version ──
  const handleSaveVersion = useCallback(async () => {
    const num    = parseFloat(doc.version ?? "1.0") + 0.1;
    const newVer = num.toFixed(1);
    const verId  = `DV-${Date.now()}`;
    versionReg.add({
      id: verId, version_id: verId, document_id: docId,
      document_name: title,
      version_number: newVer,
      change_summary: "Manual save",
      created_by: "current_user",
      created_at: new Date().toISOString(),
      approval_status: doc.approval_status ?? "Draft",
      snapshot_type: "manual",
      is_named: false,
    });
    docRegistry.update(doc.id, { version: newVer, last_modified_at: new Date().toISOString() });

    // Save snapshot to IndexedDB for future comparison
    if (editor) {
      try {
        const html = editor.getHTML();
        await documentContentStore.putVersionSnapshot(docId, verId, html);
      } catch { /* non-critical */ }
    }

    // Audit event
    const aud = newAuditId();
    auditReg.add({
      id: aud, event_id: aud,
      entity_type: "Document", entity_id: docId,
      action: "Version created",
      actor: "current_user", actor_role: "User",
      timestamp: new Date().toISOString(), ip_address: "",
      details: `Manual version v${newVer}`,
      approval_status: "Logged",
    });

    toast.success(`Version v${newVer} saved.`);
  }, [doc, docId, title, versionReg, docRegistry, auditReg, editor]);

  // ── Save title on blur ──
  const handleTitleBlur = useCallback(() => {
    if (title.trim() && title !== doc.doc_name) {
      docRegistry.update(doc.id, { doc_name: title });
    }
  }, [title, doc.doc_name, doc.id, docRegistry]);

  // Non-rich-text formats: delegate to DocumentWorkspaceRouter
  // (pdf, spreadsheet, presentation, image, unsupported)
  if (wsType !== "rich-text") {
    return (
      <DocumentWorkspaceRouter
        document={doc}
        provider={provider}
        canEdit={caps.editing && !isLocked}
        onClose={onClose}
        onRichText={() => { /* wsType is never rich-text here */ }}
      />
    );
  }

  return (
    <div className="doc-editor">

      {/* ── Header ── */}
      <div className="doc-editor__head">
        <div className="doc-editor__head-left">
          <button type="button" className="doc-editor__back-btn" onClick={onClose} aria-label="Back to library">
            <ArrowLeft size={16} strokeWidth={2} />
          </button>
          <div className="doc-editor__head-icon"><FileText size={15} strokeWidth={1.75} /></div>
          <input
            className="doc-editor__head-title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            aria-label="Document title"
            disabled={isLocked}
          />
          <span className="doc-editor__head-ver">v{doc.version}</span>
        </div>

        <div className="doc-editor__head-center">
          <SaveIndicator state={loading ? "saving" : saveState} />
          <span className="doc-editor__head-mode">
            {isLocked ? "Locked" : mode === "editing" ? "Editing" : "Viewing"}
          </span>
        </div>

        <div className="doc-editor__head-right">
          {caps.comments && (
            <button type="button" className="doc-editor__head-btn" title="Comments"
              aria-pressed={rightPanel === "comments"}
              onClick={() => setRightPanel(p => p === "comments" ? null : "comments")}
            >
              <MessageSquare size={15} strokeWidth={2} />
            </button>
          )}
          {caps.versioning && (
            <button type="button" className="doc-editor__head-btn" title="Versions"
              aria-pressed={rightPanel === "versions"}
              onClick={() => setRightPanel(p => p === "versions" ? null : "versions")}
            >
              <History size={15} strokeWidth={2} />
            </button>
          )}
          <button type="button" className="doc-editor__head-btn" title="Workflow"
            aria-pressed={rightPanel === "approvals"}
            onClick={() => setRightPanel(p => p === "approvals" ? null : "approvals")}
          >
            <GitBranch size={15} strokeWidth={2} />
          </button>
          <button type="button" className="doc-editor__head-btn" title="Activity"
            aria-pressed={rightPanel === "activity"}
            onClick={() => setRightPanel(p => p === "activity" ? null : "activity")}
          >
            <Activity size={15} strokeWidth={2} />
          </button>
          <div className="doc-editor__head-divider" />
          {caps.editing && !isLocked && (
            <>
              <button
                type="button"
                className={`doc-editor__head-btn doc-editor__head-btn--mode${mode === "editing" ? " doc-editor__head-btn--mode-active" : ""}`}
                onClick={() => setMode(m => m === "editing" ? "viewing" : "editing")}
                title={mode === "editing" ? "Switch to viewing mode" : "Switch to editing mode"}
              >
                {mode === "editing" ? <Eye size={14} strokeWidth={2} /> : <EyeOff size={14} strokeWidth={2} />}
                <span>{mode === "editing" ? "Editing" : "Viewing"}</span>
              </button>
              <Button variant="secondary" size="sm" leadingIcon={History} onClick={handleSaveVersion}>
                Save Version
              </Button>
            </>
          )}
          <Button variant="primary" size="sm" leadingIcon={Share2}>Share</Button>
          <button type="button" className="doc-editor__head-btn" title="More actions">
            <MoreHorizontal size={15} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* ── Banners ── */}
      {isLocked && <LockedBanner />}
      {!isLocked && convertBanner && (
        <ConvertBanner message={convertBanner} onDismiss={() => setConvertBanner(null)} />
      )}

      {/* ── Workspace ── */}
      <div className="doc-editor__workspace">

        {/* Left panel icon rail */}
        <div className="doc-editor__left-rail">
          {[
            { id: "outline",   Icon: AlignLeft, label: "Outline"   },
            { id: "sections",  Icon: Columns,   label: "Sections"  },
            { id: "bookmarks", Icon: Bookmark,  label: "Bookmarks" },
          ].map(({ id, Icon, label }) => (
            <button
              key={id}
              type="button"
              className={`doc-editor__rail-btn${leftPanel === id ? " doc-editor__rail-btn--active" : ""}`}
              title={label} aria-label={label}
              onClick={() => setLeftPanel(p => p === id ? null : id as LeftPanel)}
            >
              <Icon size={16} strokeWidth={1.75} />
            </button>
          ))}
        </div>

        {/* Left panel body */}
        {leftPanel && (
          <EditorLeftPanel panel={leftPanel} editor={editor} onClose={() => setLeftPanel(null)} />
        )}

        {/* Main editing area */}
        <div className="doc-editor__main">
          {isEditable && <EditorToolbar editor={editor} disabled={!isEditable} />}

          <div className="doc-editor__canvas-wrap">
            {loading ? (
              <div className="doc-editor__loading">
                <Loader2 size={22} className="spin-icon" strokeWidth={1.75} />
                <span>Loading document…</span>
              </div>
            ) : (
              <div className="doc-editor__canvas">
                <EditorContent editor={editor} className="doc-editor__prosemirror-wrap" />
              </div>
            )}
          </div>
        </div>

        {/* Right panel body */}
        {rightPanel && (
          <EditorRightPanel
            panel={rightPanel}
            doc={doc}
            editor={editor}
            caps={caps}
            onClose={() => setRightPanel(null)}
          />
        )}

        {/* Right panel icon rail */}
        <div className="doc-editor__right-rail">
          {[
            { id: "comments",  Icon: MessageSquare, label: "Comments"  },
            { id: "versions",  Icon: History,       label: "Versions"  },
            { id: "approvals", Icon: GitBranch,     label: "Workflow"  },
            { id: "activity",  Icon: Activity,      label: "Activity"  },
          ].map(({ id, Icon, label }) => (
            <button
              key={id}
              type="button"
              className={`doc-editor__rail-btn${rightPanel === id ? " doc-editor__rail-btn--active" : ""}`}
              title={label} aria-label={label}
              onClick={() => setRightPanel(p => p === id ? null : id as RightPanel)}
            >
              <Icon size={16} strokeWidth={1.75} />
            </button>
          ))}
        </div>

      </div>

      {/* ── Status bar ── */}
      <EditorStatusBar editor={editor} providerLabel={provider.label} online={online} />

    </div>
  );
}

// ── Not found ──────────────────────────────────────────────────────────────────

function DocumentNotFound({ onClose }: { onClose: () => void }) {
  return (
    <div className="doc-editor">
      <div className="doc-editor__head">
        <button type="button" className="doc-editor__back-btn" onClick={onClose}>
          <ArrowLeft size={16} strokeWidth={2} />
        </button>
        <span className="doc-editor__head-title">Document not found</span>
      </div>
      <div className="doc-editor__no-edit">
        <AlertCircle size={40} strokeWidth={1.25} style={{ opacity: 0.4, marginBottom: "0.75rem" }} />
        <h2 className="doc-editor__no-edit-title">Document Not Found</h2>
        <p className="doc-editor__no-edit-msg">The document may have been deleted or you may not have access.</p>
        <Button variant="secondary" size="md" leadingIcon={ArrowLeft} onClick={onClose}>Back to Library</Button>
      </div>
    </div>
  );
}

// ── Page (route component) ─────────────────────────────────────────────────────

export function DocumentEditorPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate       = useNavigate();
  const registry       = useDocumentRegistry();

  const doc = useMemo(
    () => registry.items.find(d => d.doc_id === documentId || d.id === documentId) ?? null,
    [registry.items, documentId],
  );

  const handleClose = useCallback(() => { navigate(-1); }, [navigate]);

  return (
    <FullScreenWorkspaceShell
      open={true}
      title={doc?.doc_name ?? "Document Editor"}
      onClose={handleClose}
    >
      {doc
        ? <DocumentEditorShell doc={doc} onClose={handleClose} />
        : <DocumentNotFound onClose={handleClose} />
      }
    </FullScreenWorkspaceShell>
  );
}
