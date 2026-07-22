'use client'

import { useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  /** Rendered in the header, under the title — used for the countdown strip. */
  headerSlot?: React.ReactNode
  /** Fires on the first pointer/key interaction inside the modal. */
  onInteract?: () => void
  /** Clicking the backdrop closes the modal. Disable for destructive flows. */
  closeOnBackdrop?: boolean
  className?: string
  children: React.ReactNode
}

export function Modal({
  open,
  onClose,
  title,
  description,
  headerSlot,
  onInteract,
  closeOnBackdrop = true,
  className,
  children,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Lock body scroll and close on Escape while open.
  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  // Move focus into the panel so keyboard users land inside the dialog.
  useEffect(() => {
    if (open) panelRef.current?.focus()
  }, [open])

  const handleInteract = useCallback(() => { onInteract?.() }, [onInteract])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm nx-fade-in"
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        onPointerDown={handleInteract}
        onKeyDown={handleInteract}
        className={cn(
          'relative w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[88vh] overflow-y-auto',
          'bg-background border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl outline-none',
          'nx-modal-in',
          className,
        )}
      >
        {(title || headerSlot) && (
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-5 sm:px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                {title && <h2 className="text-lg font-bold tracking-tight truncate">{title}</h2>}
                {description && (
                  <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {headerSlot}
          </div>
        )}

        <div className="px-5 sm:px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
