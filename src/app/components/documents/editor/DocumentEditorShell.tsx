/**
 * DocumentEditorShell — shared full-screen editor layout for all document formats.
 *
 * Slot props:
 *   headerLeft    — back button + icon + title + version
 *   headerCenter  — save state indicator + mode badge + lock status
 *   headerRight   — action icon buttons (comments, versions, save, more…)
 *   banner        — optional warning/info strip below the header
 *   toolbar       — format-specific toolbar row (nullable)
 *   leftPanel     — outline / thumbnails / sheets / slides sidebar (nullable)
 *   children      — main canvas content
 *   rightPanel    — comments / versions / workflow / activity panel (nullable)
 *   statusBar     — format-specific status strip at the bottom (nullable)
 *
 * Callers wrap with <FullScreenWorkspaceShell> so this component manages
 * the inner layout only.
 */

import type { ReactNode } from "react";

// ── Save-state badge ────────────────────────────────────────────────────────

export type SaveState = "saving" | "saved" | "error" | "readonly" | "locked" | "offline";

const SAVE_STATE_LABEL: Record<SaveState, string> = {
  saving:   "Saving…",
  saved:    "All changes saved",
  error:    "Save failed",
  readonly: "Read-only",
  locked:   "Locked",
  offline:  "Offline — changes queued",
};

const SAVE_STATE_CLASS: Record<SaveState, string> = {
  saving:   "shell-save-badge--saving",
  saved:    "shell-save-badge--saved",
  error:    "shell-save-badge--error",
  readonly: "shell-save-badge--muted",
  locked:   "shell-save-badge--muted",
  offline:  "shell-save-badge--warning",
};

export function SaveStateBadge({ state }: { state: SaveState }) {
  return (
    <span
      className={`shell-save-badge ${SAVE_STATE_CLASS[state]}`}
      role="status"
      aria-live="polite"
    >
      {SAVE_STATE_LABEL[state]}
    </span>
  );
}

// ── Props ────────────────────────────────────────────────────────────────────

interface DocumentEditorShellProps {
  // Header slots
  headerLeft?:   ReactNode;
  headerCenter?: ReactNode;
  headerRight?:  ReactNode;

  // Below-header optional strip
  banner?:    ReactNode;

  // Format-specific toolbar row
  toolbar?:   ReactNode;

  // Three-column body
  leftPanel?:  ReactNode;
  children:    ReactNode;
  rightPanel?: ReactNode;

  // Status bar
  statusBar?: ReactNode;

  // Layout options
  leftPanelWidth?:  string;
  rightPanelWidth?: string;

  /** aria-label for the main canvas region */
  canvasLabel?: string;
}

// ── Shell ────────────────────────────────────────────────────────────────────

export function DocumentEditorShell({
  headerLeft,
  headerCenter,
  headerRight,
  banner,
  toolbar,
  leftPanel,
  children,
  rightPanel,
  statusBar,
  leftPanelWidth  = "220px",
  rightPanelWidth = "300px",
  canvasLabel     = "Document canvas",
}: DocumentEditorShellProps) {
  return (
    <div className="doc-shell">

      {/* ── Header ── */}
      <header className="doc-shell__header" role="banner">
        <div className="doc-shell__header-left">
          {headerLeft}
        </div>
        <div className="doc-shell__header-center">
          {headerCenter}
        </div>
        <div className="doc-shell__header-right">
          {headerRight}
        </div>
      </header>

      {/* ── Banner (optional) ── */}
      {banner && (
        <div className="doc-shell__banner" role="alert" aria-live="polite">
          {banner}
        </div>
      )}

      {/* ── Toolbar (optional) ── */}
      {toolbar && (
        <div className="doc-shell__toolbar" role="toolbar" aria-label="Document toolbar">
          {toolbar}
        </div>
      )}

      {/* ── Body ── */}
      <div className="doc-shell__body">

        {/* Left panel */}
        {leftPanel && (
          <aside
            className="doc-shell__left"
            style={{ width: leftPanelWidth, minWidth: leftPanelWidth }}
            aria-label="Document panel"
          >
            {leftPanel}
          </aside>
        )}

        {/* Main canvas */}
        <main
          className="doc-shell__canvas"
          role="main"
          aria-label={canvasLabel}
        >
          {children}
        </main>

        {/* Right panel */}
        {rightPanel && (
          <aside
            className="doc-shell__right"
            style={{ width: rightPanelWidth, minWidth: rightPanelWidth }}
            aria-label="Document side panel"
          >
            {rightPanel}
          </aside>
        )}

      </div>

      {/* ── Status bar (optional) ── */}
      {statusBar && (
        <footer className="doc-shell__status" role="contentinfo" aria-label="Document status">
          {statusBar}
        </footer>
      )}

    </div>
  );
}
