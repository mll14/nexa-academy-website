import { AlertCircle } from 'lucide-react'
import { Label } from '@/components/ui/Label'

interface FieldProps {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}

export function Field({ label, required, error, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}
    </div>
  )
}
