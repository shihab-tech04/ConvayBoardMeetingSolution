/**
 * SVG overlay that renders PDF annotation metadata on top of a page canvas.
 * The original PDF binary is never modified — annotations are metadata only.
 *
 * Coordinates are normalised (0–1) relative to the unrotated page dimensions.
 * Rotation is applied by the parent CSS transform; this layer does not re-rotate.
 *
 * Each rendered element has `pointerEvents: "all"` so it can receive clicks
 * even though the SVG container keeps `pointerEvents: "none"` (avoids blocking
 * canvas interactions in empty areas).
 */
import { useRef } from "react";
import type { PdfAnnotation } from "./pdfAnnotationTypes";

interface Props {
  annotations:         PdfAnnotation[];
  pageNumber:          number;
  pageWidth:           number;
  pageHeight:          number;
  activeAnnotationId?: string;
  onAnnotationClick?:  (id: string) => void;
}

// ── Colour tokens ──────────────────────────────────────────────────────────────

const FILL_COLORS: Record<string, string> = {
  highlight:   "rgba(255, 220,   0, 0.40)",
  underline:   "rgba(  0, 112, 220, 0.80)",
  strikeout:   "rgba(220,  38,  38, 0.70)",
  rectangle:   "rgba(  0, 112, 220, 0.15)",
  sticky:      "rgba(255, 200,   0, 0.85)",
  "free-text": "rgba( 30,  30,  30, 0.85)",
  ink:         "rgba( 30, 100, 220, 0.50)",
  arrow:       "rgba(  0, 112, 220, 0.90)",
};

const STROKE_COLORS: Record<string, string> = {
  rectangle:   "rgba(  0, 112, 220, 0.80)",
  underline:   "rgba(  0, 112, 220, 0.90)",
  strikeout:   "rgba(220,  38,  38, 0.90)",
  arrow:       "rgba(  0, 112, 220, 0.90)",
};

function fillColor(type: string) { return FILL_COLORS[type]   ?? "rgba(100, 100, 200, 0.5)"; }
function strokeColor(type: string) { return STROKE_COLORS[type] ?? "transparent"; }

// ── Individual annotation renderers ───────────────────────────────────────────

interface AnnProps {
  ann:    PdfAnnotation;
  width:  number;
  height: number;
  active: boolean;
  onClick: () => void;
}

function AnnotationElement({ ann, width, height, active, onClick }: AnnProps) {
  if (!ann.rect && ann.type !== "sticky" && ann.type !== "free-text") return null;

  const rect   = ann.rect ?? { x: 0.1, y: 0.1, width: 0.05, height: 0.05 };
  const px     = rect.x      * width;
  const py     = rect.y      * height;
  const pw     = rect.width  * width;
  const ph     = rect.height * height;
  const cls    = `pdf-ann pdf-ann--${ann.type}${active ? " pdf-ann--active" : ""}`;
  const common = {
    role:        "button" as const,
    tabIndex:    0,
    onClick,
    onKeyDown:   (e: React.KeyboardEvent) => (e.key === "Enter" || e.key === " ") && onClick(),
    style:       { pointerEvents: "all" as const },
  };

  // ── Arrow ──────────────────────────────────────────────────────────────────
  if (ann.type === "arrow") {
    return (
      <g className={cls} aria-label="Arrow annotation" {...common}>
        <line
          x1={px} y1={py} x2={px + pw} y2={py + ph}
          stroke={strokeColor("arrow")} strokeWidth="2.5"
          markerEnd="url(#pdf-arrowhead)"
        />
        {/* Wider invisible hit target */}
        <line x1={px} y1={py} x2={px + pw} y2={py + ph} stroke="transparent" strokeWidth="10" />
      </g>
    );
  }

  // ── Underline — horizontal line at the bottom of the rect ─────────────────
  if (ann.type === "underline") {
    const lineY = py + ph;
    return (
      <g className={cls} aria-label="Underline annotation" {...common}>
        <line x1={px} y1={lineY} x2={px + pw} y2={lineY}
          stroke={strokeColor("underline")} strokeWidth="2" />
        {/* Hit target */}
        <rect x={px} y={py} width={pw} height={Math.max(ph, 10)} fill="transparent" />
      </g>
    );
  }

  // ── Strikeout — horizontal line through the middle of the rect ───────────
  if (ann.type === "strikeout") {
    const lineY = py + ph / 2;
    return (
      <g className={cls} aria-label="Strikeout annotation" {...common}>
        <line x1={px} y1={lineY} x2={px + pw} y2={lineY}
          stroke={strokeColor("strikeout")} strokeWidth="2" />
        {/* Hit target */}
        <rect x={px} y={py} width={pw} height={Math.max(ph, 10)} fill="transparent" />
      </g>
    );
  }

  // ── Rectangle — outlined box ───────────────────────────────────────────────
  if (ann.type === "rectangle") {
    return (
      <rect
        x={px} y={py} width={pw} height={ph}
        fill={fillColor("rectangle")}
        stroke={active ? "var(--color-primary, #6366f1)" : strokeColor("rectangle")}
        strokeWidth={active ? 2.5 : 1.5}
        rx="2"
        className={cls}
        aria-label="Rectangle annotation"
        {...common}
      />
    );
  }

  // ── Sticky note — small square with fold indicator ─────────────────────────
  if (ann.type === "sticky") {
    const s  = Math.min(pw, ph);
    const fx = px + s - 8; // fold x
    const fy = py;
    return (
      <g className={cls} aria-label="Sticky note annotation" {...common}>
        <polygon
          points={`${px},${fy} ${fx},${fy} ${px+s},${fy+8} ${px+s},${fy+s} ${px},${fy+s}`}
          fill={fillColor("sticky")}
          stroke={active ? "var(--color-primary, #6366f1)" : "rgba(200,150,0,0.6)"}
          strokeWidth={active ? 2 : 1}
        />
        <polyline
          points={`${fx},${fy} ${fx},${fy+8} ${px+s},${fy+8}`}
          fill="rgba(200,150,0,0.3)" stroke="rgba(200,150,0,0.6)" strokeWidth="1"
        />
      </g>
    );
  }

  // ── Free text — rect with text label ──────────────────────────────────────
  if (ann.type === "free-text") {
    return (
      <g className={cls} aria-label="Free text annotation" {...common}>
        <rect x={px} y={py} width={pw} height={ph}
          fill="rgba(255,255,255,0.92)"
          stroke={active ? "var(--color-primary, #6366f1)" : "rgba(30,30,30,0.4)"}
          strokeWidth={active ? 2 : 1} rx="2"
        />
        <foreignObject x={px+2} y={py+2} width={Math.max(pw-4, 1)} height={Math.max(ph-4, 1)}>
          <div
            style={{
              fontSize: "10px",
              color: "#111",
              overflow: "hidden",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              lineHeight: 1.2,
              height: "100%",
            }}
          >
            {ann.text ?? "Text"}
          </div>
        </foreignObject>
      </g>
    );
  }

  // ── Highlight + ink + default — filled rect ───────────────────────────────
  return (
    <rect
      x={px} y={py} width={pw} height={ph}
      fill={fillColor(ann.type)}
      stroke={active ? "var(--color-primary, #6366f1)" : "transparent"}
      strokeWidth={active ? 2 : 0}
      rx="2"
      className={cls}
      aria-label={`${ann.type} annotation`}
      {...common}
    />
  );
}

// ── Layer ──────────────────────────────────────────────────────────────────────

export function PdfAnnotationLayer({
  annotations,
  pageNumber,
  pageWidth,
  pageHeight,
  activeAnnotationId,
  onAnnotationClick,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  const pageAnns = annotations.filter(a => a.page === pageNumber && a.status === "active");
  if (pageAnns.length === 0 && !activeAnnotationId) return null;

  return (
    <svg
      ref={svgRef}
      className="pdf-annotation-layer"
      style={{
        position: "absolute",
        top: 0, left: 0,
        width:  `${pageWidth}px`,
        height: `${pageHeight}px`,
        pointerEvents: "none",
        overflow: "visible",
      }}
      aria-label="Annotation layer"
      aria-hidden={pageAnns.length === 0}
    >
      <defs>
        <marker id="pdf-arrowhead" markerWidth="8" markerHeight="6"
          refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill={fillColor("arrow")} />
        </marker>
      </defs>

      {pageAnns.map(ann => (
        <AnnotationElement
          key={ann.id}
          ann={ann}
          width={pageWidth}
          height={pageHeight}
          active={ann.id === activeAnnotationId}
          onClick={() => onAnnotationClick?.(ann.id)}
        />
      ))}
    </svg>
  );
}
