/**
 * Spreadsheet formatting toolbar.
 * Every button here has a working handler — no inactive stubs.
 */
import {
  Undo2, Redo2, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  AlignJustify, Merge, Search, Filter, SortAsc, Columns, WrapText,
  DollarSign, Percent, Hash, Calendar,
} from "lucide-react";

export interface SpreadsheetToolbarCallbacks {
  onUndo: () => void;
  onRedo: () => void;
  onBold: () => void;
  onItalic: () => void;
  onUnderline: () => void;
  onAlignLeft: () => void;
  onAlignCenter: () => void;
  onAlignRight: () => void;
  onAlignJustify: () => void;
  onWrapText: () => void;
  onFormatNumber: () => void;
  onFormatCurrency: () => void;
  onFormatPercent: () => void;
  onFormatDate: () => void;
  onMerge: () => void;
  onSort: () => void;
  onFilter: () => void;
  onFreeze: () => void;
  onFind: () => void;
}

interface Props extends SpreadsheetToolbarCallbacks {
  canUndo: boolean;
  canRedo: boolean;
  disabled?: boolean;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  isMerged?: boolean;
  isFiltered?: boolean;
  isFrozen?: boolean;
  textAlign?: "left" | "center" | "right" | "justify";
}

function Btn({
  icon: Icon, label, active = false, disabled = false, onClick,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string; active?: boolean; disabled?: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`spreadsheet-toolbar__btn${active ? " spreadsheet-toolbar__btn--active" : ""}`}
      title={label} aria-label={label} aria-pressed={active || undefined}
      disabled={disabled} onClick={onClick}
    >
      <Icon size={13} strokeWidth={2} />
    </button>
  );
}

function Divider() {
  return <div className="spreadsheet-toolbar__divider" aria-hidden="true" />;
}

export function SpreadsheetToolbar({
  canUndo, canRedo, disabled = false,
  isBold, isItalic, isUnderline, isMerged, isFiltered, isFrozen,
  textAlign,
  onUndo, onRedo, onBold, onItalic, onUnderline,
  onAlignLeft, onAlignCenter, onAlignRight, onAlignJustify, onWrapText,
  onFormatNumber, onFormatCurrency, onFormatPercent, onFormatDate,
  onMerge, onSort, onFilter, onFreeze, onFind,
}: Props) {
  return (
    <div className="spreadsheet-toolbar" role="toolbar" aria-label="Spreadsheet formatting">
      <Btn icon={Undo2} label="Undo" disabled={!canUndo || disabled} onClick={onUndo} />
      <Btn icon={Redo2} label="Redo" disabled={!canRedo || disabled} onClick={onRedo} />
      <Divider />

      <Btn icon={Bold}       label="Bold"       active={isBold}      disabled={disabled} onClick={onBold} />
      <Btn icon={Italic}     label="Italic"     active={isItalic}    disabled={disabled} onClick={onItalic} />
      <Btn icon={Underline}  label="Underline"  active={isUnderline} disabled={disabled} onClick={onUnderline} />
      <Divider />

      <Btn icon={AlignLeft}     label="Align left"    active={textAlign === "left"}    disabled={disabled} onClick={onAlignLeft} />
      <Btn icon={AlignCenter}   label="Align center"  active={textAlign === "center"}  disabled={disabled} onClick={onAlignCenter} />
      <Btn icon={AlignRight}    label="Align right"   active={textAlign === "right"}   disabled={disabled} onClick={onAlignRight} />
      <Btn icon={AlignJustify}  label="Justify"       active={textAlign === "justify"} disabled={disabled} onClick={onAlignJustify} />
      <Btn icon={WrapText}      label="Wrap text"     disabled={disabled}              onClick={onWrapText} />
      <Divider />

      <Btn icon={Hash}       label="Number format"   disabled={disabled} onClick={onFormatNumber} />
      <Btn icon={DollarSign} label="Currency format" disabled={disabled} onClick={onFormatCurrency} />
      <Btn icon={Percent}    label="Percent format"  disabled={disabled} onClick={onFormatPercent} />
      <Btn icon={Calendar}   label="Date format"     disabled={disabled} onClick={onFormatDate} />
      <Divider />

      <Btn icon={Merge}    label="Merge cells"     active={isMerged}   disabled={disabled} onClick={onMerge} />
      <Btn icon={SortAsc}  label="Sort"            disabled={disabled} onClick={onSort} />
      <Btn icon={Filter}   label="Filter"          active={isFiltered} disabled={disabled} onClick={onFilter} />
      <Btn icon={Columns}  label="Freeze rows/cols" active={isFrozen}  disabled={disabled} onClick={onFreeze} />
      <Divider />

      <Btn icon={Search}   label="Find" disabled={disabled} onClick={onFind} />
    </div>
  );
}
