import { forwardRef } from 'react'
import ReactPhoneInput, { type Country } from 'react-phone-number-input'
import flags from 'react-phone-number-input/flags'
import 'react-phone-number-input/style.css'
import { cn } from '../../lib/utils'

// Inner <input> that matches our Input component's visual style
// (no border/bg — those live on the outer container)
const InnerInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>((props, ref) => (
  <input
    {...props}
    ref={ref}
    className={cn(
      'flex-1 min-w-0 bg-transparent text-sm',
      'placeholder:text-muted-foreground',
      'focus-visible:outline-none',
      'disabled:cursor-not-allowed',
      props.className,
    )}
  />
))
InnerInput.displayName = 'PhoneInnerInput'

export interface PhoneNumberInputProps {
  value: string
  onChange: (value: string) => void
  defaultCountry?: Country
  placeholder?: string
  disabled?: boolean
  id?: string
  className?: string
}

export function PhoneNumberInput({
  value,
  onChange,
  defaultCountry = 'KE',
  placeholder = 'Phone number',
  disabled,
  id,
  className,
}: PhoneNumberInputProps) {
  return (
    <ReactPhoneInput
      flags={flags}
      international
      defaultCountry={defaultCountry}
      value={value || undefined}
      onChange={(val) => onChange(val ?? '')}
      inputComponent={InnerInput}
      numberInputProps={{ id, placeholder }}
      disabled={disabled}
      className={cn(
        'flex h-10 w-full items-center rounded-xl border border-input bg-background px-3 text-sm',
        'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    />
  )
}
