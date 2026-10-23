import { useState } from "react";
import { FileText, Image, FileCheck, Eye, ExternalLink, Download, Paperclip } from "lucide-react";
import type { AttachmentItem } from "./attachmentTypes";
import type { DocumentSource } from "../documents/documentSource";
import { AttachmentPreviewModal } from "./AttachmentPreviewModal";
import { UnifiedDocumentViewer } from "../documents/UnifiedDocumentViewer";

interface AttachmentListProps {
  attachments: AttachmentItem[];
  title?: string;
  emptyText?: string;
}

function FileIcon({ kind }: { kind: AttachmentItem["previewKind"] }) {
  if (kind === "image") return <Image size={16} strokeWidth={1.5} aria-hidden="true" />;
  if (kind === "pdf")   return <FileCheck size={16} strokeWidth={1.5} aria-hidden="true" />;
  return <FileText size={16} strokeWidth={1.5} aria-hidden="true" />;
}

/** Resolve a DocumentSource for an attachment, preferring the stored source over a temporary URL. */
function resolveAttachmentSource(att: AttachmentItem): DocumentSource | null {
  if (att.source) return att.source;
  if (att.objectUrl) {
    return {
      kind:     "url",
      url:      att.objectUrl,
      fileName: att.name,
      mimeType: att.type || (att.previewKind === "pdf" ? "application/pdf" : ""),
    };
  }
  return null;
}

export function AttachmentList({ attachments, title, emptyText }: AttachmentListProps) {
  const [preview,    setPreview]    = useState<AttachmentItem | null>(null);
  const [pdfViewer,  setPdfViewer]  = useState<AttachmentItem | null>(null);

  const sectionTitle = title ?? "Attached Files";
  const countLabel   = attachments.length === 1 ? "1 file" : `${attachments.length} files`;

  const canView    = (att: AttachmentItem) => (att.source != null || att.objectUrl != null) && att.previewKind !== "office";
  const hasActions = (att: AttachmentItem) => att.objectUrl != null || att.source != null;
  const isOffice   = (att: AttachmentItem) => att.previewKind === "office";
  const isMetaOnly = (att: AttachmentItem) => !att.objectUrl && !att.source;

  function handleView(att: AttachmentItem) {
    if (att.previewKind === "pdf") {
      setPdfViewer(att);
    } else {
      setPreview(att);
    }
  }

  return (
    <div className="attachment-list">
      <div className="attachment-list__header">
        <div className="attachment-list__title-row">
          <Paperclip size={14} strokeWidth={2} aria-hidden="true" />
          <span className="attachment-list__title">{sectionTitle}</span>
        </div>
        {attachments.length > 0 && (
          <span className="attachment-list__count">{countLabel}</span>
        )}
      </div>

      {attachments.length === 0 ? (
        <p className="attachment-list__empty">{emptyText ?? "No files attached"}</p>
      ) : (
        <ul className="attachment-list__items" aria-label={sectionTitle}>
          {attachments.map((att) => (
            <li key={att.id} className="attachment-item">
              {/* ── Card body: icon + name + meta ── */}
              <div className="attachment-item__body">
                <span className="attachment-item__icon">
                  <FileIcon kind={att.previewKind} />
                </span>
                <div className="attachment-item__main">
                  <span className="attachment-item__name" title={att.name}>
                    {att.name}
                  </span>
                  <span className="attachment-item__meta">
                    {att.sizeLabel}
                    {att.extension && ` · ${att.extension.replace(".", "").toUpperCase()}`}
                    {att.uploadedAt && ` · ${new Date(att.uploadedAt).toLocaleDateString()}`}
                  </span>
                  {isMetaOnly(att) && (
                    <span className="attachment-item__note">
                      {"File preview is not available because only file metadata is stored."}
                    </span>
                  )}
                  {isOffice(att) && att.objectUrl && (
                    <span className="attachment-item__note">
                      {"Office document preview is not available in this static frontend."}
                    </span>
                  )}
                </div>
              </div>

              {/* ── Card footer: actions ── */}
              {hasActions(att) && (
                <div className="attachment-item__footer">
                  {canView(att) && (
                    <button
                      type="button"
                      className="attachment-item__action"
                      onClick={() => handleView(att)}
                      aria-label={`View ${att.name}`}
                    >
                      <Eye size={12} strokeWidth={2} aria-hidden="true" />
                      <span>{"View"}</span>
                    </button>
                  )}
                  {att.objectUrl && (
                    <>
                      <a
                        href={att.objectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="attachment-item__action"
                        aria-label={`Open ${att.name}`}
                      >
                        <ExternalLink size={12} strokeWidth={2} aria-hidden="true" />
                        <span>{"Open"}</span>
                      </a>
                      <a
                        href={att.objectUrl}
                        download={att.name}
                        className="attachment-item__action attachment-item__action--primary"
                        aria-label={`Download ${att.name}`}
                      >
                        <Download size={12} strokeWidth={2} aria-hidden="true" />
                        <span>{"Download"}</span>
                      </a>
                    </>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Modal for images and other previewable types */}
      <AttachmentPreviewModal attachment={preview} onClose={() => setPreview(null)} />

      {/* Full-screen PDF viewer via shared workspace (no iframe) */}
      {pdfViewer && (() => {
        const src = resolveAttachmentSource(pdfViewer);
        if (!src) return null;
        return (
          <UnifiedDocumentViewer
            source={src}
            title={pdfViewer.name}
            onClose={() => setPdfViewer(null)}
          />
        );
      })()}
    </div>
  );
}
