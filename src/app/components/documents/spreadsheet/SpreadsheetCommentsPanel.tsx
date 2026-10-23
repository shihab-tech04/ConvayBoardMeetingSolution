/**
 * Spreadsheet comments panel — uses the shared DocumentCommentThread registry.
 * Comments can be anchored to a cell, a range, or a sheet.
 * Selecting a comment navigates to the correct sheet and cell.
 */
import { useState, useMemo } from "react";
import { MessageSquare, Check, RotateCcw, ChevronRight } from "lucide-react";
import { useDocumentCommentRegistry } from "../../../data/documentWorkspaceData";
import { useAuditEventRegistry } from "../../../data/boardMeetingData";

interface Props {
  docId: string;
  activeSheetId: string;
  activeSheetName: string;
  activeCell: string;
  onNavigate: (sheetId: string, cell: string) => void;
}

export function SpreadsheetCommentsPanel({
  docId, activeSheetId, activeSheetName, activeCell, onNavigate,
}: Props) {
  const reg      = useDocumentCommentRegistry();
  const auditReg = useAuditEventRegistry();
  const [body,   setBody]   = useState("");
  const [filter, setFilter] = useState<"all" | "open">("open");

  const threads = useMemo(() => {
    return reg.items
      .filter(t => {
        if (t.document_id !== docId) return false;
        if (filter === "open" && t.status === "resolved") return false;
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [reg.items, docId, filter]);

  function postComment() {
    if (!body.trim()) return;
    const id = `CT-${Date.now()}`;
    reg.add({
      id, thread_id: id,
      document_id: docId,
      anchor_type: "spreadsheet-cell",
      anchor_data: {
        sheetId:   activeSheetId,
        sheetName: activeSheetName,
        startCell: activeCell,
        endCell:   activeCell,
      },
      status: "open",
      created_by: "current_user",
      created_at: new Date().toISOString(),
      body: body.trim(),
      replies: [], mentions: [],
    });
    const aid = `AUD-${Date.now()}`;
    auditReg.add({ id: aid, event_id: aid, entity_type: "Document", entity_id: docId,
      action: "Comment added", actor: "current_user", actor_role: "User",
      timestamp: new Date().toISOString(), ip_address: "",
      details: `${activeSheetName}!${activeCell}`, approval_status: "Logged" });
    setBody("");
  }

  function toggleResolve(threadId: string, current: string) {
    reg.update(threadId, { status: current === "resolved" ? "reopened" : "resolved" });
  }

  return (
    <div className="pdf-panel">
      <div className="pdf-panel__head">
        <MessageSquare size={13} strokeWidth={2} aria-hidden="true" />
        <span>Comments</span>
        <select className="pdf-panel__filter" value={filter} aria-label="Filter comments"
          onChange={e => setFilter(e.target.value as typeof filter)}>
          <option value="open">Open</option>
          <option value="all">All</option>
        </select>
      </div>
      <div className="pdf-panel__body">
        <div className="pdf-panel__add-form">
          <p className="pdf-panel__add-hint">
            Comment on {activeSheetName}!{activeCell}
          </p>
          <textarea
            className="pdf-panel__note-input"
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Add a comment…"
            rows={2}
            aria-label="New comment"
          />
          <button type="button" className="btn btn--primary btn--sm" onClick={postComment}>Post</button>
        </div>

        {threads.length === 0 ? (
          <p className="pdf-panel__empty">No comments yet.</p>
        ) : (
          <ul className="pdf-panel__list" aria-label="Comments">
            {threads.map(t => {
              const ad = t.anchor_data;
              return (
                <li key={t.id} className={`pdf-panel__item${t.status === "resolved" ? " pdf-panel__item--resolved" : ""}`}>
                  <div className="pdf-panel__item-head">
                    <span className="pdf-panel__item-author">{t.created_by}</span>
                    {ad?.sheetId && ad.startCell && (
                      <button type="button" className="pdf-panel__item-page-link"
                        onClick={() => onNavigate(ad.sheetId!, ad.startCell!)}
                        aria-label={`Go to ${ad.sheetName}!${ad.startCell}`}
                      >
                        {ad.sheetName}!{ad.startCell}
                        <ChevronRight size={10} strokeWidth={2.5} />
                      </button>
                    )}
                    <button type="button" className="pdf-panel__item-resolve"
                      onClick={() => toggleResolve(t.id, t.status)}
                      aria-label={t.status === "resolved" ? "Reopen" : "Resolve"}>
                      {t.status === "resolved"
                        ? <RotateCcw size={12} strokeWidth={2.5} />
                        : <Check     size={12} strokeWidth={2.5} />}
                    </button>
                  </div>
                  <p className="pdf-panel__item-note">{t.body}</p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
