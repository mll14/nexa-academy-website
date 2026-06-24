import { Button } from './button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPrev: () => void
  onNext: () => void
}

export function Pagination({ page, totalPages, total, pageSize, onPrev, onNext }: PaginationProps) {
  if (total <= pageSize) return null
  const from = (page - 1) * pageSize + 1
  const to   = Math.min(page * pageSize, total)
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
      <p className="text-sm text-muted-foreground">
        {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 gap-1"
          disabled={page <= 1}
          onClick={onPrev}
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Prev
        </Button>
        <span className="text-sm text-muted-foreground px-2">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 gap-1"
          disabled={page >= totalPages}
          onClick={onNext}
        >
          Next <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}
