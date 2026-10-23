/**
 * ONLYOFFICE backend contract types.
 *
 * The frontend never constructs editor configs or JWTs directly.
 * All sensitive values (document keys, tokens, signing secrets) are
 * produced by the backend and returned via GET /documents/{id}/editor-config.
 *
 * Only the document-server URL is read from a public env variable.
 */

// ── Request types ──────────────────────────────────────────────────────────────

export type EditorConfigMode = "edit" | "view" | "review" | "fillForms" | "comment";

/** Maps to the ONLYOFFICE documentType field in the editor config.
 *  word=text docs, cell=spreadsheets, slide=presentations, pdf=PDFs. */
export type OnlyOfficeDocumentType = "word" | "cell" | "slide" | "pdf";

export interface EditorConfigRequest {
  documentId: string;
  /** ONLYOFFICE document type — derived from file extension/MIME. */
  documentType?: OnlyOfficeDocumentType;
  /** Original file name for display in the editor chrome. */
  fileName?: string;
  mode?: EditorConfigMode;
  /** Locale for the editor UI, e.g. "en-US" */
  locale?: string;
  /** Download permission — passed to the backend to set in the JWT. */
  canDownload?: boolean;
  /** Print permission. */
  canPrint?: boolean;
  /** Review permission. */
  canReview?: boolean;
}

// ── Response: backend-generated editor config ─────────────────────────────────

/** Mirrors the ONLYOFFICE DocsAPI config structure.
 *  Returned verbatim from the backend — never assembled in the browser. */
export interface OnlyOfficeEditorConfig {
  /** JWT-signed token (generated server-side; never derive in the browser). */
  token: string;
  document: {
    fileType: string;
    key: string;
    title: string;
    url: string;
    permissions: {
      comment: boolean;
      copy: boolean;
      download: boolean;
      edit: boolean;
      fillForms: boolean;
      modifyContentControl: boolean;
      modifyFilter: boolean;
      print: boolean;
      rename: boolean;
      review: boolean;
      /** Prevent re-sharing the document link */
      share: boolean;
    };
  };
  editorConfig: {
    callbackUrl: string;
    lang: string;
    mode: EditorConfigMode;
    user: {
      id: string;
      name: string;
    };
    customization?: {
      autosave?: boolean;
      chat?: boolean;
      comments?: boolean;
      compactHeader?: boolean;
      compactToolbar?: boolean;
      forcesave?: boolean;
      help?: boolean;
      hideRightMenu?: boolean;
      logo?: { image?: string; url?: string };
      macros?: boolean;
      plugins?: boolean;
      reviewDisplay?: "original" | "markup" | "final";
      spellcheck?: boolean;
      toolbarNoTabs?: boolean;
      zoom?: number;
    };
    plugins?: {
      autostart?: string[];
      pluginsData?: string[];
    };
  };
  events?: {
    onAppReady?: string;
    onDocumentStateChange?: string;
    onError?: string;
    onRequestHistory?: string;
    onRequestHistoryData?: string;
    onRequestHistoryClose?: string;
    onRequestRestore?: string;
    onRequestSaveAs?: string;
    onRequestRename?: string;
    onRequestUsers?: string;
    onRequestSendNotify?: string;
  };
  height?: string;
  width?: string;
  type?: "desktop" | "mobile" | "embedded";
}

// ── Version / history contract ─────────────────────────────────────────────────

export interface OnlyOfficeHistoryEntry {
  created: string;
  key: string;
  user: { id: string; name: string };
  version: number;
}

export interface OnlyOfficeHistoryDataEntry {
  fileType: string;
  key: string;
  url: string;
  version: number;
  previous?: { fileType: string; key: string; url: string; version: number };
  changesUrl?: string;
  token: string;
}

// ── Save callback contract (backend receives this from OO Document Server) ─────

/** Shape of the POST body that ONLYOFFICE sends to the backend callback URL.
 *  The backend validates it and persists the saved content.
 *  Documented here so frontend code can reference status meanings. */
export interface OnlyOfficeSaveCallbackBody {
  /** 1=editing, 2=ready for save, 3=closed without change, 4=saved, 6=error, 7=force-save */
  status: 1 | 2 | 3 | 4 | 6 | 7;
  key: string;
  url?: string;
  changesurl?: string;
  history?: unknown;
  users?: string[];
  actions?: Array<{ type: 0 | 1; userid: string }>;
  lastsave?: string;
  notmodified?: boolean;
  forcesavetype?: 0 | 1 | 2;
  token?: string;
}

// ── Frontend API client helpers ────────────────────────────────────────────────

export interface OnlyOfficeApiError {
  code: "unavailable" | "forbidden" | "not_found" | "config_error" | "network";
  message: string;
}

export type OnlyOfficeConfigResult =
  | { ok: true; config: OnlyOfficeEditorConfig }
  | { ok: false; error: OnlyOfficeApiError };

/**
 * Fetch a backend-generated ONLYOFFICE editor config.
 * The backend signs the JWT and constructs all document keys.
 * This function never touches secrets.
 */
export async function fetchOnlyOfficeEditorConfig(
  apiBaseUrl: string,
  req: EditorConfigRequest,
): Promise<OnlyOfficeConfigResult> {
  const { documentId, mode = "edit", locale = "en-US" } = req;
  const url = `${apiBaseUrl}/documents/${encodeURIComponent(documentId)}/editor-config?mode=${mode}&locale=${encodeURIComponent(locale)}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: { code: "forbidden", message: "You do not have permission to open this document." } };
    }
    if (res.status === 404) {
      return { ok: false, error: { code: "not_found", message: "Document not found." } };
    }
    if (!res.ok) {
      return { ok: false, error: { code: "config_error", message: `Server returned ${res.status}.` } };
    }

    const config = (await res.json()) as OnlyOfficeEditorConfig;
    return { ok: true, config };
  } catch {
    return { ok: false, error: { code: "network", message: "Could not reach the document server." } };
  }
}
