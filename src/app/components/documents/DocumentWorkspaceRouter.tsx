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
import { useMemo } from "react";
import { FileText, Presentation, Image, Download } from "lucide-react";
import type { BoardDocument } from "../../data/boardMeetingData";
import type { IEditorProvider } from "./editor/DocumentEditorProvider";
import { getDocumentWorkspaceType, workspaceTypeLabel } from "../../utils/documentFormat";
import { PdfWorkspace } from "./pdf/PdfWorkspace";
import { SpreadsheetWorkspace } from "./spreadsheet/SpreadsheetWorkspace";

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
      <a
        href={doc.original_file_ref ?? "#"}
        download={doc.file_name ?? doc.title}
        className="btn btn--secondary btn--md"
        aria-label={`Download ${doc.file_name ?? doc.title}`}
      >
        <Download size={14} strokeWidth={2} aria-hidden="true" />
        Download file
      </a>
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
