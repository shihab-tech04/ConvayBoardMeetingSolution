/**
 * SpreadsheetWorkspace — full spreadsheet editing surface.
 *
 * Local mode: @fortune-sheet/react Workbook + xlsx (SheetJS) for file I/O.
 * ONLYOFFICE mode: delegates to OnlyOfficeEditorFrame when provider is configured.
 *
 * Rules enforced here:
 * - XLSM: macros never executed, original preserved, visible warning shown.
 * - CSV/TSV: executable signatures, NUL bytes, and HTML renamed as CSV are rejected.
 * - Original uploaded file is NEVER overwritten.
 * - Autosave persists workbook JSON to IndexedDB.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { read as xlsxRead, utils as xlsxUtils, writeXLSX } from "xlsx";
import { Workbook } from "@fortune-sheet/react";
// Sheet type not exported in this version
import { Download, MessageSquare, X } from "lucide-react";

import type { BoardDocument } from "../../../data/boardMeetingData";
import type { IEditorProvider } from "../editor/DocumentEditorProvider";
import { isMacroEnabledWorkbook } from "../../../utils/documentFormat";
import { documentContentStore } from "../../../services/repositories/documentContentStore";
import { useAuditEventRegistry } from "../../../data/boardMeetingData";

import { SpreadsheetToolbar } from "./SpreadsheetToolbar";
import { SpreadsheetFormulaBar } from "./SpreadsheetFormulaBar";
import { SpreadsheetSheetTabs, type SheetTab } from "./SpreadsheetSheetTabs";
import { SpreadsheetImportStatus, SpreadsheetConversionBanner, type ImportStatus } from "./SpreadsheetImportStatus";
import { SpreadsheetCommentsPanel } from "./SpreadsheetCommentsPanel";
import { OnlyOfficeEditorFrame } from "../editor/OnlyOfficeEditorFrame";

// ── Fortune-sheet colour scheme helper ────────────────────────────────────────

const FORTUNE_CONFIG = {
  showToolbar: false,    // we render our own toolbar
  showFormulaBar: false, // we render our own formula bar
  showSheetTabs: false,  // we render our own sheet tabs
};

// ── CSV/TSV safety check ───────────────────────────────────────────────────────

const EXEC_SIGNATURES = [
  "\xFF\xFE",  // UTF-16 LE BOM (often in script files)
  "MZ",        // Windows PE executable
  "\x7FELF",   // Linux ELF
  "<?php",     // PHP
  "<script",   // HTML/script injection
  "=cmd(",     // CSV formula injection
  "=HYPERLINK(",
  "@SUM(",
];

function isCsvSafe(text: string): boolean {
  const lower = text.trim().toLowerCase();
  if (text.includes("\0")) return false;          // NUL bytes
  if (/<html[\s>]/i.test(lower)) return false;    // HTML renamed as CSV
  for (const sig of EXEC_SIGNATURES) {
    if (text.startsWith(sig) || lower.startsWith(sig.toLowerCase())) return false;
  }
  return true;
}

// ── WorkbookState ──────────────────────────────────────────────────────────────

interface CellAddress { row: number; col: number; sheet: string; }

interface WorkbookState {
  sheets: any[];
  activeSheetId: string;
  activeCell: string;
  cellValue: string;
  canUndo: boolean;
  canRedo: boolean;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  isMerged: boolean;
  isFiltered: boolean;
  isFrozen: boolean;
  textAlign: "left" | "center" | "right" | "justify";
}

function defaultState(sheets: any[]): WorkbookState {
  return {
    sheets,
    activeSheetId: sheets[0]?.id ?? "sheet1",
    activeCell: "A1",
    cellValue: "",
    canUndo: false,
    canRedo: false,
    isBold: false,
    isItalic: false,
    isUnderline: false,
    isMerged: false,
    isFiltered: false,
    isFrozen: false,
    textAlign: "left",
  };
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  document: BoardDocument;
  provider: IEditorProvider;
  canEdit: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SpreadsheetWorkspace({ document: doc, provider, canEdit }: Props) {
  const auditReg = useAuditEventRegistry();

  const [importStatus, setImportStatus] = useState<ImportStatus>("loading");
  const [importWarnings, setImportWarnings]  = useState<string[]>([]);
  const [statusDismissed, setStatusDismissed] = useState(false);
  const [legacyFormat, setLegacyFormat] = useState<string | null>(null);
  const [wbState, setWbState] = useState<WorkbookState | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [showFind, setShowFind] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [findResults, setFindResults] = useState<CellAddress[]>([]);

  const workbookRef = useRef<{ undo: () => void; redo: () => void; } | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Workbook seed: passed as `data` only on mount/remount (key changes).
  // We never feed wbState.sheets back into data — that causes an infinite onChange loop.
  const workbookSeedRef = useRef<any[]>([]);
  const [workbookKey, setWorkbookKey] = useState(0);

  const isMacro = isMacroEnabledWorkbook(doc);
  const useOO   = provider.id === "onlyoffice" && provider.isAvailable;

  // ── Load workbook ────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setImportStatus("loading");
      try {
        // Try IndexedDB first
        const saved = await documentContentStore.getSpreadsheetWorkbook(doc.id);
        if (saved && !cancelled) {
          const parsed = JSON.parse(saved as string) as any[];
          workbookSeedRef.current = parsed;
          setWorkbookKey(k => k + 1);
          setWbState(defaultState(parsed));
          setImportStatus(isMacro ? "macro-warning" : "ready");
          return;
        }

        // Read from original file store
        const originalFile = await documentContentStore.getOriginalFile(doc.id);
        if (!originalFile) {
          if (!cancelled) setImportStatus("failed");
          return;
        }

        const original = await originalFile.arrayBuffer();
        const ext = (doc.file_name?.split(".").pop() ?? "").toLowerCase();

        // CSV/TSV safety gate
        if (ext === "csv" || ext === "tsv") {
          setImportStatus("converting");
          const text = new TextDecoder().decode(original);
          if (!isCsvSafe(text)) {
            if (!cancelled) setImportStatus("corrupt");
            return;
          }
        }

        // File size guard (> 50 MB)
        if (original.byteLength > 50 * 1024 * 1024) {
          if (!cancelled) { setImportStatus("too-large"); return; }
        }

        setImportStatus("converting");
        const wb = xlsxRead(original, { type: "array", cellStyles: true });

        // Legacy format notice
        if (["xls", "ods"].includes(ext)) setLegacyFormat(ext);

        // Collect conversion warnings
        const warnings: string[] = [];
        if (isMacro) warnings.push("Macros are disabled. The original XLSM is preserved.");
        if (wb.SheetNames.length > 20) warnings.push("Large workbook — some sheets may render slowly.");

        const sheets: any[] = wb.SheetNames.map((name, idx) => {
          const ws = wb.Sheets[name];
          const data = xlsxUtils.sheet_to_json<Record<string, unknown>>(ws, { header: 1, defval: "" });
          return {
            id: `sheet${idx + 1}`,
            name,
            data: data.map((row) =>
              (row as unknown as unknown[]).map((cell) => ({ v: cell ?? "" }))
            ),
          };
        });

        if (!cancelled) {
          workbookSeedRef.current = sheets;
          setWorkbookKey(k => k + 1);
          setWbState(defaultState(sheets));
          setImportWarnings(warnings);
          setImportStatus(isMacro ? "macro-warning" : warnings.length > 0 ? "warning" : "ready");

          // Persist parsed workbook so subsequent opens skip conversion
          await documentContentStore.putSpreadsheetWorkbook(
            doc.id,
            JSON.stringify(sheets),
          );

          const aid = `AUD-${Date.now()}`;
          auditReg.add({
            id: aid, event_id: aid,
            entity_type: "Document", entity_id: doc.id,
            action: "Spreadsheet opened", actor: "current_user", actor_role: "User",
            timestamp: new Date().toISOString(),
            details: doc.file_name ?? doc.title ?? "", ip_address: "", approval_status: "Logged",
          });
        }
      } catch {
        if (!cancelled) setImportStatus("corrupt");
      }
    }

    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id]);

  // ── Autosave ─────────────────────────────────────────────────────────────────

  const scheduleAutosave = useCallback((sheets: any[]) => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      try {
        await documentContentStore.putSpreadsheetWorkbook(doc.id, JSON.stringify(sheets));
      } catch { /* silent — autosave best effort */ }
    }, 1500);
  }, [doc.id]);

  // ── Sheet tab helpers ─────────────────────────────────────────────────────────

  function sheetTabs(): SheetTab[] {
    return (wbState?.sheets ?? []).map(s => ({ id: s.id ?? "", name: s.name ?? "" }));
  }

  function handleActivateSheet(id: string) {
    setWbState(prev => prev ? { ...prev, activeSheetId: id } : prev);
  }

  function remountWithSheets(sheets: any[], activeSheetId?: string) {
    workbookSeedRef.current = sheets;
    setWorkbookKey(k => k + 1);
    setWbState(prev => prev ? { ...prev, sheets, ...(activeSheetId ? { activeSheetId } : {}) } : prev);
    scheduleAutosave(sheets);
  }

  function handleAddSheet() {
    if (!wbState) return;
    const idx = wbState.sheets.length + 1;
    const newSheet: any = { id: `sheet${Date.now()}`, name: `Sheet${idx}`, data: [] };
    const sheets = [...wbState.sheets, newSheet];
    remountWithSheets(sheets, newSheet.id!);
  }

  function handleRenameSheet(id: string, name: string) {
    if (!wbState) return;
    const sheets = wbState.sheets.map(s => s.id === id ? { ...s, name } : s);
    remountWithSheets(sheets);
  }

  function handleDeleteSheet(id: string) {
    if (!wbState || wbState.sheets.length <= 1) return;
    const sheets = wbState.sheets.filter(s => s.id !== id);
    const activeSheetId = wbState.activeSheetId === id ? sheets[0].id! : wbState.activeSheetId;
    remountWithSheets(sheets, activeSheetId);
  }

  function handleDuplicateSheet(id: string) {
    if (!wbState) return;
    const source = wbState.sheets.find(s => s.id === id);
    if (!source) return;
    const copy: any = {
      ...source,
      id: `sheet${Date.now()}`,
      name: `${source.name} (copy)`,
    };
    const sheets = [...wbState.sheets, copy];
    remountWithSheets(sheets, copy.id!);
  }

  // ── Find ──────────────────────────────────────────────────────────────────────

  function handleFind() {
    if (!wbState || !findQuery.trim()) { setFindResults([]); return; }
    const results: CellAddress[] = [];
    for (const sheet of wbState.sheets) {
      if (!sheet.data) continue;
      for (let r = 0; r < sheet.data.length; r++) {
        const row = sheet.data[r];
        if (!row) continue;
        for (let c = 0; c < row.length; c++) {
          const cell = row[c] as { v?: unknown } | null;
          const val = String(cell?.v ?? "");
          if (val.toLowerCase().includes(findQuery.toLowerCase())) {
            results.push({ row: r, col: c, sheet: sheet.id ?? "" });
          }
        }
      }
    }
    setFindResults(results);
  }

  // Stable onChange for Workbook — must not feed wbState.sheets back as data prop.
  const handleWorkbookChange = useCallback((sheets: any[]) => {
    setWbState(prev => prev ? { ...prev, sheets } : prev);
    scheduleAutosave(sheets);
  }, [scheduleAutosave]);

  // ── Toolbar handlers ──────────────────────────────────────────────────────────
  // Fortune-sheet exposes an imperative ref API — we forward commands through it.
  // For toggling bold/italic/underline/alignment the `luckysheet` global API is
  // used when available (fortune-sheet preserves the `luckysheet` global compat shim).

  function fsCmd(cmd: string, ...args: unknown[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ls = (window as any).luckysheet;
    if (ls && typeof ls[cmd] === "function") ls[cmd](...args);
  }

  const toolbar = {
    onUndo:          () => { fsCmd("undo"); setWbState(p => p ? { ...p, canUndo: false } : p); },
    onRedo:          () => { fsCmd("redo"); setWbState(p => p ? { ...p, canRedo: false } : p); },
    onBold:          () => { fsCmd("setBold");      setWbState(p => p ? { ...p, isBold: !p.isBold } : p); },
    onItalic:        () => { fsCmd("setItalic");    setWbState(p => p ? { ...p, isItalic: !p.isItalic } : p); },
    onUnderline:     () => { fsCmd("setUnderline"); setWbState(p => p ? { ...p, isUnderline: !p.isUnderline } : p); },
    onAlignLeft:     () => { fsCmd("setHorizontalAlignment", "left");    setWbState(p => p ? { ...p, textAlign: "left" } : p); },
    onAlignCenter:   () => { fsCmd("setHorizontalAlignment", "center");  setWbState(p => p ? { ...p, textAlign: "center" } : p); },
    onAlignRight:    () => { fsCmd("setHorizontalAlignment", "right");   setWbState(p => p ? { ...p, textAlign: "right" } : p); },
    onAlignJustify:  () => { fsCmd("setHorizontalAlignment", "justify"); setWbState(p => p ? { ...p, textAlign: "justify" } : p); },
    onWrapText:      () => fsCmd("setTextWrap", 2),
    onFormatNumber:  () => fsCmd("setCellFormat", "ct", { fa: "#,##0.00", t: "n" }),
    onFormatCurrency:() => fsCmd("setCellFormat", "ct", { fa: '"$"#,##0.00', t: "n" }),
    onFormatPercent: () => fsCmd("setCellFormat", "ct", { fa: "0%", t: "n" }),
    onFormatDate:    () => fsCmd("setCellFormat", "ct", { fa: "yyyy-mm-dd", t: "d" }),
    onMerge:         () => { fsCmd("mergeCells"); setWbState(p => p ? { ...p, isMerged: !p.isMerged } : p); },
    onSort:          () => fsCmd("setRangeSort", 0),
    onFilter:        () => { fsCmd("setFilter"); setWbState(p => p ? { ...p, isFiltered: !p.isFiltered } : p); },
    onFreeze:        () => { fsCmd("freezeRow"); setWbState(p => p ? { ...p, isFrozen: !p.isFrozen } : p); },
    onFind:          () => setShowFind(f => !f),
  };

  // ── Export ────────────────────────────────────────────────────────────────────

  async function handleExport() {
    if (!wbState) return;
    const wb = xlsxUtils.book_new();
    for (const sheet of wbState.sheets) {
      const rows = (sheet.data ?? []).map((row: any[]) =>
        row.map((c: any) => c?.v ?? "")
      );
      const ws = xlsxUtils.aoa_to_sheet(rows);
      xlsxUtils.book_append_sheet(wb, ws, sheet.name ?? "Sheet");
    }
    writeXLSX(wb, { type: "file", file: `${doc.title ?? "spreadsheet"}.xlsx` } as any);

    const aid = `AUD-${Date.now()}`;
    auditReg.add({
      id: aid, event_id: aid,
      entity_type: "Document", entity_id: doc.id,
      action: "Spreadsheet exported", actor: "current_user", actor_role: "User",
      timestamp: new Date().toISOString(),
      details: `${doc.title ?? "spreadsheet"}.xlsx`, ip_address: "", approval_status: "Logged",
    });
  }

  // ── Render: ONLYOFFICE delegation ─────────────────────────────────────────────

  if (useOO) {
    return (
      <div className="doc-workspace doc-workspace--spreadsheet">
        <OnlyOfficeEditorFrame
          documentId={doc.id}
          documentTitle={doc.title ?? doc.file_name ?? ""}
          documentServerUrl=""
          apiBaseUrl=""
          capabilities={{ trackedChanges: false, realTimeCollaboration: false } as any}
          mode={canEdit ? "edit" : "view"}
        />
      </div>
    );
  }

  // ── Render: error states ──────────────────────────────────────────────────────

  if (importStatus === "corrupt") {
    return (
      <div className="doc-workspace doc-workspace--error" role="alert">
        <p className="doc-workspace__error-msg">
          This spreadsheet appears to be corrupt or unreadable. Please download the original file.
        </p>
      </div>
    );
  }

  if (importStatus === "failed") {
    return (
      <div className="doc-workspace doc-workspace--error" role="alert">
        <p className="doc-workspace__error-msg">
          Import failed. The original file may not be available.
        </p>
      </div>
    );
  }

  // ── Render: loading ────────────────────────────────────────────────────────────

  if (importStatus === "loading" || importStatus === "converting" || !wbState) {
    return (
      <div className="doc-workspace doc-workspace--loading" aria-live="polite">
        <SpreadsheetImportStatus status={importStatus} fileName={doc.file_name ?? undefined} />
      </div>
    );
  }

  // ── Render: workspace ─────────────────────────────────────────────────────────

  const activeSheet = wbState.sheets.find(s => s.id === wbState.activeSheetId);
  const activeSheetName = activeSheet?.name ?? "Sheet1";

  return (
    <div className="doc-workspace doc-workspace--spreadsheet">
      {/* Status banners */}
      {!statusDismissed && (
        <SpreadsheetImportStatus
          status={importStatus}
          fileName={doc.file_name ?? undefined}
          warnings={importWarnings}
          onDismiss={() => setStatusDismissed(true)}
        />
      )}
      {legacyFormat && <SpreadsheetConversionBanner format={legacyFormat} />}

      {/* Toolbar */}
      <SpreadsheetToolbar
        {...toolbar}
        canUndo={wbState.canUndo}
        canRedo={wbState.canRedo}
        disabled={!canEdit}
        isBold={wbState.isBold}
        isItalic={wbState.isItalic}
        isUnderline={wbState.isUnderline}
        isMerged={wbState.isMerged}
        isFiltered={wbState.isFiltered}
        isFrozen={wbState.isFrozen}
        textAlign={wbState.textAlign}
      />

      {/* Formula bar */}
      <SpreadsheetFormulaBar
        cellAddress={wbState.activeCell}
        cellValue={wbState.cellValue}
        disabled={!canEdit}
        onCellAddressChange={addr => {
          setWbState(p => p ? { ...p, activeCell: addr } : p);
          fsCmd("setCellSelected", 0, 0, false, addr);
        }}
        onValueCommit={value => {
          fsCmd("setCellValue", 0, 0, value);
          setWbState(p => p ? { ...p, cellValue: value } : p);
          if (wbState.sheets) scheduleAutosave(wbState.sheets);
        }}
      />

      {/* Action bar */}
      <div className="doc-workspace__action-bar">
        <div className="doc-workspace__action-bar-right">
          <button
            type="button" className="btn btn--ghost btn--sm"
            onClick={() => setShowComments(c => !c)}
            aria-label="Toggle comments panel"
            aria-pressed={showComments}
          >
            <MessageSquare size={13} strokeWidth={2} /> Comments
          </button>
          <button
            type="button" className="btn btn--ghost btn--sm"
            onClick={handleExport}
            aria-label="Export as XLSX"
          >
            <Download size={13} strokeWidth={2} /> Export XLSX
          </button>
        </div>
      </div>

      {/* Find bar */}
      {showFind && (
        <div className="spreadsheet-find-bar" role="search" aria-label="Find in spreadsheet">
          <input
            type="search" className="spreadsheet-find-bar__input"
            value={findQuery} placeholder="Find in spreadsheet…"
            onChange={e => setFindQuery(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleFind(); }}
            aria-label="Find text"
            autoFocus
          />
          <button type="button" className="btn btn--primary btn--sm" onClick={handleFind}>Find</button>
          {findResults.length > 0 && (
            <span className="spreadsheet-find-bar__count" aria-live="polite">
              {findResults.length} match{findResults.length !== 1 ? "es" : ""}
            </span>
          )}
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setShowFind(false); setFindResults([]); }}
            aria-label="Close find">
            <X size={12} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* Editing surface + side panel */}
      <div className="doc-workspace__body">
        <div className="doc-workspace__editor-area">
          <Workbook
            key={workbookKey}
            ref={workbookRef as any}
            data={workbookSeedRef.current}
            config={FORTUNE_CONFIG}
            onChange={handleWorkbookChange}
          />
        </div>

        {showComments && (
          <aside className="doc-workspace__side-panel" aria-label="Comments">
            <SpreadsheetCommentsPanel
              docId={doc.id}
              activeSheetId={wbState.activeSheetId}
              activeSheetName={activeSheetName}
              activeCell={wbState.activeCell}
              onNavigate={(sheetId, cell) => {
                setWbState(prev => prev ? { ...prev, activeSheetId: sheetId, activeCell: cell } : prev);
                fsCmd("setCellSelected", 0, 0, false, cell);
              }}
            />
          </aside>
        )}
      </div>

      {/* Sheet tabs */}
      <SpreadsheetSheetTabs
        sheets={sheetTabs()}
        activeSheetId={wbState.activeSheetId}
        canEdit={canEdit}
        onActivate={handleActivateSheet}
        onAdd={handleAddSheet}
        onRename={handleRenameSheet}
        onDelete={handleDeleteSheet}
        onDuplicate={handleDuplicateSheet}
      />
    </div>
  );
}
