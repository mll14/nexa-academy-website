import { useMutation } from '@tanstack/react-query'
import { FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from './ui/button'
import * as api from '../lib/api'

interface SendReceiptButtonProps {
  paymentId: string
  label?: string
  sendingLabel?: string
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  size?: 'default' | 'sm' | 'lg'
  className?: string
}

/**
 * Emails the PDF receipt (payment receipt + balance statement) for a completed
 * payment. Admins send to the student and admissions; students re-send only to
 * themselves. Callers should render this only for payments with status
 * `completed` — the server rejects the rest.
 */
export function SendReceiptButton({
  paymentId,
  label = 'Email receipt',
  sendingLabel = 'Sending…',
  variant = 'outline',
  size = 'sm',
  className,
}: SendReceiptButtonProps) {
  const sendMutation = useMutation({
    mutationFn: () => api.sendPaymentReceipt(paymentId),
    onSuccess: (res) => toast.success(res.detail ?? 'Receipt emailed'),
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled={sendMutation.isPending}
      onClick={() => sendMutation.mutate()}
    >
      {sendMutation.isPending
        ? sendingLabel
        : <><FileText className="w-3.5 h-3.5 mr-1.5" /> {label}</>}
    </Button>
  )
}
