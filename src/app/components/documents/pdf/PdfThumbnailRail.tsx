/**
 * Left thumbnail rail for PDF navigation.
 * Lazily renders thumbnails — only visible pages are rendered.
 */
import { useEffect, useRef, useState, memo } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";

interface Props {
  pdfDoc: PDFDocumentProxy;
  currentPage: number;
  onNavigate: (page: number) => void;
}

interface ThumbProps {
  pdfDoc: PDFDocumentProxy;
  pageNum: number;
  active: boolean;
  onClick: () => void;
}

const PdfThumbnail = memo(function PdfThumbnail({ pdfDoc, pageNum, active, onClick }: ThumbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);
  const rootRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !rendered) {
        void (async () => {
          const page     = await pdfDoc.getPage(pageNum);
          const viewport = page.getViewport({ scale: 0.2 });
          const canvas   = canvasRef.current;
          if (!canvas) return;
          canvas.width  = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          await page.render({ canvasContext: ctx, viewport } as Parameters<typeof page.render>[0]).promise;
          setRendered(true);
        })();
        observer.disconnect();
      }
    }, { threshold: 0.01 });

    observer.observe(el);
    return () => observer.disconnect();
  }, [pdfDoc, pageNum, rendered]);

  return (
    <div
      ref={rootRef}
      className={`pdf-thumb${active ? " pdf-thumb--active" : ""}`}
      role="button"
      tabIndex={0}
      aria-label={`Page ${pageNum}${active ? " (current)" : ""}`}
      aria-current={active}
      onClick={onClick}
      onKeyDown={e => e.key === "Enter" && onClick()}
    >
      <canvas ref={canvasRef} className="pdf-thumb__canvas" />
      {!rendered && <div className="pdf-thumb__placeholder" aria-hidden="true" />}
      <span className="pdf-thumb__label">{pageNum}</span>
    </div>
  );
});

export function PdfThumbnailRail({ pdfDoc, currentPage, onNavigate }: Props) {
  const pages = Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1);

  return (
    <nav className="pdf-thumb-rail" aria-label="Page thumbnails">
      {pages.map(n => (
        <PdfThumbnail
          key={n}
          pdfDoc={pdfDoc}
          pageNum={n}
          active={n === currentPage}
          onClick={() => onNavigate(n)}
        />
      ))}
    </nav>
  );
}
