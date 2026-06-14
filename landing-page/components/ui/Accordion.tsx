'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type AccordionType = 'single' | 'multiple'

const AccordionCtx = createContext<{
  openItems: string[]
  toggle: (value: string) => void
}>({ openItems: [], toggle: () => {} })

const ItemCtx = createContext<{
  isOpen: boolean
  toggle: () => void
}>({ isOpen: false, toggle: () => {} })

export function Accordion({
  type = 'single',
  defaultValue,
  children,
  className,
}: {
  type?: AccordionType
  defaultValue?: string
  children: ReactNode
  className?: string
}) {
  const [openItems, setOpenItems] = useState<string[]>(
    defaultValue ? [defaultValue] : [],
  )

  function toggle(value: string) {
    setOpenItems((prev) =>
      type === 'single'
        ? prev.includes(value) ? [] : [value]
        : prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    )
  }

  return (
    <AccordionCtx.Provider value={{ openItems, toggle }}>
      <div className={cn('space-y-2', className)}>{children}</div>
    </AccordionCtx.Provider>
  )
}

export function AccordionItem({
  value,
  children,
  className,
}: {
  value: string
  children: ReactNode
  className?: string
}) {
  const { openItems, toggle } = useContext(AccordionCtx)
  const isOpen = openItems.includes(value)
  return (
    <ItemCtx.Provider value={{ isOpen, toggle: () => toggle(value) }}>
      <div
        className={cn(
          'border border-border rounded-2xl px-5 sm:px-6 overflow-hidden transition-colors',
          isOpen && 'border-primary/40',
          className,
        )}
      >
        {children}
      </div>
    </ItemCtx.Provider>
  )
}

export function AccordionTrigger({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const { isOpen, toggle } = useContext(ItemCtx)
  return (
    <button
      type="button"
      onClick={toggle}
      aria-expanded={isOpen}
      className={cn(
        'flex w-full items-center gap-3 text-sm sm:text-base font-medium py-4 text-left hover:text-primary transition-colors',
        className,
      )}
    >
      {children}
      <ChevronDown
        className={cn('ml-auto w-4 h-4 shrink-0 text-primary transition-transform duration-200', isOpen && 'rotate-180')}
      />
    </button>
  )
}

export function AccordionContent({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const { isOpen } = useContext(ItemCtx)
  if (!isOpen) return null
  return (
    <div className={cn('text-sm text-muted-foreground pb-5 leading-relaxed pl-7', className)}>
      {children}
    </div>
  )
}
