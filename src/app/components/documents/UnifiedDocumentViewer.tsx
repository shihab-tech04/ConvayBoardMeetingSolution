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

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Download } from "lucide-react";
import type { DocumentSource } from "./documentSource";
import { getSourceFileName, getSourceMimeType } from "./documentSource";
import { PdfViewerCore } from "./pdf/PdfViewerCore";

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
        documentId={documentId}
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
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;

    async function load() {
      const { resolveDocumentFile } = await import("./documentSource");
      try {
        const file = await resolveDocumentFile(source);
        objectUrl = URL.createObjectURL(file);
        urlRef.current = objectUrl;
        const img = document.getElementById("unified-viewer-image") as HTMLImageElement | null;
        if (img) img.src = objectUrl;
      } catch { /* image won't load — img will show alt text */ }
    }

    void load();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        {/* src filled in by the useEffect above once the blob URL is ready */}
        <img
          id="unified-viewer-image"
          src=""
          alt={title}
          className="unified-doc-viewer__image"
        />
      </div>
    </div>
  );
}

// ── Unsupported / missing-content state ───────────────────────────────────────

function UnsupportedViewer({
  title, documentId, downloadName, onClose,
}: {
  title: string;
  documentId?: string;
  downloadName?: string;
  onClose: () => void;
}) {
  async function handleDownload() {
    if (!documentId) return;
    try {
      const { documentContentStore } = await import("../../services/repositories/documentContentStore");
      const file = await documentContentStore.getOriginalFile(documentId);
      if (!file) return;
      const url = URL.createObjectURL(file);
      const a   = document.createElement("a");
      a.href     = url;
      a.download = (file instanceof File ? file.name : null) ?? downloadName ?? title;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 15_000);
    } catch { /* silently ignore */ }
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
          onClick={handleDownload}
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
