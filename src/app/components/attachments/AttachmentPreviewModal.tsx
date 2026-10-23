import { FileText, ExternalLink, Download } from "lucide-react";
import { AppModal } from "../modals/AppModal";
import type { AttachmentItem } from "./attachmentTypes";
import { Button } from "../buttons/Button";

interface AttachmentPreviewModalProps {
  attachment: AttachmentItem | null;
  onClose: () => void;
}

export function AttachmentPreviewModal({ attachment, onClose }: AttachmentPreviewModalProps) {

  if (!attachment) return null;

  const footer = attachment.objectUrl ? (
    <div style={{ display: "flex", gap: 8 }}>
      <a href={attachment.objectUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "contents" }}>
        <Button variant="secondary" size="sm" leadingIcon={ExternalLink}>{"Open"}</Button>
      </a>
      <a href={attachment.objectUrl} download={attachment.name} style={{ textDecoration: "none", display: "contents" }}>
        <Button variant="primary" size="lg" leadingIcon={Download}>{"Download"}</Button>
      </a>
    </div>
  ) : undefined;

  return (
    <AppModal
      open
      title={attachment.name}
      onClose={onClose}
      size="xl"
      layer="top"
      footer={footer}
    >
      <div className="attachment-preview">
        {attachment.previewKind === "image" && attachment.objectUrl ? (
          <img
            src={attachment.objectUrl}
            alt="Image preview"
            className="attachment-preview__image"
          />
        ) : attachment.previewKind === "pdf" ? (
          // PDFs are opened through UnifiedDocumentViewer (full-screen PDF.js viewer).
          // AttachmentList handles the routing — this modal is not shown for PDFs.
          <div className="attachment-preview__empty">
            <FileText size={40} strokeWidth={1.2} aria-hidden="true" />
            <p className="attachment-preview__empty-title">{attachment.name}</p>
            <p className="attachment-preview__empty-desc">
              Use the View button in the attachment list to open this PDF.
            </p>
          </div>
        ) : (
          <div className="attachment-preview__empty">
            <FileText size={40} strokeWidth={1.2} aria-hidden="true" />
            <p className="attachment-preview__empty-title">{attachment.name}</p>
            <p className="attachment-preview__empty-desc">
              {attachment.previewKind === "office"
                ? "Office document preview is not available in this static frontend."
                : !attachment.objectUrl
                  ? "File preview is not available because only file metadata is stored."
                  : "Preview unavailable for this file"}
            </p>
          </div>
        )}
      </div>
    </AppModal>
  );
}
