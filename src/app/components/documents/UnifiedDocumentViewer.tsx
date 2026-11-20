/**
 * UnifiedDocumentViewer — renders a DocumentSource through the correct workspace,
 * mounted as a full-screen portal above the current UI.
 *
 * Format routing:
 *   PDF                 → PdfViewerCore
 *   Image               → ImageViewer
 *   Everything else     → UnsupportedViewer (with download)
 *
 * For source.kind === "stored", the caller must provide mimeType and/or fileName
 * so the format can be detected correctly. Without these hints the file is treated
 * as unsupported rather than blindly sent to the PDF viewer.
 *
 * Does NOT replace DocumentEditorPage for the Document Library flow.
 * Does NOT use <iframe>, <object>, or <embed> for PDFs.
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Download } from "lucide-react";
import type { DocumentSource } from "./documentSource";
import { getSourceFileName, getSourceMimeType } from "./documentSource";
import { PdfViewerCore } from "./pdf/PdfViewerCore";
import { startScopedDocumentImageLoad } from "./documentImageLoad";
import { resolveDocumentFile } from "./documentSource";
import { toast } from "sonner";

// ── Format helpers ────────────────────────────────────────────────────────────

const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"];

type ResolvedFormat = "pdf" | "image" | "unsupported";

/**
 * Determine the rendering format using source properties first, then optional
 * document-level hints (required when source.kind === "stored").
 */
function resolveFormat(
  source: DocumentSource,
  mimeHint?: string,
  fileNameHint?: string,
): ResolvedFormat {
  const mime = getSourceMimeType(source) || mimeHint || "";
  const name = (getSourceFileName(source) || fileNameHint || "").toLowerCase();

  if (mime === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (mime.startsWith("image/") || IMAGE_EXTS.some(e => name.endsWith(e))) return "image";
  return "unsupported";
}

// ── Props ──────────────────────────────────────────────────────────────────────

export interface UnifiedDocumentViewerProps {
  source:       DocumentSource;
  title:        string;
  version?:     string;
  documentId?:  string;
  /**
   * MIME type of the stored file — required when source.kind === "stored" so
   * the viewer can route to the correct workspace instead of defaulting to PDF.
   */
  mimeType?:    string;
  /**
   * Original file name — used as a fallback for format detection when MIME type
   * is unavailable. Also used as the download filename.
   */
  fileName?:    string;
  onClose:      () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function UnifiedDocumentViewer({
  source,
  title,
  version,
  documentId,
  mimeType,
  fileName,
  onClose,
}: UnifiedDocumentViewerProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const format = resolveFormat(source, mimeType, fileName);

  let content: React.ReactNode;

  if (format === "pdf") {
    content = (
      <PdfViewerCore
        source={source}
        documentId={documentId}
        title={title}
        version={version}
        permissions={{
          download: true,
          print:    true,
          annotate: true,
          comment:  false,
          versions: false,
          workflow: false,
        }}
        onClose={onClose}
      />
    );
  } else if (format === "image") {
    content = (
      <ImageViewer source={source} title={title} onClose={onClose} />
    );
  } else {
    content = (
      <UnsupportedViewer
        title={title}
        documentId={source.kind === "stored" ? source.documentId : documentId}
        versionId={source.kind === "stored" ? source.versionId : undefined}
        downloadName={fileName ?? title}
        onClose={onClose}
      />
    );
  }

  return createPortal(
    <div
      className="unified-doc-viewer"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {content}
    </div>,
    document.body,
  );
}

// ── Image viewer ──────────────────────────────────────────────────────────────

function ImageViewer({ source, title, onClose }: {
  source: DocumentSource; title: string; onClose: () => void;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    setImageUrl(null);
    setLoadError(false);
    // Never update a newly mounted viewer with the bytes of a closed or
    // superseded document. Every created object URL is revoked on teardown.
    const pending = startScopedDocumentImageLoad(
      () => resolveDocumentFile(source),
      file => URL.createObjectURL(file),
      url => URL.revokeObjectURL(url),
      url => setImageUrl(url),
      () => setLoadError(true),
    );
    return pending.cancel;
  }, [source, retry]);

  return (
    <div className="unified-doc-viewer__image-shell">
      <div className="unified-doc-viewer__image-header">
        <span className="unified-doc-viewer__image-title">{title}</span>
        <button
          type="button"
          className="unified-doc-viewer__close-btn"
          onClick={onClose}
          aria-label="Close viewer"
        >
          <X size={18} strokeWidth={2} />
        </button>
      </div>
      <div className="unified-doc-viewer__image-body">
        {loadError ? (
          <div role="alert">
            The requested image could not be loaded. Check your access and try again.
            <button type="button" onClick={() => setRetry(value => value + 1)}>Retry</button>
          </div>
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="unified-doc-viewer__image"
            onError={() => setLoadError(true)}
          />
        ) : (
          <div role="status">Loading document image…</div>
        )}
      </div>
    </div>
  );
}

// ── Unsupported / missing-content state ───────────────────────────────────────

function UnsupportedViewer({
  title, documentId, versionId, downloadName, onClose,
}: {
  title: string;
  documentId?: string;
  versionId?: string;
  downloadName?: string;
  onClose: () => void;
}) {
  const [downloading, setDownloading] = useState(false);
  async function handleDownload() {
    if (!documentId || downloading) return;
    setDownloading(true);
    try {
      const { documentContentStore } = await import("../../services/repositories/documentContentStore");
      // Never load latest when the viewer was opened for a frozen version.
      const file = await documentContentStore.getOriginalFile(documentId, versionId);
      if (!file) throw new Error("Original file unavailable");
      const url = URL.createObjectURL(file);
      const a   = document.createElement("a");
      a.href     = url;
      a.download = (file instanceof File ? file.name : null) ?? downloadName ?? title;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 15_000);
    } catch {
      toast.error("Unable to download this document version. Check access and retry.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="unified-doc-viewer__unsupported">
      <button
        type="button"
        className="unified-doc-viewer__close-btn unified-doc-viewer__close-btn--top"
        onClick={onClose}
        aria-label="Close viewer"
      >
        <X size={18} strokeWidth={2} />
      </button>
      <p className="unified-doc-viewer__unsupported-title">{title}</p>
      <p className="unified-doc-viewer__unsupported-desc">
        Preview is not available for this file type.
      </p>
      {documentId && (
        <button
          type="button"
          onClick={() => { void handleDownload(); }}
          disabled={downloading}
          style={{
            marginTop: "1.25rem", display: "inline-flex", alignItems: "center",
            gap: 6, padding: "9px 20px", borderRadius: 8,
            border: "1px solid var(--color-border)", background: "var(--color-card)",
            cursor: "pointer", fontSize: "0.85rem", fontWeight: 500,
            color: "var(--color-foreground)",
          }}
        >
          <Download size={14} strokeWidth={1.75} />
          Download to open locally
        </button>
      )}
    </div>
  );
}
