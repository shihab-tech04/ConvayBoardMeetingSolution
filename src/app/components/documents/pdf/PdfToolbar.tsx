/**
 * PDF toolbar — page nav, zoom, rotate, annotation tools, side panels.
 */
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize, AlignCenter,
  RotateCw, Highlighter, Underline, Strikethrough, StickyNote,
  Type, Pencil, Square, MoveRight, Search, MessageSquare,
  History, GitBranch, Activity, Download, Printer, Undo2, Redo2,
} from "lucide-react";

export type PdfAnnotationTool =
  | "select" | "highlight" | "underline" | "strikeout"
  | "sticky" | "free-text" | "ink" | "rectangle" | "arrow";

export type PdfRightPanel = "comments" | "versions" | "workflow" | "activity" | null;

interface Props {
  pageNum: number;
  pageCount: number;
  zoom: number;
  rotation: number;
  activeTool: PdfAnnotationTool;
  rightPanel: PdfRightPanel;
  canAnnotate: boolean;
  canDownload: boolean;
  canPrint: boolean;
  canUndo: boolean;
  canRedo: boolean;
  showThumbnails: boolean;
  onPageChange: (page: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitPage: () => void;
  onFitWidth: () => void;
  onRotate: () => void;
  onToolChange: (tool: PdfAnnotationTool) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSearch: () => void;
  onPanel: (p: PdfRightPanel) => void;
  onToggleThumbnails: () => void;
  onDownload: () => void;
  onPrint: () => void;
}

function Btn({
  icon: Icon, label, active = false, disabled = false, onClick, size = 14,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string; active?: boolean; disabled?: boolean;
  onClick: () => void; size?: number;
}) {
  return (
    <button
      type="button"
      className={`pdf-toolbar__btn${active ? " pdf-toolbar__btn--active" : ""}`}
      title={label} aria-label={label} aria-pressed={active || undefined}
      disabled={disabled} onClick={onClick}
    >
      <Icon size={size} strokeWidth={2} />
    </button>
  );
}

function Divider() {
  return <div className="pdf-toolbar__divider" aria-hidden="true" />;
}

export function PdfToolbar({
  pageNum, pageCount, zoom, canAnnotate, canDownload, canPrint, canUndo, canRedo,
  showThumbnails, activeTool, rightPanel,
  onPageChange, onZoomIn, onZoomOut, onFitPage, onFitWidth, onRotate,
  onToolChange, onUndo, onRedo, onSearch, onPanel, onToggleThumbnails,
  onDownload, onPrint,
}: Props) {
  return (
    <div className="pdf-toolbar" role="toolbar" aria-label="PDF controls">
      {/* Thumbnails toggle */}
      <Btn icon={AlignCenter} label="Toggle thumbnails" active={showThumbnails} onClick={onToggleThumbnails} />
      <Divider />

      {/* Page navigation */}
      <Btn icon={ChevronLeft} label="Previous page" disabled={pageNum <= 1} onClick={() => onPageChange(pageNum - 1)} />
      <span className="pdf-toolbar__page-info">
        <input
          type="number"
          className="pdf-toolbar__page-input"
          value={pageNum}
          min={1} max={pageCount}
          aria-label="Current page"
          onChange={e => {
            const v = parseInt(e.target.value, 10);
            if (v >= 1 && v <= pageCount) onPageChange(v);
          }}
        />
        <span className="pdf-toolbar__page-sep">/</span>
        <span aria-label={`of ${pageCount} pages`}>{pageCount}</span>
      </span>
      <Btn icon={ChevronRight} label="Next page" disabled={pageNum >= pageCount} onClick={() => onPageChange(pageNum + 1)} />

      <Divider />

      {/* Zoom */}
      <Btn icon={ZoomOut}    label="Zoom out"   disabled={zoom <= 25}  onClick={onZoomOut} />
      <span className="pdf-toolbar__zoom-label" aria-label={`Zoom ${zoom}%`}>{zoom}%</span>
      <Btn icon={ZoomIn}     label="Zoom in"    disabled={zoom >= 400} onClick={onZoomIn} />
      <Btn icon={Maximize}   label="Fit page"   onClick={onFitPage} />
      <Btn icon={AlignCenter} label="Fit width" onClick={onFitWidth} />
      <Btn icon={RotateCw}   label="Rotate clockwise" onClick={onRotate} />

      <Divider />

      {/* Annotation tools — only when permitted */}
      {canAnnotate && (
        <>
          <Btn icon={Highlighter}   label="Highlight"    active={activeTool === "highlight"}  onClick={() => onToolChange("highlight")} />
          <Btn icon={Underline}     label="Underline"    active={activeTool === "underline"}  onClick={() => onToolChange("underline")} />
          <Btn icon={Strikethrough} label="Strikeout"    active={activeTool === "strikeout"}  onClick={() => onToolChange("strikeout")} />
          <Btn icon={StickyNote}    label="Sticky note"  active={activeTool === "sticky"}     onClick={() => onToolChange("sticky")} />
          <Btn icon={Type}          label="Free text"    active={activeTool === "free-text"}  onClick={() => onToolChange("free-text")} />
          <Btn icon={Pencil}        label="Draw"         active={activeTool === "ink"}        onClick={() => onToolChange("ink")} />
          <Btn icon={Square}        label="Rectangle"    active={activeTool === "rectangle"}  onClick={() => onToolChange("rectangle")} />
          <Btn icon={MoveRight}     label="Arrow"        active={activeTool === "arrow"}      onClick={() => onToolChange("arrow")} />
          <Divider />
          <Btn icon={Undo2} label="Undo" disabled={!canUndo} onClick={onUndo} />
          <Btn icon={Redo2} label="Redo" disabled={!canRedo} onClick={onRedo} />
          <Divider />
        </>
      )}

      {/* Search */}
      <Btn icon={Search} label="Search" onClick={onSearch} />
      <Divider />

      {/* Side panels */}
      <Btn icon={MessageSquare} label="Comments"       active={rightPanel === "comments"}  onClick={() => onPanel(rightPanel === "comments"  ? null : "comments")} />
      <Btn icon={History}       label="Version history" active={rightPanel === "versions"}  onClick={() => onPanel(rightPanel === "versions"  ? null : "versions")} />
      <Btn icon={GitBranch}     label="Workflow"       active={rightPanel === "workflow"}   onClick={() => onPanel(rightPanel === "workflow"  ? null : "workflow")} />
      <Btn icon={Activity}      label="Activity"       active={rightPanel === "activity"}   onClick={() => onPanel(rightPanel === "activity"  ? null : "activity")} />

      <div className="pdf-toolbar__spacer" />

      {canDownload && <Btn icon={Download} label="Download" onClick={onDownload} />}
      {canPrint    && <Btn icon={Printer}  label="Print"    onClick={onPrint} />}
    </div>
  );
}
