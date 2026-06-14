'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

const TabsCtx = createContext<{
  value: string
  onValueChange: (v: string) => void
}>({ value: '', onValueChange: () => {} })

export function Tabs({
  value,
  onValueChange,
  children,
  className,
}: {
  value?: string
  onValueChange?: (v: string) => void
  children: ReactNode
  className?: string
}) {
  const [internal, setInternal] = useState(value ?? '')
  const current = value ?? internal
  const setCurrent = onValueChange ?? setInternal

  return (
    <TabsCtx.Provider value={{ value: current, onValueChange: setCurrent }}>
      <div className={className}>{children}</div>
    </TabsCtx.Provider>
  )
}

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('inline-flex h-auto flex-wrap gap-1.5 bg-transparent p-0', className)}>
      {children}
    </div>
  )
}

export function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string
  children: ReactNode
  className?: string
}) {
  const { value: current, onValueChange } = useContext(TabsCtx)
  const isActive = current === value
  return (
    <button
      type="button"
      onClick={() => onValueChange(value)}
      className={cn(
        'rounded-xl border border-border text-sm px-4 py-2 transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground border-primary'
          : 'hover:bg-muted',
        className,
      )}
    >
      {children}
    </button>
  )
}
