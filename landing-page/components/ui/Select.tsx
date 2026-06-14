'use client'

import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  type ReactNode,
} from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Ctx {
  value: string
  onValueChange: (v: string) => void
  open: boolean
  setOpen: (v: boolean) => void
  disabled?: boolean
  labels: Record<string, string>
  registerLabel: (value: string, label: string) => void
}

const SelectCtx = createContext<Ctx>({
  value: '', onValueChange: () => {}, open: false, setOpen: () => {},
  labels: {}, registerLabel: () => {},
})

export function Select({
  value,
  onValueChange,
  disabled,
  children,
}: {
  value: string
  onValueChange: (v: string) => void
  disabled?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [labels, setLabels] = useState<Record<string, string>>({})
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function registerLabel(v: string, l: string) {
    setLabels((prev) => (prev[v] === l ? prev : { ...prev, [v]: l }))
  }

  return (
    <SelectCtx.Provider value={{ value, onValueChange, open, setOpen, disabled, labels, registerLabel }}>
      <div ref={ref} className="relative">{children}</div>
    </SelectCtx.Provider>
  )
}

export function SelectTrigger({ children, className }: { children: ReactNode; className?: string }) {
  const { open, setOpen, disabled } = useContext(SelectCtx)
  return (
    <button
      type="button"
      onClick={() => !disabled && setOpen(!open)}
      disabled={disabled}
      className={cn(
        'flex w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-3 h-11 text-sm transition-colors text-left',
        'hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        open && 'border-primary ring-2 ring-primary/20',
        className,
      )}
    >
      <span className="flex-1 truncate">{children}</span>
      <ChevronDown className={cn('w-4 h-4 text-muted-foreground shrink-0 transition-transform', open && 'rotate-180')} />
    </button>
  )
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value, labels } = useContext(SelectCtx)
  const label = value ? (labels[value] ?? value) : null
  return (
    <span className={cn(!label && 'text-muted-foreground')}>
      {label ?? placeholder}
    </span>
  )
}

export function SelectContent({ children, className }: { children: ReactNode; className?: string }) {
  const { open } = useContext(SelectCtx)
  if (!open) return null
  return (
    <div className={cn(
      'absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-md overflow-y-auto max-h-60',
      className,
    )}>
      {children}
    </div>
  )
}

export function SelectItem({
  value,
  children,
  disabled,
  className,
}: {
  value: string
  children: ReactNode
  disabled?: boolean
  className?: string
}) {
  const { value: selected, onValueChange, setOpen, registerLabel } = useContext(SelectCtx)

  useEffect(() => {
    if (typeof children === 'string') registerLabel(value, children)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, children])

  return (
    <div
      role="option"
      aria-selected={selected === value}
      onClick={() => { if (!disabled) { onValueChange(value); setOpen(false) } }}
      className={cn(
        'px-3 py-2 text-sm cursor-pointer transition-colors',
        selected === value ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted',
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        className,
      )}
    >
      {children}
    </div>
  )
}
