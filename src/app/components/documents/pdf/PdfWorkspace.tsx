/**
 * PdfWorkspace — Document Library wrapper around PdfViewerCore.
 *
 * Maps BoardDocument + IEditorProvider → PdfViewerCoreProps.
 * Handles ONLYOFFICE delegation when the provider is available.
 *
 * For generic / attachment PDFs use PdfViewerCore directly (via UnifiedDocumentViewer).
 */

import { useMemo } from "react";
import { toast } from "sonner";
import { ArrowLeft, FileText } from "lucide-react";
import type { BoardDocument } from "../../../data/boardMeetingData";
import type { IEditorProvider, EditorCapabilities } from "../editor/DocumentEditorProvider";
import { getCapabilitiesForDocument } from "../editor/DocumentEditorProvider";
import { OnlyOfficeEditorFrame } from "../editor/OnlyOfficeEditorFrame";
import { getOnlyOfficeDocumentType } from "../../../utils/documentFormat";
import type { DocumentSource } from "../documentSource";
import { PdfViewerCore, type PdfPermissions } from "./PdfViewerCore";

// ── Default capabilities when no BoardDocument is available ───────────────────

const ATTACHMENT_PDF_CAPS: EditorCapabilities = {
  editing:               false,
  comments:              false,
  anchoredComments:      false,
  versioning:            false,
  trackedChanges:        false,
  realTimeCollaboration: false,
  docxFidelity:          false,
  versionComparison:     false,
  pdfViewing:            true,
  pdfAnnotations:        true,
  pdfTextEditing:        false,
  pdfForms:              false,
  pdfSignatures:         false,
  spreadsheetEditing:    false,
  spreadsheetFormulas:   false,
  spreadsheetComments:   false,
  spreadsheetImport:     false,
  spreadsheetExport:     false,
};

const LOCAL_PROVIDER: IEditorProvider = {
  id:           "local",
  name:         "local",
  label:        "Local PDF Viewer",
  capabilities: ATTACHMENT_PDF_CAPS,
  isAvailable:  false,
};

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  /** Document Library path — provide the full BoardDocument. */
  doc?: BoardDocument;
  /**
   * Generic / attachment path — provide a DocumentSource directly.
   * When both doc and source are provided, source takes priority for file loading.
   */
  source?: DocumentSource;
  /** Shown in the header when no doc is provided. */
  title?: string;
  version?: string;
  /** Used for audit events and annotation storage when no doc is provided. */
  documentId?: string;
  /** Defaults to the local-only provider when omitted. */
  provider?: IEditorProvider;
  onClose: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function PdfWorkspace({ doc, source, title, version, documentId, provider, onClose }: Props) {
  const docId      = doc?.doc_id ?? doc?.id ?? documentId ?? "";
  const docTitle   = doc?.doc_name ?? title ?? "Document";
  const docVersion = doc?.version ?? version;
  const isLocked   = doc?.is_locked ?? false;

  const effectiveProvider = provider ?? LOCAL_PROVIDER;

  const caps: EditorCapabilities = useMemo(() => {
    if (!doc) return ATTACHMENT_PDF_CAPS;
    return getCapabilitiesForDocument(effectiveProvider, doc);
  }, [effectiveProvider, doc]);

  const effectiveSource: DocumentSource = useMemo(
    () => source ?? { kind: "stored", documentId: docId },
    [source, docId],
  );

  const permissions: PdfPermissions = useMemo(() => ({
    download: true,
    print:    true,
    annotate: caps.pdfAnnotations && !isLocked,
    comment:  caps.comments,
    versions: caps.versioning,
    workflow: !!doc,
  }), [caps, isLocked, doc]);

  // ── ONLYOFFICE delegation ─────────────────────────────────────────────────

  if (effectiveProvider.isAvailable && effectiveProvider.id === "onlyoffice" && doc) {
    const _type = getOnlyOfficeDocumentType("pdf");
    return (
      <div className="doc-workspace doc-workspace--pdf">
        <div className="doc-workspace__head">
          <button type="button" className="doc-editor__back-btn" onClick={onClose} aria-label="Back">
            <ArrowLeft size={16} strokeWidth={2} />
          </button>
          <div className="doc-workspace__head-icon"><FileText size={15} strokeWidth={1.75} /></div>
          <span className="doc-workspace__head-title">{docTitle}</span>
          <span className="doc-workspace__head-badge">PDF · ONLYOFFICE</span>
        </div>
        <OnlyOfficeEditorFrame
          documentId={docId}
          documentTitle={docTitle}
          documentServerUrl={effectiveProvider.documentServerUrl ?? ""}
          apiBaseUrl={effectiveProvider.apiBaseUrl ?? "/api/v1"}
          capabilities={caps}
          mode={isLocked ? "view" : "edit"}
          onReady={() => toast.success("ONLYOFFICE ready")}
        />
      </div>
    );
  }

  // ── Delegate to PdfViewerCore ─────────────────────────────────────────────

  return (
    <PdfViewerCore
      source={effectiveSource}
      documentId={docId || undefined}
      title={docTitle}
      version={docVersion}
      permissions={permissions}
      onClose={onClose}
    />
  );
}
