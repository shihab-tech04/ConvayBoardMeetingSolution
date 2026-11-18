/**
 * PDF comments panel — reuses DocumentCommentThread registry.
 * Supports page-anchored, region-anchored, and general PDF comments.
 * Comment click navigates back to the correct page.
 */
import { useState, useMemo, useRef } from "react";
import { MessageSquare, Check, RotateCcw, ChevronRight } from "lucide-react";
import { useDocumentCommentRegistry } from "../../../data/documentWorkspaceData";
import { useAuditEventRegistry } from "../../../data/boardMeetingData";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import { toast } from "sonner";
import { matchesPdfCommentFilter, savePdfCommentWithAudit } from "./pdfCommentActions";

interface Props {
  docId: string;
  currentPage: number;
  onNavigateToPage: (page: number) => void;
}

export function PdfCommentsPanel({ docId, currentPage, onNavigateToPage }: Props) {
  const reg     = useDocumentCommentRegistry();
  const auditReg = useAuditEventRegistry();
  const currentUser = useCurrentUser();
  const [body,   setBody]   = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "mine">("open");
  const [posting, setPosting] = useState(false);
  const [updatingThreadId, setUpdatingThreadId] = useState<string | null>(null);
  const postInFlight = useRef(false);
  const updateInFlight = useRef(false);

  const threads = useMemo(() => {
    return reg.items
      .filter(t => {
        return matchesPdfCommentFilter(t, docId, filter, currentUser.name);
      })
      .sort((a, b) => {
        const pa = a.anchor_data?.page ?? 999;
        const pb = b.anchor_data?.page ?? 999;
        return pa !== pb ? pa - pb : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [reg.items, docId, filter, currentUser.name]);

  async function postComment() {
    const message = body.trim();
    if (!message || postInFlight.current) return;
    const author = currentUser.name.trim();
    if (!author) { toast.error("Comment author is unavailable. Refresh and try again."); return; }

    postInFlight.current = true;
    setPosting(true);
    const now = new Date().toISOString();
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const id = `CT-${unique}`;
    const auditId = `AUD-${unique}`;
    try {
      const result = await savePdfCommentWithAudit(
        () => reg.add({
          id, thread_id: id,
          document_id: docId,
          anchor_type: "pdf-region",
          anchor_data: { page: currentPage },
          status: "open",
          created_by: author,
          created_at: now,
          body: message,
          replies: [], mentions: [],
        }),
        () => auditReg.add({
          id: auditId, event_id: auditId, entity_type: "Document", entity_id: docId,
          action: "PDF comment added", actor: author,
          actor_role: currentUser.role || currentUser.designation || "User",
          timestamp: now, ip_address: "", details: `Page ${currentPage}`,
          approval_status: "Logged",
        }),
      );
      if (!result.commentSaved) return; // Keep draft; server registry reports the error.
      setBody("");
      if (result.auditSaved) toast.success("Comment posted.");
      else toast.warning("Comment saved, but audit logging could not be verified.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save comment.");
    } finally {
      postInFlight.current = false;
      setPosting(false);
    }
  }

  async function toggleResolve(threadId: string, current: string) {
    if (updateInFlight.current) return;
    updateInFlight.current = true;
    setUpdatingThreadId(threadId);
    try {
      await reg.update(threadId, { status: current === "resolved" ? "reopened" : "resolved" });
    } finally {
      updateInFlight.current = false;
      setUpdatingThreadId(null);
    }
  }

  return (
    <div className="pdf-panel">
      <div className="pdf-panel__head">
        <MessageSquare size={13} strokeWidth={2} aria-hidden="true" />
        <span>Comments</span>
        <select
          className="pdf-panel__filter"
          value={filter}
          aria-label="Filter comments"
          onChange={e => setFilter(e.target.value as typeof filter)}
        >
          <option value="open">Open</option>
          <option value="all">All</option>
          <option value="mine">Mine</option>
        </select>
      </div>

      <div className="pdf-panel__body">
        {/* Add comment on current page */}
        <div className="pdf-panel__add-form">
          <p className="pdf-panel__add-hint">Comment on page {currentPage}</p>
          <textarea
            className="pdf-panel__note-input"
            value={body}
            onChange={e => setBody(e.target.value)}
            disabled={posting}
            placeholder="Add a comment…"
            rows={2}
            aria-label="New comment body"
            onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) void postComment(); }}
          />
          <button type="button" className="btn btn--primary btn--sm" onClick={() => void postComment()} disabled={posting || !body.trim()}>{posting ? "Posting…" : "Post"}</button>
        </div>

        {threads.length === 0 ? (
          <p className="pdf-panel__empty">No {filter === "open" ? "open " : ""}comments.</p>
        ) : (
          <ul className="pdf-panel__list" aria-label="Comment threads">
            {threads.map(t => {
              const page = t.anchor_data?.page;
              return (
                <li key={t.id} className={`pdf-panel__item${t.status === "resolved" ? " pdf-panel__item--resolved" : ""}`}>
                  <div className="pdf-panel__item-head">
                    <span className="pdf-panel__item-author">{t.created_by}</span>
                    {page && (
                      <button type="button" className="pdf-panel__item-page-link"
                        onClick={() => onNavigateToPage(page)}
                        aria-label={`Go to page ${page}`}
                      >
                        pg {page} <ChevronRight size={10} strokeWidth={2.5} />
                      </button>
                    )}
                    <button type="button"
                      className="pdf-panel__item-resolve"
                      onClick={() => void toggleResolve(t.id, t.status)}
                      disabled={updatingThreadId !== null}
                      aria-label={t.status === "resolved" ? "Reopen comment" : "Resolve comment"}
                    >
                      {t.status === "resolved"
                        ? <RotateCcw size={12} strokeWidth={2.5} />
                        : <Check     size={12} strokeWidth={2.5} />}
                    </button>
                  </div>
                  <p className="pdf-panel__item-note">{t.body}</p>
                  {t.replies.length > 0 && (
                    <p className="pdf-panel__item-replies">{t.replies.length} repl{t.replies.length === 1 ? "y" : "ies"}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
