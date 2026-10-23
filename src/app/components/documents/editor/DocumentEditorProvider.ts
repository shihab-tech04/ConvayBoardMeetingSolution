/**
 * Document editor provider abstraction.
 *
 * Controlled by VITE_DOCUMENT_EDITOR_PROVIDER=local|onlyoffice (default: local).
 * Consumers read `capabilities` — or call `getCapabilitiesForDocument()` — to
 * decide which UI features to show for a specific file.
 */

import type { BoardDocument } from "../../../data/boardMeetingData";
import { getDocumentWorkspaceType } from "../../../utils/documentFormat";

// ── Capabilities ───────────────────────────────────────────────────────────────

export interface EditorCapabilities {
  // ── Rich text ───────────────────────────────────────────────────────────────
  editing:               boolean;
  comments:              boolean;
  anchoredComments:      boolean;
  versioning:            boolean;
  trackedChanges:        boolean;
  realTimeCollaboration: boolean;
  docxFidelity:          boolean;
  versionComparison:     boolean;

  // ── PDF ─────────────────────────────────────────────────────────────────────
  pdfViewing:            boolean;
  /** Metadata annotations (highlight, sticky note, etc.) stored locally */
  pdfAnnotations:        boolean;
  /** Real text-layer editing of the PDF source — provider only */
  pdfTextEditing:        boolean;
  /** Interactive PDF form filling */
  pdfForms:              boolean;
  /** Digital signatures */
  pdfSignatures:         boolean;

  // ── Spreadsheet ─────────────────────────────────────────────────────────────
  spreadsheetEditing:    boolean;
  spreadsheetFormulas:   boolean;
  spreadsheetComments:   boolean;
  spreadsheetImport:     boolean;
  spreadsheetExport:     boolean;
}

// ── Provider interface ─────────────────────────────────────────────────────────

export interface IEditorProvider {
  id: "local" | "onlyoffice";
  name: string;
  label: string;
  capabilities: EditorCapabilities;
  /** True when a backend document server is reachable / configured. */
  isAvailable: boolean;
  documentServerUrl?: string;
  apiBaseUrl?: string;
}

// ── Local provider capabilities ────────────────────────────────────────────────

const LOCAL_CAPS: EditorCapabilities = {
  // Rich text — Tiptap
  editing:               true,
  comments:              true,
  anchoredComments:      false,
  versioning:            true,
  trackedChanges:        false,   // DO NOT enable — no fake tracked changes
  realTimeCollaboration: false,
  docxFidelity:          false,   // mammoth conversion only
  versionComparison:     false,

  // PDF (local browser viewer)
  pdfViewing:            true,
  pdfAnnotations:        true,    // stored as metadata, not embedded in PDF
  pdfTextEditing:        false,   // requires ONLYOFFICE
  pdfForms:              false,   // requires ONLYOFFICE
  pdfSignatures:         false,   // requires backend signature workflow

  // Spreadsheet (local @fortune-sheet/react engine)
  spreadsheetEditing:    true,
  spreadsheetFormulas:   true,
  spreadsheetComments:   true,
  spreadsheetImport:     true,
  spreadsheetExport:     true,
};

export class LocalRichTextEditorProvider implements IEditorProvider {
  readonly id           = "local" as const;
  readonly name         = "local";
  readonly label        = "Local Rich Text (Tiptap)";
  readonly capabilities = LOCAL_CAPS;
  readonly isAvailable  = true;
}

// ── ONLYOFFICE provider capabilities ──────────────────────────────────────────

const OO_CAPS_FULL: EditorCapabilities = {
  editing:               true,
  comments:              true,
  anchoredComments:      true,
  versioning:            true,
  trackedChanges:        true,
  realTimeCollaboration: true,
  docxFidelity:          true,
  versionComparison:     true,

  pdfViewing:            true,
  pdfAnnotations:        true,
  pdfTextEditing:        true,
  pdfForms:              true,
  pdfSignatures:         true,

  spreadsheetEditing:    true,
  spreadsheetFormulas:   true,
  spreadsheetComments:   true,
  spreadsheetImport:     true,
  spreadsheetExport:     true,
};

/** Capabilities when ONLYOFFICE server URL is not configured. */
const OO_CAPS_NO_SERVER: EditorCapabilities = {
  ...OO_CAPS_FULL,
  trackedChanges:        false,  // never fake
  realTimeCollaboration: false,  // never fake
  pdfTextEditing:        false,
  pdfForms:              false,
  pdfSignatures:         false,
};

export class OnlyOfficeEditorProvider implements IEditorProvider {
  readonly id               = "onlyoffice" as const;
  readonly name             = "onlyoffice";
  readonly label            = "ONLYOFFICE Document Server";
  readonly capabilities: EditorCapabilities;
  readonly isAvailable: boolean;
  readonly documentServerUrl: string;
  readonly apiBaseUrl: string;

  constructor(serverUrl?: string) {
    this.documentServerUrl =
      serverUrl ??
      (import.meta.env.VITE_ONLYOFFICE_DOCUMENT_SERVER_URL as string | undefined) ?? "";
    this.apiBaseUrl =
      (import.meta.env.VITE_DOCUMENT_API_BASE_URL as string | undefined) ??
      (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api/v1";
    this.isAvailable  = this.documentServerUrl.length > 0;
    this.capabilities = this.isAvailable ? OO_CAPS_FULL : OO_CAPS_NO_SERVER;
  }
}

// ── Format-aware capability override ──────────────────────────────────────────

/**
 * Returns the effective capabilities for a specific document + provider pair.
 *
 * Use this instead of reading `provider.capabilities` directly so format-
 * specific restrictions are applied (e.g. no rich-text editing for a PDF,
 * no spreadsheet features for a Word document).
 */
export function getCapabilitiesForDocument(
  provider: IEditorProvider,
  doc: BoardDocument,
): EditorCapabilities {
  const base = { ...provider.capabilities };
  const wsType = getDocumentWorkspaceType(doc);

  switch (wsType) {
    case "pdf":
      // PDF workspace: disable rich-text and spreadsheet capabilities
      return {
        ...base,
        editing:            false,
        trackedChanges:     false,
        docxFidelity:       false,
        versionComparison:  false,
        spreadsheetEditing: false,
        spreadsheetFormulas:false,
        spreadsheetImport:  false,
        spreadsheetExport:  false,
      };

    case "spreadsheet":
      // Spreadsheet workspace: disable rich-text capabilities
      return {
        ...base,
        editing:           false,
        trackedChanges:    false,
        docxFidelity:      false,
        versionComparison: false,
        pdfViewing:        false,
        pdfAnnotations:    false,
        pdfTextEditing:    false,
        pdfForms:          false,
        pdfSignatures:     false,
      };

    case "presentation":
    case "image":
    case "unsupported":
      // These are view/download only in local mode
      return {
        ...base,
        editing:            false,
        trackedChanges:     false,
        pdfAnnotations:     false,
        pdfTextEditing:     false,
        pdfForms:           false,
        pdfSignatures:      false,
        spreadsheetEditing: false,
        spreadsheetFormulas:false,
      };

    default:
      // rich-text — use base capabilities as-is
      return {
        ...base,
        pdfViewing:         false,
        pdfAnnotations:     false,
        pdfTextEditing:     false,
        pdfForms:           false,
        pdfSignatures:      false,
        spreadsheetEditing: false,
        spreadsheetFormulas:false,
        spreadsheetImport:  false,
        spreadsheetExport:  false,
      };
  }
}

// ── Factory (singleton per page load) ─────────────────────────────────────────

let _instance: IEditorProvider | null = null;

export function getEditorProvider(): IEditorProvider {
  if (_instance) return _instance;
  const mode = (
    (import.meta.env.VITE_DOCUMENT_EDITOR_PROVIDER as string | undefined) ?? "local"
  ).toLowerCase();
  _instance = mode === "onlyoffice"
    ? new OnlyOfficeEditorProvider()
    : new LocalRichTextEditorProvider();
  return _instance;
}

/** Reset singleton — for unit tests only. */
export function _resetEditorProvider(): void {
  _instance = null;
}
