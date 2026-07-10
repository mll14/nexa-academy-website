import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Banknote } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../ui/button'
import { Dialog } from '../ui/dialog'
import { Input } from '../ui/input'
import { Select } from '../ui/select'
import { PaymentInstructions } from '../PaymentInstructions'
import * as api from '../../lib/api'

const PAYMENT_METHODS = [
  { value: 'Bank Transfer', label: 'Bank Transfer' },
  { value: 'KCB', label: 'KCB Bank Transfer' },
  { value: 'Cash', label: 'Cash' },
  { value: 'M-Pesa', label: 'M-Pesa' },
]

interface RecordManualPaymentDialogProps {
  open: boolean
  onClose: () => void
  /** Name shown in the dialog copy. */
  studentName: string
  /** Identify the payer by account when known… */
  studentUid?: string
  /** …or by application, letting the server resolve the account by FK or email. */
  applicationId?: string
  programId?: string | null
  onRecorded?: () => void
}

/**
 * Admin entry point for payments made outside the LMS (KCB transfer, cash, M-Pesa).
 * Posts a completed payment and emails the student a PDF receipt.
 */
export function RecordManualPaymentDialog({
  open,
  onClose,
  studentName,
  studentUid,
  applicationId,
  programId,
  onRecorded,
}: RecordManualPaymentDialogProps) {
  const todayIso = new Date().toISOString().slice(0, 10)

  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('Bank Transfer')
  const [date, setDate] = useState(todayIso)
  const [reference, setReference] = useState('')
  const [message, setMessage] = useState('')

  const reset = () => {
    setAmount('')
    setMethod('Bank Transfer')
    setDate(todayIso)
    setReference('')
    setMessage('')
  }

  const close = () => {
    onClose()
    reset()
  }

  const recordMutation = useMutation({
    mutationFn: () =>
      api.recordManualPayment({
        studentUid,
        applicationId,
        amount: Number(amount),
        paymentMethod: method,
        paymentDate: date,
        reference,
        providerMessage: message,
        programId,
      }),
    onSuccess: () => {
      close()
      onRecorded?.()
      toast.success('Manual payment recorded — receipt emailed to student')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const invalid = !amount || Number(amount) <= 0 || !date

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Record Manual Payment"
      description={`Record a payment ${studentName} made outside the LMS (KCB transfer, cash, etc.). This posts a completed payment and emails a PDF receipt.`}
      className="max-w-sm"
    >
      <div className="space-y-4 pt-1">
        <PaymentInstructions showOnline={false} />
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Amount (KSh) *</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 10000"
              min="1"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Method *</label>
            <Select value={method} onChange={setMethod} options={PAYMENT_METHODS} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Payment date *</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayIso} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Reference</label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. KCB txn ref"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Provider message</label>
          <textarea
            className="w-full min-h-20 rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Paste the bank/service confirmation message (optional)"
          />
        </div>
        <div className="flex gap-3 pt-1">
          <Button
            className="flex-1"
            disabled={recordMutation.isPending || invalid}
            onClick={() => recordMutation.mutate()}
          >
            {recordMutation.isPending
              ? 'Recording…'
              : <><Banknote className="w-4 h-4 mr-1.5" /> Record Payment</>}
          </Button>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
