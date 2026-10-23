/**
 * PDF text search panel.
 * Searches the text content of the loaded PDF using pdfjs-dist's getTextContent.
 */
import { useState, useCallback } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { Search, X, ChevronUp, ChevronDown } from "lucide-react";

interface SearchResult {
  pageNum: number;
  text: string;
  excerpt: string;
}

interface Props {
  pdfDoc: PDFDocumentProxy | null;
  hasTextLayer: boolean;
  onNavigate: (pageNum: number) => void;
  onClose: () => void;
}

export function PdfSearchPanel({ pdfDoc, hasTextLayer, onNavigate, onClose }: Props) {
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [current, setCurrent] = useState(-1);
  const [searching, setSearching] = useState(false);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim() || !pdfDoc || !hasTextLayer) {
      setResults([]);
      setCurrent(-1);
      return;
    }
    setSearching(true);
    const found: SearchResult[] = [];
    const lower = q.toLowerCase();

    for (let p = 1; p <= pdfDoc.numPages; p++) {
      const page    = await pdfDoc.getPage(p);
      const content = await page.getTextContent();
      const text    = (content.items.filter((item) => "str" in item) as { str: string }[])
        .map(item => item.str)
        .join(" ");

      const idx = text.toLowerCase().indexOf(lower);
      if (idx !== -1) {
        const start = Math.max(0, idx - 30);
        const end   = Math.min(text.length, idx + q.length + 30);
        found.push({
          pageNum: p,
          text,
          excerpt: `…${text.slice(start, end)}…`,
        });
      }
    }

    setResults(found);
    setCurrent(found.length > 0 ? 0 : -1);
    if (found.length > 0) onNavigate(found[0].pageNum);
    setSearching(false);
  }, [pdfDoc, hasTextLayer, onNavigate]);

  function goPrev() {
    if (results.length === 0) return;
    const next = (current - 1 + results.length) % results.length;
    setCurrent(next);
    onNavigate(results[next].pageNum);
  }

  function goNext() {
    if (results.length === 0) return;
    const next = (current + 1) % results.length;
    setCurrent(next);
    onNavigate(results[next].pageNum);
  }

  return (
    <div className="pdf-search-panel" role="search" aria-label="PDF text search">
      <div className="pdf-search-panel__bar">
        <Search size={13} strokeWidth={2} aria-hidden="true" className="pdf-search-panel__icon" />
        <input
          type="search"
          className="pdf-search-panel__input"
          placeholder="Search in PDF…"
          value={query}
          aria-label="Search text"
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") void runSearch(query); }}
          autoFocus
        />
        {query && (
          <button type="button" className="pdf-search-panel__clear"
            onClick={() => { setQuery(""); setResults([]); setCurrent(-1); }}
            aria-label="Clear search">
            <X size={12} strokeWidth={2.5} />
          </button>
        )}
        <button type="button" className="pdf-search-panel__run btn btn--sm btn--secondary"
          onClick={() => void runSearch(query)} disabled={!query.trim()}>
          Search
        </button>
        <button type="button" className="pdf-search-panel__close" onClick={onClose} aria-label="Close search">
          <X size={14} strokeWidth={2} />
        </button>
      </div>

      {!hasTextLayer && (
        <p className="pdf-search-panel__no-text" role="status">
          No searchable text was found in this PDF.
        </p>
      )}

      {searching && (
        <p className="pdf-search-panel__status" role="status" aria-live="polite">
          Searching…
        </p>
      )}

      {!searching && query && results.length === 0 && hasTextLayer && (
        <p className="pdf-search-panel__status" role="status" aria-live="polite">
          No results for &ldquo;{query}&rdquo;.
        </p>
      )}

      {results.length > 0 && (
        <>
          <div className="pdf-search-panel__nav" role="status" aria-live="polite">
            <span>{current + 1} / {results.length} result{results.length !== 1 ? "s" : ""}</span>
            <button type="button" className="pdf-search-panel__nav-btn" onClick={goPrev} aria-label="Previous result"><ChevronUp size={13} strokeWidth={2.5} /></button>
            <button type="button" className="pdf-search-panel__nav-btn" onClick={goNext} aria-label="Next result"><ChevronDown size={13} strokeWidth={2.5} /></button>
          </div>
          <ul className="pdf-search-panel__results" aria-label="Search results">
            {results.map((r, i) => (
              <li key={`${r.pageNum}-${i}`}
                className={`pdf-search-panel__result${i === current ? " pdf-search-panel__result--current" : ""}`}
                role="option" aria-selected={i === current}
              >
                <button type="button" className="pdf-search-panel__result-btn"
                  onClick={() => { setCurrent(i); onNavigate(r.pageNum); }}>
                  <span className="pdf-search-panel__result-page">Page {r.pageNum}</span>
                  <span className="pdf-search-panel__result-excerpt">{r.excerpt}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
