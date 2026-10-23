/**
 * Renders a single PDF page onto a <canvas> via pdfjs-dist.
 * Handles HiDPI scaling via devicePixelRatio.
 */
import { useEffect, useRef, useState } from "react";
import type { PDFPageProxy } from "pdfjs-dist";
import { Loader2 } from "lucide-react";

interface Props {
  page: PDFPageProxy;
  scale: number;
  rotation: number;
  /** Called once the canvas dimensions are known (for annotation overlay sizing). */
  onDimensions?: (width: number, height: number) => void;
}

export function PdfPageCanvas({ page, scale, rotation, onDimensions }: Props) {
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const onDimsRef     = useRef(onDimensions);
  const [rendering, setRendering] = useState(true);

  // Keep ref current so the effect never needs onDimensions as a dependency.
  useEffect(() => { onDimsRef.current = onDimensions; });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const viewport = page.getViewport({ scale, rotation });
    const dpr      = window.devicePixelRatio || 1;

    canvas.width  = Math.floor(viewport.width  * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.width  = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;

    onDimsRef.current?.(Math.floor(viewport.width), Math.floor(viewport.height));

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const task = page.render({ canvasContext: ctx, viewport, canvas } as Parameters<typeof page.render>[0]);

    setRendering(true);
    let cancelled = false;

    task.promise
      .then(() => { if (!cancelled) setRendering(false); })
      .catch(() => { if (!cancelled) setRendering(false); });

    return () => {
      cancelled = true;
      task.cancel();
    };
  }, [page, scale, rotation]); // onDimensions excluded — accessed via ref

  return (
    <div className="pdf-page-canvas-wrap" style={{ position: "relative" }}>
      {rendering && (
        <div className="pdf-page-canvas-loading" aria-hidden="true">
          <Loader2 size={18} className="spin-icon" strokeWidth={1.5} />
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="pdf-page-canvas"
        aria-label={`PDF page`}
        role="img"
      />
    </div>
  );
}
