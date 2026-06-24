import { useState, useEffect } from 'react'
import { AlertTriangle, Copy, Check } from 'lucide-react'
import { Dialog } from './dialog'
import { Button } from './button'
import { Input } from './input'

interface DeleteConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  itemName: string
  consequences: string
  isPending?: boolean
}

export function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  itemName,
  consequences,
  isPending,
}: DeleteConfirmDialogProps) {
  const [typed, setTyped] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) setTyped('')
  }, [open])

  const matches = typed === itemName

  const handleCopy = () => {
    navigator.clipboard.writeText(itemName)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onClose={onClose} title={title} className="max-w-md">
      {/* Warning banner */}
      <div className="flex gap-3 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 mb-5">
        <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
        <p className="text-sm text-destructive leading-relaxed">{consequences}</p>
      </div>

      {/* Name to type */}
      <p className="text-sm text-muted-foreground mb-2">
        Type the following to confirm deletion:
      </p>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 mb-4">
        <span className="flex-1 font-mono text-sm font-semibold select-all">{itemName}</span>
        <button
          onClick={handleCopy}
          className="shrink-0 p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
          title="Copy to clipboard"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      <Input
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder={`Type "${itemName}"`}
        className="mb-5"
        autoFocus
      />

      <div className="flex gap-3">
        <Button
          variant="destructive"
          className="flex-1"
          disabled={!matches || isPending}
          onClick={onConfirm}
        >
          {isPending ? 'Deleting…' : 'Delete'}
        </Button>
        <Button variant="outline" className="flex-1" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </Dialog>
  )
}
