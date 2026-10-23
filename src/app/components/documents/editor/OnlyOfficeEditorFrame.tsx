/**
 * ONLYOFFICE editor integration frame.
 *
 * This component:
 *  1. Fetches a backend-signed editor config (no secrets in the browser).
 *  2. Dynamically loads the DocsAPI script from the document server.
 *  3. Initialises a DocsAPI.DocEditor instance in the container div.
 *  4. Cleans up the instance on unmount.
 *
 * When ONLYOFFICE is unavailable (no server URL, fetch error, script
 * load error) it renders a clear status UI — it never shows a blank canvas.
 */

import { useEffect, useRef, useState } from "react";
import { Loader2, AlertTriangle, WifiOff, ShieldOff, FileX } from "lucide-react";
import type { EditorCapabilities } from "./DocumentEditorProvider";
import {
  fetchOnlyOfficeEditorConfig,
  type OnlyOfficeEditorConfig,
  type OnlyOfficeApiError,
  type EditorConfigMode,
} from "../../../services/onlyoffice/onlyofficeContracts";

// ── Types ──────────────────────────────────────────────────────────────────────

interface OnlyOfficeEditorFrameProps {
  /** Internal document ID used to request the backend config. */
  documentId: string;
  documentTitle: string;
  documentServerUrl: string;
  apiBaseUrl: string;
  capabilities: EditorCapabilities;
  mode?: EditorConfigMode;
  locale?: string;
  /** Called when the editor is fully ready. */
  onReady?: () => void;
  /** Called whenever the document-dirty state changes. */
  onDocumentStateChange?: (modified: boolean) => void;
  /** Called when the user triggers save-as from the editor UI. */
  onSaveAs?: (url: string, title: string) => void;
}

type FrameStatus =
  | "idle"
  | "fetching-config"
  | "loading-script"
  | "initialising"
  | "ready"
  | { error: OnlyOfficeApiError | "script_load_failed" | "init_failed" };

// ── DocsAPI global declaration ─────────────────────────────────────────────────

declare global {
  interface Window {
    DocsAPI?: {
      DocEditor: new (
        elementId: string,
        config: OnlyOfficeEditorConfig & { events?: Record<string, (data?: unknown) => void> },
      ) => { destroyEditor: () => void };
    };
  }
}

// ── Script loader (idempotent) ─────────────────────────────────────────────────

const loadedScripts = new Set<string>();

function loadDocsApiScript(documentServerUrl: string): Promise<void> {
  const src = `${documentServerUrl.replace(/\/$/, "")}/web-apps/apps/api/documents/api.js`;
  if (loadedScripts.has(src)) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) { loadedScripts.add(src); resolve(); return; }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => { loadedScripts.add(src); resolve(); };
    script.onerror = () => reject(new Error("Script load failed"));
    document.head.appendChild(script);
  });
}

// ── Status UI ─────────────────────────────────────────────────────────────────

function FrameStatusPanel({
  status,
  onRetry,
}: {
  status: FrameStatus;
  onRetry: () => void;
}) {
  if (status === "ready") return null;

  let icon = <Loader2 className="spin-icon" size={28} strokeWidth={1.5} />;
  let title = "Loading editor…";
  let description = "";
  let showRetry = false;

  if (status === "fetching-config") {
    title = "Preparing document…";
  } else if (status === "loading-script") {
    title = "Loading ONLYOFFICE…";
  } else if (status === "initialising") {
    title = "Initialising editor…";
  } else if (typeof status === "object") {
    showRetry = true;
    const err = status.error;

    if (err === "script_load_failed") {
      icon = <WifiOff size={28} strokeWidth={1.5} />;
      title = "Editor unavailable";
      description = "Could not load the ONLYOFFICE document server. Check your connection or contact your administrator.";
    } else if (err === "init_failed") {
      icon = <AlertTriangle size={28} strokeWidth={1.5} />;
      title = "Editor failed to start";
      description = "The ONLYOFFICE editor could not be initialised. Try reloading the page.";
    } else if (err.code === "forbidden") {
      icon = <ShieldOff size={28} strokeWidth={1.5} />;
      title = "Access denied";
      description = err.message;
      showRetry = false;
    } else if (err.code === "not_found") {
      icon = <FileX size={28} strokeWidth={1.5} />;
      title = "Document not found";
      description = err.message;
      showRetry = false;
    } else if (err.code === "network") {
      icon = <WifiOff size={28} strokeWidth={1.5} />;
      title = "Connection error";
      description = err.message;
    } else {
      icon = <AlertTriangle size={28} strokeWidth={1.5} />;
      title = "Configuration error";
      description = err.message;
    }
  }

  const isLoading = status === "idle" || status === "fetching-config" || status === "loading-script" || status === "initialising";

  return (
    <div
      className="oo-frame__status"
      role={isLoading ? "status" : "alert"}
      aria-live={isLoading ? "polite" : "assertive"}
      aria-busy={isLoading}
    >
      <div className="oo-frame__status-icon" aria-hidden="true">{icon}</div>
      <p className="oo-frame__status-title">{title}</p>
      {description && <p className="oo-frame__status-desc">{description}</p>}
      {showRetry && (
        <button type="button" className="btn btn--secondary btn--sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

// ── Capability notice ──────────────────────────────────────────────────────────

function CapabilityNotice({ capabilities }: { capabilities: EditorCapabilities }) {
  const unsupported: string[] = [];
  if (!capabilities.trackedChanges)       unsupported.push("Tracked changes");
  if (!capabilities.realTimeCollaboration) unsupported.push("Real-time collaboration");
  if (unsupported.length === 0) return null;

  return (
    <aside className="oo-frame__cap-notice" role="note" aria-label="Limited feature notice">
      <AlertTriangle size={13} strokeWidth={2} aria-hidden="true" />
      <span>{unsupported.join(" and ")} {unsupported.length === 1 ? "is" : "are"} not available in the current configuration.</span>
    </aside>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function OnlyOfficeEditorFrame({
  documentId,
  documentTitle,
  documentServerUrl,
  apiBaseUrl,
  capabilities,
  mode = "edit",
  locale = "en-US",
  onReady,
  onDocumentStateChange,
  onSaveAs,
}: OnlyOfficeEditorFrameProps) {
  const containerId = `oo-editor-${documentId.replace(/[^a-z0-9]/gi, "-")}`;
  const instanceRef = useRef<{ destroyEditor: () => void } | null>(null);
  const [status, setStatus] = useState<FrameStatus>("idle");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!documentServerUrl) {
      setStatus({ error: { code: "unavailable", message: "No ONLYOFFICE document server URL configured." } });
      return;
    }

    let cancelled = false;

    async function init() {
      setStatus("fetching-config");

      const result = await fetchOnlyOfficeEditorConfig(apiBaseUrl, {
        documentId,
        mode,
        locale,
      });

      if (cancelled) return;

      if (!result.ok) {
        setStatus({ error: result.error });
        return;
      }

      setStatus("loading-script");

      try {
        await loadDocsApiScript(documentServerUrl);
      } catch {
        if (!cancelled) setStatus({ error: "script_load_failed" });
        return;
      }

      if (cancelled) return;

      if (!window.DocsAPI) {
        setStatus({ error: "script_load_failed" });
        return;
      }

      setStatus("initialising");

      try {
        // Destroy any previous instance before creating a new one
        instanceRef.current?.destroyEditor();

        const config = result.config;
        // Attach event bridge callbacks (functions, not strings)
        const configWithEvents = {
          ...config,
          events: {
            onAppReady: () => {
              if (!cancelled) { setStatus("ready"); onReady?.(); }
            },
            onDocumentStateChange: (data: unknown) => {
              const modified = (data as { data?: boolean })?.data ?? false;
              onDocumentStateChange?.(modified);
            },
            onRequestSaveAs: (data: unknown) => {
              const d = data as { data?: { fileType: string; title: string; url: string } };
              if (d?.data?.url) onSaveAs?.(d.data.url, d.data.title ?? documentTitle);
            },
            onError: (data: unknown) => {
              const err = data as { data?: { errorCode: number; errorDescription: string } };
              if (!cancelled) {
                setStatus({
                  error: {
                    code: "config_error",
                    message: err?.data?.errorDescription ?? "An unknown editor error occurred.",
                  },
                });
              }
            },
          },
        };

        instanceRef.current = new window.DocsAPI.DocEditor(containerId, configWithEvents as any);
      } catch {
        if (!cancelled) setStatus({ error: "init_failed" });
      }
    }

    void init();

    return () => {
      cancelled = true;
      instanceRef.current?.destroyEditor();
      instanceRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, documentServerUrl, apiBaseUrl, mode, locale, attempt]);

  const handleRetry = () => setAttempt(a => a + 1);

  const isReady = status === "ready";

  return (
    <div className="oo-frame" data-ready={isReady} aria-label={`ONLYOFFICE editor: ${documentTitle}`}>
      <CapabilityNotice capabilities={capabilities} />
      <FrameStatusPanel status={status} onRetry={handleRetry} />
      {/* Container for the DocsAPI editor; hidden until ready to avoid flash */}
      <div
        id={containerId}
        className="oo-frame__container"
        aria-hidden={!isReady}
        style={{ visibility: isReady ? "visible" : "hidden", height: isReady ? "100%" : "0" }}
      />
    </div>
  );
}
