import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  total: number;
  page: number;
  perPage: number;
  onPage: (p: number) => void;
}

export function Pagination({ total, page, perPage, onPage }: PaginationProps) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;
  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <nav
      aria-label="Pagination"
      className="pagination"
    >
      <span className="pagination__info" aria-live="polite" aria-atomic="true">
        Showing {from}–{to} of {total} records
      </span>
      <div className="pagination__controls" role="group" aria-label="Page navigation">
        <button
          disabled={page === 1}
          onClick={() => onPage(page - 1)}
          aria-label="Go to previous page"
          className="pagination__btn"
        >
          <ChevronLeft size={12} aria-hidden="true" />
          Previous
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            onClick={() => onPage(p)}
            aria-label={`Page ${p}`}
            aria-current={p === page ? "page" : undefined}
            className={`pagination__page${p === page ? " pagination__page--active" : ""}`}
          >
            {p}
          </button>
        ))}
        <button
          disabled={page === totalPages}
          onClick={() => onPage(page + 1)}
          aria-label="Go to next page"
          className="pagination__btn"
        >
          Next
          <ChevronRight size={12} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
