/**
 * Spreadsheet formula bar — name box + formula input.
 */
import { useState } from "react";

interface Props {
  cellAddress: string;     // e.g. "A1" or "B3:C5"
  cellValue: string;       // raw value or formula string
  onCellAddressChange: (addr: string) => void;
  onValueCommit: (value: string) => void;
  disabled?: boolean;
}

export function SpreadsheetFormulaBar({
  cellAddress, cellValue, onCellAddressChange, onValueCommit, disabled,
}: Props) {
  const [draftValue, setDraftValue] = useState<string | null>(null);
  const [draftAddr,  setDraftAddr]  = useState<string | null>(null);

  const displayValue = draftValue ?? cellValue;
  const displayAddr  = draftAddr  ?? cellAddress;

  function commitValue() {
    if (draftValue !== null) {
      onValueCommit(draftValue);
      setDraftValue(null);
    }
  }

  function commitAddr() {
    if (draftAddr !== null) {
      onCellAddressChange(draftAddr);
      setDraftAddr(null);
    }
  }

  return (
    <div className="spreadsheet-formula-bar" aria-label="Formula bar">
      {/* Name box */}
      <input
        type="text"
        className="spreadsheet-formula-bar__name-box"
        value={displayAddr}
        aria-label="Cell address"
        disabled={disabled}
        onChange={e => setDraftAddr(e.target.value)}
        onBlur={commitAddr}
        onKeyDown={e => { if (e.key === "Enter") commitAddr(); }}
      />

      {/* Equals sign indicator */}
      <span className="spreadsheet-formula-bar__fx" aria-hidden="true">
        {displayValue.startsWith("=") ? "fx" : "="}
      </span>

      {/* Formula / value input */}
      <input
        type="text"
        className="spreadsheet-formula-bar__input"
        value={displayValue}
        aria-label={`Cell value${displayValue.startsWith("=") ? " (formula)" : ""}`}
        disabled={disabled}
        onChange={e => setDraftValue(e.target.value)}
        onBlur={commitValue}
        onKeyDown={e => {
          if (e.key === "Enter") { commitValue(); }
          if (e.key === "Escape") { setDraftValue(null); }
        }}
        placeholder="Enter value or formula…"
      />
    </div>
  );
}
