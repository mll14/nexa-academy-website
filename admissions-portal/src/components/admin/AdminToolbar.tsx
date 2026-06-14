import { useRef, useEffect, useState } from 'react'
import { Search, ArrowUpDown, SlidersHorizontal } from 'lucide-react'
import { Select } from '../ui/select'

interface SortOption { value: string; label: string }
interface FilterGroup { key: string; label: string; options: { value: string; label: string }[] }

interface Props {
  search?: string
  onSearchChange?: (v: string) => void
  searchPlaceholder?: string
  sortOptions?: SortOption[]
  sortBy?: string
  onSortByChange?: (v: string) => void
  sortOrder?: string
  onSortOrderChange?: (v: string) => void
  filterGroups?: FilterGroup[]
  activeFilters?: Record<string, string>
  onFilterChange?: (key: string, value: string) => void
  onApply?: () => void
  onReset?: () => void
}

export function AdminToolbar({
  search = '', onSearchChange, searchPlaceholder = 'Search…',
  sortOptions = [], sortBy = '', onSortByChange, sortOrder = 'desc', onSortOrderChange,
  filterGroups = [], activeFilters = {}, onFilterChange, onApply, onReset,
}: Props) {
  const [sortOpen, setSortOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [draftSort, setDraftSort] = useState({ by: sortBy, order: sortOrder })
  const [draftFilters, setDraftFilters] = useState({ ...activeFilters })
  const sortRef = useRef<HTMLDivElement>(null)
  const filterRef = useRef<HTMLDivElement>(null)

  useEffect(() => setDraftSort({ by: sortBy, order: sortOrder }), [sortBy, sortOrder])
  useEffect(() => setDraftFilters({ ...activeFilters }), [JSON.stringify(activeFilters)])

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false)
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length

  const applySort = () => {
    onSortByChange?.(draftSort.by); onSortOrderChange?.(draftSort.order); onApply?.(); setSortOpen(false)
  }
  const resetSort = () => {
    const def = { by: sortOptions[0]?.value ?? '', order: 'desc' }
    setDraftSort(def); onSortByChange?.(def.by); onSortOrderChange?.(def.order); onReset?.(); setSortOpen(false)
  }
  const applyFilters = () => {
    Object.entries(draftFilters).forEach(([k, v]) => onFilterChange?.(k, v)); onApply?.(); setFilterOpen(false)
  }
  const resetFilters = () => {
    const cleared: Record<string, string> = {}
    filterGroups.forEach((g) => { cleared[g.key] = '' })
    setDraftFilters(cleared); Object.keys(cleared).forEach((k) => onFilterChange?.(k, '')); onReset?.(); setFilterOpen(false)
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          value={search}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {sortOptions.length > 0 && (
        <div className="relative shrink-0" ref={sortRef}>
          <button
            onClick={() => { setSortOpen((o) => !o); setFilterOpen(false) }}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium border border-border rounded-xl bg-background hover:bg-muted transition-colors"
          >
            <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            <span>Sort</span>
          </button>
          {sortOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-lg z-30 p-4 space-y-3">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">Sort By</p>
                <Select
                  value={draftSort.by}
                  onChange={(v) => setDraftSort((d) => ({ ...d, by: v }))}
                  options={sortOptions}
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">Order</p>
                <Select
                  value={draftSort.order}
                  onChange={(v) => setDraftSort((d) => ({ ...d, order: v }))}
                  options={[{ value: 'desc', label: 'Descending' }, { value: 'asc', label: 'Ascending' }]}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={applySort} className="flex-1 py-1.5 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">Apply</button>
                <button onClick={resetSort} className="flex-1 py-1.5 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors">Reset</button>
              </div>
            </div>
          )}
        </div>
      )}

      {filterGroups.length > 0 && (
        <div className="relative shrink-0" ref={filterRef}>
          <button
            onClick={() => { setFilterOpen((o) => !o); setSortOpen(false) }}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium border rounded-xl bg-background hover:bg-muted transition-colors ${activeFilterCount > 0 ? 'border-primary text-primary' : 'border-border'}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-primary-foreground bg-primary rounded-full">{activeFilterCount}</span>
            )}
          </button>
          {filterOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-xl shadow-lg z-30 p-4 space-y-4">
              {filterGroups.map((group) => (
                <div key={group.key}>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">{group.label}</p>
                  <Select
                    value={draftFilters[group.key] ?? ''}
                    onChange={(v) => setDraftFilters((d) => ({ ...d, [group.key]: v }))}
                    options={[{ value: '', label: 'All' }, ...group.options]}
                  />
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <button onClick={applyFilters} className="flex-1 py-1.5 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">Apply</button>
                <button onClick={resetFilters} className="flex-1 py-1.5 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors">Reset</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
