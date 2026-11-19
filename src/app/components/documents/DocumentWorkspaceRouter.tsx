/**
 * DocumentWorkspaceRouter — routes a document to the correct workspace component
 * based on its detected format.
 *
 * Routing:
 *   pdf         → PdfWorkspace
 *   spreadsheet → SpreadsheetWorkspace
 *   rich-text   → calls onRichText (caller owns Tiptap editor)
 *   presentation / image / unsupported → DocumentUnsupportedWorkspace
 */
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, Presentation, Image, Download } from "lucide-react";
import type { BoardDocument } from "../../data/boardMeetingData";
import type { IEditorProvider } from "./editor/DocumentEditorProvider";
import { getDocumentWorkspaceType, workspaceTypeLabel } from "../../utils/documentFormat";
import { PdfWorkspace } from "./pdf/PdfWorkspace";
import { SpreadsheetWorkspace } from "./spreadsheet/SpreadsheetWorkspace";
import { documentContentStore } from "../../services/repositories/documentContentStore";
import { retrieveOriginalForDownload } from "./documentOriginalDownload";

interface Props {
  document: BoardDocument;
  provider: IEditorProvider;
  canEdit: boolean;
  onClose?: () => void;
  /** Called when the document is a rich-text format; caller renders Tiptap. */
  onRichText: () => void;
}

function DocumentUnsupportedWorkspace({
  document: doc,
}: {
  document: BoardDocument;
}) {
  const wsType = getDocumentWorkspaceType(doc);
  const label  = workspaceTypeLabel(wsType);
  const [downloading, setDownloading] = useState(false);
  const downloadInFlight = useRef(false);

  async function handleDownload() {
    if (downloadInFlight.current) return;
    downloadInFlight.current = true;
    setDownloading(true);
    try {
      await retrieveOriginalForDownload(
        doc.doc_id ?? doc.id,
        doc.file_name ?? doc.doc_name ?? doc.title ?? "document",
        id => documentContentStore.getOriginalFile(id),
        (file, fileName) => {
          const url = URL.createObjectURL(file);
          try {
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = fileName;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
          } finally {
            // Allow the browser to start its download before releasing the object URL.
            window.setTimeout(() => URL.revokeObjectURL(url), 15_000);
          }
        },
      );
    } catch {
      toast.error("Original file is unavailable. Please try again.");
    } finally {
      downloadInFlight.current = false;
      setDownloading(false);
    }
  }

  const Icon =
    wsType === "presentation" ? Presentation :
    wsType === "image"        ? Image :
    FileText;

  return (
    <div className="doc-workspace doc-workspace--unsupported" role="region" aria-label="Unsupported document type">
      <Icon size={40} strokeWidth={1.25} className="doc-workspace__unsupported-icon" aria-hidden="true" />
      <p className="doc-workspace__unsupported-title">{doc.doc_name ?? doc.title}</p>
      <p className="doc-workspace__unsupported-msg">
        {wsType === "presentation"
          ? "Presentation files can be downloaded but are not editable in-app."
          : wsType === "image"
          ? "Images are displayed inline. Open the original file to edit."
          : `${label} files are not supported for in-app editing.`}
      </p>
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        aria-busy={downloading}
        className="btn btn--secondary btn--md"
        aria-label={`Download ${doc.file_name ?? doc.title}`}
      >
        <Download size={14} strokeWidth={2} aria-hidden="true" />
        {downloading ? "Preparing file…" : "Download file"}
      </button>
    </div>
  );
}

export function DocumentWorkspaceRouter({ document: doc, provider, canEdit, onClose, onRichText }: Props) {
  const wsType = useMemo(() => getDocumentWorkspaceType(doc), [doc]);

  if (wsType === "rich-text") {
    // Signal to parent to render Tiptap editor — this component renders nothing.
    onRichText();
    return null;
  }

  if (wsType === "pdf") {
    return (
      <PdfWorkspace
        doc={doc}
        provider={provider}
        onClose={onClose ?? (() => {})}
      />
    );
  }

  if (wsType === "spreadsheet") {
    return <SpreadsheetWorkspace document={doc} provider={provider} canEdit={canEdit} />;
  }

  // presentation / image / unsupported
  return <DocumentUnsupportedWorkspace document={doc} />;
}
