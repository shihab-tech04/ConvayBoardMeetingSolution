/**
 * PdfViewerCore — shared PDF rendering core for all viewing surfaces.
 *
 * Owns: PDF.js loading, page rendering, navigation, zoom, calculated fit-page,
 * calculated fit-width (ResizeObserver), rotation, search, thumbnails, loading
 * states, download, print, annotation rendering.
 *
 * Does NOT know whether its file came from Document Library, a meeting form,
 * an agenda attachment, a drawer, or Special Registration.
 *
 * Callers pass a DocumentSource and a permissions object; this component
 * decides what panels and actions to show based on those permissions.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { toast } from "sonner";
import {
  ArrowLeft, FileText, Loader2, AlertTriangle,
  FileX, ShieldAlert, GitBranch, History, Activity,
} from "lucide-react";
import { Button } from "../../buttons/Button";
import {
  useDocumentVersionRegistry,
  useAuditEventRegistry,
} from "../../../data/boardMeetingData";
import { DocumentEditorShell } from "../editor/DocumentEditorShell";
import { PdfToolbar, type PdfAnnotationTool, type PdfRightPanel } from "./PdfToolbar";
import { PdfPageCanvas } from "./PdfPageCanvas";
import { PdfAnnotationLayer } from "./PdfAnnotationLayer";
import { PdfThumbnailRail } from "./PdfThumbnailRail";
import { PdfSearchPanel } from "./PdfSearchPanel";
import { PdfCommentsPanel } from "./PdfCommentsPanel";
import type { PdfAnnotation } from "./pdfAnnotationTypes";
import type { DocumentSource } from "../documentSource";
import { resolveDocumentFile } from "../documentSource";

// ── Worker (configured once at module scope) ──────────────────────────────────
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

// ── Types ──────────────────────────────────────────────────────────────────────

type LoadState = "idle" | "loading" | "ready" | "missing" | "password" | "invalid" | "error";

export interface PdfPermissions {
  download:  boolean;
  print:     boolean;
  annotate:  boolean;
  comment:   boolean;
  versions:  boolean;
  workflow:  boolean;
}

export interface PdfViewerCoreProps {
  source:       DocumentSource;
  documentId?:  string;
  title:        string;
  version?:     string;
  /** Context label shown next to the document title, e.g. workflow status. */
  contextLabel?: string;
  permissions:  PdfPermissions;
  /** "workspace" shows full shell header; "preview" omits version/workflow panels. */
  mode?:        "workspace" | "preview";
  onClose:      () => void;
}

// ── Annotation persistence ────────────────────────────────────────────────────

async function loadAnnotations(docId: string): Promise<PdfAnnotation[]> {
  const { documentContentStore } = await import("../../../services/repositories/documentContentStore");
  const json = await documentContentStore.getPdfAnnotations(docId);
  if (!json) return [];
  try { return JSON.parse(json) as PdfAnnotation[]; } catch { return []; }
}

async function saveAnnotations(docId: string, anns: PdfAnnotation[]) {
  const { documentContentStore } = await import("../../../services/repositories/documentContentStore");
  await documentContentStore.putPdfAnnotations(docId, JSON.stringify(anns));
}

// ── Annotation geometry per tool ──────────────────────────────────────────────
// Returns a normalised rect [0–1] centred on the click point (cx, cy).

function annotationGeometry(
  tool: PdfAnnotationTool,
  cx: number,
  cy: number,
): { x: number; y: number; width: number; height: number } {
  const clamp = (v: number) => Math.max(0, Math.min(0.99, v));
  switch (tool) {
    case "highlight":  return { x: clamp(cx - 0.10), y: clamp(cy - 0.015), width: 0.20,  height: 0.030 };
    case "underline":  return { x: clamp(cx - 0.075), y: clamp(cy - 0.004), width: 0.15, height: 0.008 };
    case "strikeout":  return { x: clamp(cx - 0.075), y: clamp(cy - 0.004), width: 0.15, height: 0.008 };
    case "sticky":     return { x: clamp(cx - 0.02),  y: clamp(cy - 0.02),  width: 0.045, height: 0.045 };
    case "free-text":  return { x: clamp(cx - 0.075), y: clamp(cy - 0.025), width: 0.15, height: 0.050 };
    case "rectangle":  return { x: clamp(cx - 0.05),  y: clamp(cy - 0.030), width: 0.10, height: 0.060 };
    case "arrow":      return { x: clamp(cx - 0.05),  y: clamp(cy - 0.025), width: 0.10, height: 0.050 };
    case "ink":        return { x: clamp(cx - 0.02),  y: clamp(cy - 0.02),  width: 0.04, height: 0.040 };
    default:           return { x: clamp(cx - 0.05),  y: clamp(cy - 0.025), width: 0.10, height: 0.050 };
  }
}

// ── Rotation coordinate de-rotation ──────────────────────────────────────────
// getBoundingClientRect() reflects the visual (rotated) bounding box.
// We need to convert the visual click back to unrotated page coordinates.

function derotateClick(
  rawX: number, rawY: number,
  rectW: number, rectH: number,
  rotation: number,
): { x: number; y: number } {
  const rx = rawX / rectW;
  const ry = rawY / rectH;
  switch (((rotation % 360) + 360) % 360) {
    case 90:  return { x: ry,     y: 1 - rx };
    case 180: return { x: 1 - rx, y: 1 - ry };
    case 270: return { x: 1 - ry, y: rx };
    default:  return { x: rx,     y: ry };
  }
}

// ── Versions panel ────────────────────────────────────────────────────────────

function VersionsPanel({ docId, versionReg }: {
  docId: string;
  versionReg: ReturnType<typeof useDocumentVersionRegistry>;
}) {
  const versions = useMemo(
    () => versionReg.items
      .filter(v => v.document_id === docId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [versionReg.items, docId],
  );
  return (
    <div className="pdf-panel">
      <div className="pdf-panel__head"><History size={13} strokeWidth={2} aria-hidden="true" /><span>Versions</span></div>
      <div className="pdf-panel__body">
        {versions.length === 0 && <p className="pdf-panel__empty">No saved versions.</p>}
        {versions.map(v => (
          <div key={v.id} className="pdf-panel__item">
            <span className="pdf-panel__item-type">v{v.version_number}</span>
            <span className="pdf-panel__item-note">
              {v.version_name ?? v.change_summary ?? `Version ${v.version_number}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Shell wrapper for error states ────────────────────────────────────────────

function ErrorShell({ title, badge, onClose, children }: {
  title: string; badge: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <DocumentEditorShell
      headerLeft={
        <>
          <button type="button" className="doc-editor__back-btn" onClick={onClose} aria-label="Back">
            <ArrowLeft size={16} strokeWidth={2} />
          </button>
          <span className="doc-workspace__head-title">{title}</span>
          <span className="doc-workspace__head-badge">{badge}</span>
        </>
      }
    >
      <div className="doc-workspace__body doc-workspace__body--centered">{children}</div>
    </DocumentEditorShell>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function PdfViewerCore({
  source,
  documentId,
  title,
  version,
  contextLabel,
  permissions,
  mode = "workspace",
  onClose,
}: PdfViewerCoreProps) {
  const docId = documentId ?? `pdf-${Date.now()}`;

  // Stable key to trigger reload only when the source actually changes.
  const sourceKey = useMemo<string>(() => {
    if (source.kind === "stored") return `stored:${source.documentId}:${source.versionId ?? "latest"}`;
    if (source.kind === "file")   return `file:${source.file.name}:${source.file.size}`;
    if (source.kind === "blob")   return `blob:${source.fileName}:${source.blob.size}`;
    return `url:${source.url}`;
  }, [source]);

  // Mutable ref so async effects always read the current source without re-running.
  const sourceRef = useRef<DocumentSource>(source);
  sourceRef.current = source;

  const [pdfDoc,       setPdfDoc]       = useState<PDFDocumentProxy | null>(null);
  const [loadState,    setLoadState]    = useState<LoadState>("idle");
  const [errorMsg,     setErrorMsg]     = useState<string | null>(null);
  const [pageNum,      setPageNum]      = useState(1);
  const [zoom,         setZoom]         = useState(100);
  const [rotation,     setRotation]     = useState(0);
  const [activeTool,   setActiveTool]   = useState<PdfAnnotationTool>("select");
  const [rightPanel,   setRightPanel]   = useState<PdfRightPanel>(null);
  const [showSearch,   setShowSearch]   = useState(false);
  const [showThumbs,   setShowThumbs]   = useState(true);
  const [annotations,  setAnnotations]  = useState<PdfAnnotation[]>([]);
  const [undoStack,    setUndoStack]    = useState<PdfAnnotation[][]>([]);
  const [redoStack,    setRedoStack]    = useState<PdfAnnotation[][]>([]);
  const [hasTextLayer, setHasTextLayer] = useState(false);
  const [pageDims,     setPageDims]     = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [containerSz,  setContainerSz]  = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [currentPage,  setCurrentPage]  = useState<pdfjsLib.PDFPageProxy | null>(null);

  const auditReg   = useAuditEventRegistry();
  const versionReg = useDocumentVersionRegistry();
  const containerRef   = useRef<HTMLDivElement>(null);
  const annotationsRef = useRef(annotations);
  annotationsRef.current = annotations;

  // ── Load PDF ────────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    let pdfInstance: PDFDocumentProxy | null = null;
    setLoadState("loading");
    setPdfDoc(null);
    setCurrentPage(null);
    setPageNum(1);
    setAnnotations([]);
    setUndoStack([]);
    setRedoStack([]);

    (async () => {
      let file: File;
      try {
        file = await resolveDocumentFile(sourceRef.current);
      } catch (err: unknown) {
        if (cancelled) return;
        const code = (err as { code?: string }).code;
        if (code === "NOT_FOUND") { setLoadState("missing"); return; }
        setLoadState("error");
        setErrorMsg(err instanceof Error ? err.message : String(err));
        return;
      }
      if (cancelled) return;

      const buffer = await file.arrayBuffer();
      try {
        const task = pdfjsLib.getDocument({ data: buffer });
        pdfInstance = await task.promise;
        if (cancelled) { void pdfInstance.cleanup(); return; }

        setPdfDoc(pdfInstance);
        setLoadState("ready");

        const pg      = await pdfInstance.getPage(1);
        const content = await pg.getTextContent();
        const hasText = content.items.some(
          item => "str" in item && (item as { str: string }).str.trim().length > 0,
        );
        if (!cancelled) setHasTextLayer(hasText);

        const aid = `AUD-${Date.now()}`;
        auditReg.add({
          id: aid, event_id: aid, entity_type: "Document", entity_id: docId,
          action: "PDF opened", actor: "current_user", actor_role: "User",
          timestamp: new Date().toISOString(), ip_address: "", approval_status: "Logged",
          details: `${pdfInstance.numPages} pages`,
        });
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("password")) setLoadState("password");
        else if (msg.includes("Invalid") || msg.includes("corrupt")) setLoadState("invalid");
        else { setLoadState("error"); setErrorMsg(msg); }
      }
    })().catch(() => { if (!cancelled) setLoadState("error"); });

    return () => { cancelled = true; void pdfInstance?.cleanup(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey, docId]);

  // ── Current page ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!pdfDoc) return;
    void pdfDoc.getPage(pageNum).then(setCurrentPage);
  }, [pdfDoc, pageNum]);

  // ── Annotations ─────────────────────────────────────────────────────────────

  useEffect(() => {
    void loadAnnotations(docId).then(setAnnotations);
  }, [docId]);

  // ── ResizeObserver for fit calculations ─────────────────────────────────────

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setContainerSz({ w: width, h: height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // ── Annotation management ───────────────────────────────────────────────────

  const addAnnotation = useCallback(async (
    partial: Omit<PdfAnnotation, "id" | "author" | "created_at" | "status">,
  ) => {
    const ann: PdfAnnotation = {
      ...partial,
      id:          `ann-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      document_id: docId,
      author:      "current_user",
      created_at:  new Date().toISOString(),
      status:      "active",
    };
    setUndoStack(s => [...s, annotationsRef.current]);
    setRedoStack([]);
    setAnnotations(prev => {
      const next = [...prev, ann];
      void saveAnnotations(docId, next);
      return next;
    });
    const aid = `AUD-${Date.now()}`;
    auditReg.add({
      id: aid, event_id: aid, entity_type: "Document", entity_id: docId,
      action: "Annotation added", actor: "current_user", actor_role: "User",
      timestamp: new Date().toISOString(), ip_address: "", approval_status: "Logged",
      details: `${ann.type} on page ${ann.page}`,
    });
  }, [docId, auditReg]);

  const undoAnnotation = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack(s => [...s, annotationsRef.current]);
    setAnnotations(prev);
    void saveAnnotations(docId, prev);
    setUndoStack(s => s.slice(0, -1));
  }, [undoStack, docId]);

  const redoAnnotation = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(s => [...s, annotationsRef.current]);
    setAnnotations(next);
    void saveAnnotations(docId, next);
    setRedoStack(s => s.slice(0, -1));
  }, [redoStack, docId]);

  // ── Zoom / fit ──────────────────────────────────────────────────────────────

  const handlePageDims = useCallback((w: number, h: number) => setPageDims({ w, h }), []);
  const handleZoomIn   = () => setZoom(z => Math.min(z + 25, 400));
  const handleZoomOut  = () => setZoom(z => Math.max(z - 25, 25));
  const handleRotate   = () => setRotation(r => (r + 90) % 360);

  const handleFitPage = useCallback(() => {
    if (!pageDims.w || !pageDims.h || !containerSz.w || !containerSz.h) { setZoom(100); return; }
    const pad = 40;
    const scaleW = (containerSz.w - pad) / pageDims.w;
    const scaleH = (containerSz.h - pad) / pageDims.h;
    setZoom(Math.max(25, Math.round(Math.min(scaleW, scaleH, 4) * 100)));
  }, [pageDims, containerSz]);

  const handleFitWidth = useCallback(() => {
    if (!pageDims.w || !containerSz.w) { setZoom(125); return; }
    setZoom(Math.max(25, Math.min(400, Math.round(((containerSz.w - 40) / pageDims.w) * 100))));
  }, [pageDims, containerSz]);

  // ── Download / print ────────────────────────────────────────────────────────

  const handleDownload = useCallback(async () => {
    try {
      const file = await resolveDocumentFile(sourceRef.current);
      const url  = URL.createObjectURL(file);
      Object.assign(document.createElement("a"), { href: url, download: file.name || title }).click();
      URL.revokeObjectURL(url);
      const aid = `AUD-${Date.now()}`;
      auditReg.add({
        id: aid, event_id: aid, entity_type: "Document", entity_id: docId,
        action: "PDF downloaded", actor: "current_user", actor_role: "User",
        timestamp: new Date().toISOString(), ip_address: "", approval_status: "Logged", details: "",
      });
    } catch { toast.error("File not available for download."); }
  }, [docId, title, auditReg]);

  const handlePrint = useCallback(async () => {
    try {
      const file = await resolveDocumentFile(sourceRef.current);
      const url  = URL.createObjectURL(file);
      const w    = window.open(url);
      w?.addEventListener("load", () => { w.print(); URL.revokeObjectURL(url); });
      const aid = `AUD-${Date.now()}`;
      auditReg.add({
        id: aid, event_id: aid, entity_type: "Document", entity_id: docId,
        action: "PDF printed", actor: "current_user", actor_role: "User",
        timestamp: new Date().toISOString(), ip_address: "", approval_status: "Logged", details: "",
      });
    } catch { toast.error("File not available for printing."); }
  }, [docId, auditReg]);

  // ── Annotated export ────────────────────────────────────────────────────────

  const handleExportAnnotated = useCallback(async () => {
    let file: File;
    try { file = await resolveDocumentFile(sourceRef.current); }
    catch { toast.error("Original file not found."); return; }
    toast.info("Preparing annotated export…");
    try {
      const { PDFDocument, rgb } = await import("pdf-lib");
      const pdfLibDoc = await PDFDocument.load(await file.arrayBuffer());
      const pages     = pdfLibDoc.getPages();
      for (const ann of annotationsRef.current.filter(a => a.status === "active")) {
        const page = pages[ann.page - 1];
        if (!page || !ann.rect) continue;
        const { width, height } = page.getSize();
        const { x: rx, y: ry, width: rw, height: rh } = ann.rect;
        const x = rx * width;
        const y = (1 - ry - rh) * height;
        const w = rw * width;
        const h = rh * height;
        if (ann.type === "highlight") {
          page.drawRectangle({ x, y, width: w, height: h, color: rgb(1, 0.9, 0), opacity: 0.4 });
        } else if (ann.type === "rectangle") {
          page.drawRectangle({ x, y, width: w, height: h, borderColor: rgb(0, 0.4, 0.8), borderWidth: 2, opacity: 0 });
        }
      }
      const outBytes = await pdfLibDoc.save();
      const blob     = new Blob([outBytes as unknown as BlobPart], { type: "application/pdf" });
      const url      = URL.createObjectURL(blob);
      Object.assign(document.createElement("a"), { href: url, download: `${title}-annotated.pdf` }).click();
      URL.revokeObjectURL(url);
      toast.success("Annotated copy exported.");
    } catch (err) {
      toast.error("Export failed. Please try again.");
      console.error("Annotated export error:", err);
    }
  }, [title]);

  // ── Error states ─────────────────────────────────────────────────────────────

  if (loadState === "missing") {
    return (
      <ErrorShell title={title} badge="PDF Viewer" onClose={onClose}>
        <div className="doc-workspace__state" role="alert">
          <FileX size={36} strokeWidth={1.25} aria-hidden="true" />
          <p className="doc-workspace__state-title">File not found</p>
          <p className="doc-workspace__state-desc">The PDF file has not been uploaded yet.</p>
          <Button variant="ghost" size="sm" leadingIcon={ArrowLeft} onClick={onClose}>Back</Button>
        </div>
      </ErrorShell>
    );
  }
  if (loadState === "password") {
    return (
      <ErrorShell title={title} badge="PDF Viewer" onClose={onClose}>
        <div className="doc-workspace__state" role="alert">
          <ShieldAlert size={36} strokeWidth={1.25} aria-hidden="true" />
          <p className="doc-workspace__state-title">Password required</p>
          <p className="doc-workspace__state-desc">This PDF is password-protected and cannot be opened locally.</p>
          {permissions.download && <Button variant="secondary" size="sm" onClick={handleDownload}>Download Original</Button>}
        </div>
      </ErrorShell>
    );
  }
  if (loadState === "invalid") {
    return (
      <ErrorShell title={title} badge="PDF Viewer" onClose={onClose}>
        <div className="doc-workspace__state" role="alert">
          <AlertTriangle size={36} strokeWidth={1.25} aria-hidden="true" />
          <p className="doc-workspace__state-title">Invalid PDF</p>
          <p className="doc-workspace__state-desc">This file could not be parsed as a valid PDF document.</p>
          <div className="doc-workspace__state-actions">
            {permissions.download && <Button variant="secondary" size="sm" onClick={handleDownload}>Download Original</Button>}
            <Button variant="ghost" size="sm" leadingIcon={ArrowLeft} onClick={onClose}>Back</Button>
          </div>
        </div>
      </ErrorShell>
    );
  }
  if (loadState === "error") {
    return (
      <ErrorShell title={title} badge="PDF Viewer" onClose={onClose}>
        <div className="doc-workspace__state" role="alert">
          <AlertTriangle size={36} strokeWidth={1.25} aria-hidden="true" />
          <p className="doc-workspace__state-title">Could not load PDF</p>
          <p className="doc-workspace__state-desc">{errorMsg ?? "An unexpected error occurred."}</p>
          <div className="doc-workspace__state-actions">
            <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>Retry</Button>
            <Button variant="ghost" size="sm" leadingIcon={ArrowLeft} onClick={onClose}>Back</Button>
          </div>
        </div>
      </ErrorShell>
    );
  }

  // ── Main layout ───────────────────────────────────────────────────────────────

  const pageCount = pdfDoc?.numPages ?? 0;

  const headerLeft = (
    <>
      <button type="button" className="doc-editor__back-btn" onClick={onClose} aria-label="Back">
        <ArrowLeft size={16} strokeWidth={2} />
      </button>
      <div className="doc-workspace__head-icon"><FileText size={15} strokeWidth={1.75} /></div>
      <span className="doc-workspace__head-title">{title}</span>
      {version && <span className="doc-workspace__head-ver">v{version}</span>}
      {contextLabel && <span className="doc-workspace__head-badge">{contextLabel}</span>}
    </>
  );

  const headerCenter = (
    <span className="doc-workspace__head-mode">
      {loadState === "loading" ? "Loading…" : "PDF Viewer · Read-only"}
    </span>
  );

  const headerRight = permissions.annotate ? (
    <button type="button" className="doc-editor__head-btn doc-editor__head-btn--sm"
      onClick={handleExportAnnotated} title="Export annotated copy">
      Export annotated
    </button>
  ) : undefined;

  const toolbar = loadState === "ready" ? (
    <>
      <PdfToolbar
        pageNum={pageNum} pageCount={pageCount}
        zoom={zoom} rotation={rotation}
        activeTool={activeTool} rightPanel={rightPanel}
        canAnnotate={permissions.annotate}
        canDownload={permissions.download}
        canPrint={permissions.print}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        showThumbnails={showThumbs}
        onPageChange={setPageNum}
        onZoomIn={handleZoomIn} onZoomOut={handleZoomOut}
        onFitPage={handleFitPage} onFitWidth={handleFitWidth}
        onRotate={handleRotate}
        onToolChange={setActiveTool}
        onUndo={undoAnnotation} onRedo={redoAnnotation}
        onSearch={() => setShowSearch(s => !s)}
        onPanel={setRightPanel}
        onToggleThumbnails={() => setShowThumbs(s => !s)}
        onDownload={handleDownload}
        onPrint={handlePrint}
      />
      {showSearch && pdfDoc && (
        <PdfSearchPanel
          pdfDoc={pdfDoc}
          hasTextLayer={hasTextLayer}
          onNavigate={page => { setPageNum(page); setShowSearch(false); }}
          onClose={() => setShowSearch(false)}
        />
      )}
    </>
  ) : undefined;

  const leftPanel = (showThumbs && pdfDoc) ? (
    <PdfThumbnailRail pdfDoc={pdfDoc} currentPage={pageNum} onNavigate={setPageNum} />
  ) : undefined;

  // Click handler with rotation-aware coordinate de-rotation.
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!permissions.annotate || activeTool === "select") return;
    const rect  = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const rawX  = e.clientX - rect.left;
    const rawY  = e.clientY - rect.top;
    const { x, y } = derotateClick(rawX, rawY, rect.width, rect.height, rotation);
    const geo = annotationGeometry(activeTool, x, y);
    void addAnnotation({
      document_id: docId,
      page: pageNum,
      type: activeTool as PdfAnnotation["type"],
      rect: geo,
    });
  }, [permissions.annotate, activeTool, rotation, pageNum, addAnnotation]);

  const canvas = (
    <div className="pdf-pages-area" ref={containerRef}>
      {loadState === "loading" && (
        <div className="doc-workspace__state" role="status">
          <Loader2 size={28} className="spin-icon" strokeWidth={1.5} />
          <span>Loading PDF…</span>
        </div>
      )}
      {loadState === "ready" && currentPage && (
        <div
          className="pdf-page-wrap"
          style={{ transform: rotation ? `rotate(${rotation}deg)` : undefined }}
          onClick={handleCanvasClick}
        >
          <PdfPageCanvas
            page={currentPage}
            scale={zoom / 100}
            rotation={0}
            onDimensions={handlePageDims}
          />
          <PdfAnnotationLayer
            annotations={annotations}
            pageNumber={pageNum}
            pageWidth={pageDims.w}
            pageHeight={pageDims.h}
          />
        </div>
      )}
    </div>
  );

  const rightPanelEl = rightPanel ? (
    <aside className="pdf-side-panel" aria-label={`${rightPanel} panel`}>
      {rightPanel === "comments" && permissions.comment && (
        <PdfCommentsPanel docId={docId} currentPage={pageNum} onNavigateToPage={setPageNum} />
      )}
      {rightPanel === "versions" && permissions.versions && (
        <VersionsPanel docId={docId} versionReg={versionReg} />
      )}
      {rightPanel === "workflow" && permissions.workflow && (
        <div className="pdf-panel">
          <div className="pdf-panel__head"><GitBranch size={13} strokeWidth={2} aria-hidden="true" /><span>Workflow</span></div>
          <div className="pdf-panel__body">
            <p className="pdf-panel__empty">Full workflow controls are in the document drawer.</p>
          </div>
        </div>
      )}
      {rightPanel === "activity" && (
        <div className="pdf-panel">
          <div className="pdf-panel__head"><Activity size={13} strokeWidth={2} aria-hidden="true" /><span>Activity</span></div>
          <div className="pdf-panel__body">
            <p className="pdf-panel__empty">Full activity log is in the document drawer.</p>
          </div>
        </div>
      )}
    </aside>
  ) : undefined;

  const statusBar = (
    <div className="pdf-readonly-notice" role="note">
      <AlertTriangle size={11} strokeWidth={2} aria-hidden="true" />
      <span>Local mode: viewing only. Text editing and form filling require ONLYOFFICE.</span>
    </div>
  );

  return (
    <DocumentEditorShell
      headerLeft={headerLeft}
      headerCenter={headerCenter}
      headerRight={headerRight}
      toolbar={toolbar}
      leftPanel={leftPanel}
      rightPanel={rightPanelEl}
      statusBar={statusBar}
      canvasLabel="PDF document"
    >
      {canvas}
    </DocumentEditorShell>
  );
}
