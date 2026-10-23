import { AlertTriangle, CheckCircle, Info, Loader2, X } from "lucide-react";

export type ImportStatus =
  | "idle"
  | "loading"
  | "converting"
  | "ready"
  | "warning"
  | "macro-warning"
  | "too-large"
  | "corrupt"
  | "failed";

interface Props {
  status: ImportStatus;
  fileName?: string;
  warnings?: string[];
  onDismiss?: () => void;
}

const MESSAGES: Record<ImportStatus, string> = {
  idle:         "",
  loading:      "Loading spreadsheet…",
  converting:   "Converting file for in-app editing. The original is preserved.",
  ready:        "",
  warning:      "Some workbook features may not be fully supported in local mode.",
  "macro-warning": "Macros and external workbook automation are disabled in the browser. The original XLSM file is preserved.",
  "too-large":  "This workbook is very large. Performance may be affected.",
  corrupt:      "This workbook appears to be corrupt or unreadable.",
  failed:       "Import failed. Please download the original file.",
};

export function SpreadsheetImportStatus({ status, fileName, warnings, onDismiss }: Props) {
  if (status === "idle" || status === "ready") return null;

  const isLoading = status === "loading" || status === "converting";
  const isError   = status === "corrupt" || status === "failed" || status === "too-large";
  const isWarn    = status === "warning" || status === "macro-warning";

  return (
    <div
      className={`spreadsheet-import-status${isError ? " spreadsheet-import-status--error" : isWarn ? " spreadsheet-import-status--warn" : ""}`}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
    >
      {isLoading && <Loader2 size={13} className="spin-icon" strokeWidth={2} aria-hidden="true" />}
      {isError   && <AlertTriangle size={13} strokeWidth={2} aria-hidden="true" />}
      {isWarn    && <AlertTriangle size={13} strokeWidth={2} aria-hidden="true" />}
      {!isLoading && !isError && !isWarn && <Info size={13} strokeWidth={2} aria-hidden="true" />}

      <div className="spreadsheet-import-status__body">
        <span className="spreadsheet-import-status__msg">{MESSAGES[status]}</span>
        {fileName && !isLoading && (
          <span className="spreadsheet-import-status__file">{fileName}</span>
        )}
        {warnings && warnings.length > 0 && (
          <ul className="spreadsheet-import-status__warnings">
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        )}
      </div>

      {onDismiss && !isLoading && (
        <button type="button" className="spreadsheet-import-status__close" onClick={onDismiss} aria-label="Dismiss">
          <X size={12} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

export function SpreadsheetConversionBanner({ format }: { format: string }) {
  if (!["xls", "ods"].includes(format)) return null;
  return (
    <div className="spreadsheet-import-status spreadsheet-import-status--warn" role="status">
      <CheckCircle size={13} strokeWidth={2} aria-hidden="true" />
      <span>
        This legacy {format.toUpperCase()} spreadsheet was converted for in-app editing.
        The original file is preserved.
      </span>
    </div>
  );
}
