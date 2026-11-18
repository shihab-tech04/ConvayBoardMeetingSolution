/**
 * PDF text search panel.
 * Searches the text content of the loaded PDF using pdfjs-dist's getTextContent.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { Search, X, ChevronUp, ChevronDown } from "lucide-react";
import { searchPdfText, type PdfTextSearchResult } from "./pdfTextSearch";

interface Props {
  pdfDoc: PDFDocumentProxy | null;
  hasTextLayer: boolean;
  onNavigate: (pageNum: number) => void;
  onClose: () => void;
}

export function PdfSearchPanel({ pdfDoc, hasTextLayer, onNavigate, onClose }: Props) {
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState<PdfTextSearchResult[]>([]);
  const [current, setCurrent] = useState(-1);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const requestVersion = useRef(0);

  // A newly loaded document or an unmounted panel invalidates old PDF.js work.
  useEffect(() => {
    requestVersion.current += 1;
    setResults([]);
    setCurrent(-1);
    setSearching(false);
    setSearchError("");
    return () => { requestVersion.current += 1; };
  }, [pdfDoc]);

  function clearSearch(nextQuery: string) {
    requestVersion.current += 1;
    setQuery(nextQuery);
    setResults([]);
    setCurrent(-1);
    setSearching(false);
    setSearchError("");
  }

  const runSearch = useCallback(async (q: string) => {
    const version = ++requestVersion.current;
    setResults([]);
    setCurrent(-1);
    setSearchError("");
    if (!q.trim() || !pdfDoc) { setSearching(false); return; }
    setSearching(true);
    try {
      // Do not use hasTextLayer as an eligibility gate: it describes only page 1.
      const found = await searchPdfText(pdfDoc, q, () => requestVersion.current === version);
      if (requestVersion.current !== version) return;
      setResults(found);
      setCurrent(found.length > 0 ? 0 : -1);
      if (found.length > 0) onNavigate(found[0].pageNum);
    } catch (error) {
      if (requestVersion.current !== version) return;
      setSearchError(error instanceof Error ? error.message : "Unable to search this PDF.");
    } finally {
      if (requestVersion.current === version) setSearching(false);
    }
  }, [pdfDoc, onNavigate]);

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
          onChange={e => clearSearch(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") void runSearch(query); }}
          autoFocus
        />
        {query && (
          <button type="button" className="pdf-search-panel__clear"
            onClick={() => clearSearch("")}
            aria-label="Clear search">
            <X size={12} strokeWidth={2.5} />
          </button>
        )}
        <button type="button" className="pdf-search-panel__run btn btn--sm btn--secondary"
          onClick={() => void runSearch(query)} disabled={!query.trim()}>
          Search
        </button>
        <button type="button" className="pdf-search-panel__close" onClick={() => { requestVersion.current += 1; onClose(); }} aria-label="Close search">
          <X size={14} strokeWidth={2} />
        </button>
      </div>

      {!hasTextLayer && !query && (
        <p className="pdf-search-panel__no-text" role="status">
          The first page has no selectable text. Search can still check other pages.
        </p>
      )}

      {searching && (
        <p className="pdf-search-panel__status" role="status" aria-live="polite">
          Searching…
        </p>
      )}

      {searchError && !searching && (
        <p className="pdf-search-panel__status" role="alert">{searchError}</p>
      )}

      {!searching && query && results.length === 0 && !searchError && (
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
