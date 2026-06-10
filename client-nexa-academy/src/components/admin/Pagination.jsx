import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE_OPTIONS = [10, 20, 50];

/**
 * Shared pagination bar matching the design reference.
 *
 * Props
 *   total          — total record count from API
 *   page           — current 1-based page number
 *   pageSize       — current rows-per-page value
 *   onPageChange   — (newPage: number) => void
 *   onPageSizeChange — (newSize: number) => void
 *   label          — noun shown next to total count, e.g. "applications"
 */
export function Pagination({ total = 0, page = 1, pageSize = 10, onPageChange, onPageSizeChange, label = "items" }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const isFirst = page <= 1;
  const isLast  = page >= totalPages;

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 px-1 pt-3 text-sm text-muted-foreground select-none">
      {/* Left — record count */}
      <span className="tabular-nums">
        {total.toLocaleString()} {label}
      </span>

      {/* Right — controls */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Rows per page */}
        <div className="flex items-center gap-1.5">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange?.(Number(e.target.value));
              onPageChange?.(1);
            }}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {PAGE_SIZE_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Page indicator */}
        <span className="tabular-nums">
          Page {page} of {totalPages}
        </span>

        {/* Navigation */}
        <div className="flex items-center gap-0.5">
          <NavBtn disabled={isFirst} onClick={() => onPageChange?.(1)} title="First page">
            <ChevronFirst className="w-4 h-4" />
          </NavBtn>
          <NavBtn disabled={isFirst} onClick={() => onPageChange?.(page - 1)} title="Previous page">
            <ChevronLeft className="w-4 h-4" />
          </NavBtn>
          <NavBtn disabled={isLast} onClick={() => onPageChange?.(page + 1)} title="Next page">
            <ChevronRight className="w-4 h-4" />
          </NavBtn>
          <NavBtn disabled={isLast} onClick={() => onPageChange?.(totalPages)} title="Last page">
            <ChevronLast className="w-4 h-4" />
          </NavBtn>
        </div>
      </div>
    </div>
  );
}

function NavBtn({ disabled, onClick, title, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-input bg-background hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
    >
      {children}
    </button>
  );
}
