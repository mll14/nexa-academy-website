import { useRef, useEffect, useState } from "react";
import { Search, ArrowUpDown, SlidersHorizontal } from "lucide-react";

/**
 * Shared search + sort + filter toolbar for admin list pages.
 *
 * Props:
 *   search / onSearchChange / searchPlaceholder
 *   sortOptions   — [{value, label}]  (omit to hide Sort button)
 *   sortBy        — current sort field value
 *   onSortByChange
 *   sortOrder     — "asc" | "desc"
 *   onSortOrderChange
 *   filterGroups  — [{key, label, options:[{value,label}]}]  (omit to hide Filter button)
 *   activeFilters — {[key]: value}
 *   onFilterChange — (key, value) => void
 *   onApply       — called after Apply is clicked (triggers data reload in parent)
 *   onReset       — called after Reset is clicked
 */
export function AdminToolbar({
  search = "",
  onSearchChange,
  searchPlaceholder = "Search…",
  sortOptions = [],
  sortBy = "",
  onSortByChange,
  sortOrder = "desc",
  onSortOrderChange,
  filterGroups = [],
  activeFilters = {},
  onFilterChange,
  onApply,
  onReset,
}) {
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftSort, setDraftSort] = useState({ by: sortBy, order: sortOrder });
  const [draftFilters, setDraftFilters] = useState({ ...activeFilters });

  const sortRef   = useRef(null);
  const filterRef = useRef(null);

  // Sync drafts when parent-controlled values change
  useEffect(() => setDraftSort({ by: sortBy, order: sortOrder }), [sortBy, sortOrder]);
  useEffect(() => setDraftFilters({ ...activeFilters }), [JSON.stringify(activeFilters)]);

  // Close on outside click
  useEffect(() => {
    const handle = (e) => {
      if (sortRef.current   && !sortRef.current.contains(e.target))   setSortOpen(false);
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length;

  const applySort = () => {
    onSortByChange?.(draftSort.by);
    onSortOrderChange?.(draftSort.order);
    onApply?.();
    setSortOpen(false);
  };

  const resetSort = () => {
    const def = { by: sortOptions[0]?.value ?? "", order: "desc" };
    setDraftSort(def);
    onSortByChange?.(def.by);
    onSortOrderChange?.(def.order);
    onReset?.();
    setSortOpen(false);
  };

  const applyFilters = () => {
    Object.entries(draftFilters).forEach(([key, val]) => onFilterChange?.(key, val));
    onApply?.();
    setFilterOpen(false);
  };

  const resetFilters = () => {
    const cleared = {};
    filterGroups.forEach((g) => { cleared[g.key] = ""; });
    setDraftFilters(cleared);
    Object.keys(cleared).forEach((key) => onFilterChange?.(key, ""));
    onReset?.();
    setFilterOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Search input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          value={search}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-9 pr-3 py-2 text-sm border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Sort button */}
      {sortOptions.length > 0 && (
        <div className="relative shrink-0" ref={sortRef}>
          <button
            onClick={() => { setSortOpen((o) => !o); setFilterOpen(false); }}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium border rounded-xl bg-background hover:bg-muted transition-colors"
          >
            <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            <span>Sort</span>
          </button>

          {sortOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-card border rounded-xl shadow-lg z-30 p-4 space-y-3">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">Sort By</p>
                <select
                  value={draftSort.by}
                  onChange={(e) => setDraftSort((d) => ({ ...d, by: e.target.value }))}
                  className="w-full px-2.5 py-1.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {sortOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">Order</p>
                <select
                  value={draftSort.order}
                  onChange={(e) => setDraftSort((d) => ({ ...d, order: e.target.value }))}
                  className="w-full px-2.5 py-1.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={applySort}
                  className="flex-1 py-1.5 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                >
                  Apply
                </button>
                <button
                  onClick={resetSort}
                  className="flex-1 py-1.5 text-sm font-medium border rounded-lg hover:bg-muted transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter button */}
      {filterGroups.length > 0 && (
        <div className="relative shrink-0" ref={filterRef}>
          <button
            onClick={() => { setFilterOpen((o) => !o); setSortOpen(false); }}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium border rounded-xl bg-background hover:bg-muted transition-colors ${
              activeFilterCount > 0 ? "border-primary text-primary" : ""
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-primary rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>

          {filterOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-card border rounded-xl shadow-lg z-30 p-4 space-y-4">
              {filterGroups.map((group) => (
                <div key={group.key}>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">{group.label}</p>
                  <select
                    value={draftFilters[group.key] ?? ""}
                    onChange={(e) => setDraftFilters((d) => ({ ...d, [group.key]: e.target.value }))}
                    className="w-full px-2.5 py-1.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">All</option>
                    {group.options.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={applyFilters}
                  className="flex-1 py-1.5 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                >
                  Apply
                </button>
                <button
                  onClick={resetFilters}
                  className="flex-1 py-1.5 text-sm font-medium border rounded-lg hover:bg-muted transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
