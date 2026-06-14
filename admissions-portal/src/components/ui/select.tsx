import { useState, useRef, useEffect, useCallback, useId } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface SelectOptionItem {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOptionItem[]
  placeholder?: string
  icon?: React.ReactNode
  className?: string
  disabled?: boolean
}

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  icon,
  className,
  disabled,
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const id = useId()

  const selectedLabel = options.find((o) => o.value === value)?.label

  const openMenu = useCallback(() => {
    if (disabled) return
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    setPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX, width: rect.width })
    setHighlighted(Math.max(0, options.findIndex((o) => o.value === value)))
    setOpen(true)
  }, [disabled, options, value])

  const closeMenu = useCallback(() => { setOpen(false); setHighlighted(-1) }, [])

  const pick = useCallback((val: string) => {
    onChange(val)
    closeMenu()
    triggerRef.current?.focus()
  }, [onChange, closeMenu])

  // Close on outside click or scroll
  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => {
      if (!triggerRef.current?.contains(e.target as Node) && !listRef.current?.contains(e.target as Node)) closeMenu()
    }
    document.addEventListener('mousedown', down)
    document.addEventListener('scroll', closeMenu, true)
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('scroll', closeMenu, true) }
  }, [open, closeMenu])

  // Scroll highlighted item into view
  useEffect(() => {
    if (!open || highlighted < 0) return
    ;(listRef.current?.children[highlighted] as HTMLElement | undefined)?.scrollIntoView({ block: 'nearest' })
  }, [open, highlighted])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); openMenu() }
      return
    }
    const enabled = options.map((o, i) => ({ ...o, i })).filter((o) => !o.disabled)
    switch (e.key) {
      case 'ArrowDown': { e.preventDefault(); const n = enabled.find((o) => o.i > highlighted); if (n) setHighlighted(n.i); break }
      case 'ArrowUp':   { e.preventDefault(); const p = [...enabled].reverse().find((o) => o.i < highlighted); if (p) setHighlighted(p.i); break }
      case 'Enter':
      case ' ':         { e.preventDefault(); const o = options[highlighted]; if (o && !o.disabled) pick(o.value); break }
      case 'Escape':    { e.preventDefault(); closeMenu(); break }
      case 'Tab':       { closeMenu(); break }
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? id : undefined}
        disabled={disabled}
        onMouseDown={(e) => { e.preventDefault(); open ? closeMenu() : openMenu() }}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex h-9 w-full items-center gap-2 rounded-xl border border-input bg-background px-3 text-sm font-medium',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'hover:bg-muted/50 transition-colors cursor-pointer',
          'disabled:cursor-not-allowed disabled:opacity-50',
          open && 'ring-2 ring-ring',
          className,
        )}
      >
        {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
        <span className={cn('flex-1 truncate text-left', !selectedLabel && 'text-muted-foreground')}>
          {selectedLabel ?? placeholder}
        </span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-150', open && 'rotate-180')} />
      </button>

      {open && createPortal(
        <ul
          ref={listRef}
          id={id}
          role="listbox"
          style={{ position: 'absolute', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
          className="max-h-60 overflow-y-auto rounded-xl border border-border bg-popover shadow-lg py-1 focus:outline-none"
        >
          {options.map((opt, i) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              aria-disabled={opt.disabled}
              onMouseDown={(e) => { e.preventDefault(); if (!opt.disabled) pick(opt.value) }}
              onMouseEnter={() => { if (!opt.disabled) setHighlighted(i) }}
              className={cn(
                'flex items-center justify-between gap-2 px-3 py-2 text-sm cursor-pointer select-none',
                opt.value === value ? 'font-medium text-primary' : 'text-foreground',
                opt.disabled ? 'opacity-40 cursor-not-allowed' : highlighted === i ? 'bg-muted' : 'hover:bg-muted',
              )}
            >
              <span>{opt.label}</span>
              {opt.value === value && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
            </li>
          ))}
        </ul>,
        document.body,
      )}
    </>
  )
}

/** @deprecated Use Select with `options` array prop instead */
export function SelectOption({
  value,
  children,
  disabled,
}: {
  value: string
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <option value={value} disabled={disabled}>
      {children}
    </option>
  )
}
