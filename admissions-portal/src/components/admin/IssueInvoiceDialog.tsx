import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../ui/button'
import { Dialog } from '../ui/dialog'
import { Input } from '../ui/input'
import * as api from '../../lib/api'

interface IssueInvoiceDialogProps {
  open: boolean
  onClose: () => void
  studentName: string
  /** Prefills the recipient field; the admin can override it. */
  studentEmail?: string
  /** Identify the student by account when known… */
  studentUid?: string
  /** …or by application, letting the server resolve the account by FK or email. */
  applicationId?: string
  programId?: string | null
  /** Shown as a hint so the admin knows how much is still owed. */
  outstandingBalance?: number
  onIssued?: () => void
}

const fmtKSh = (n: number) => `KSh ${n.toLocaleString('en-KE')}`

/**
 * Invoices a student for an instalment under their payment plan. Records a pending
 * payment and emails them a PDF invoice requesting the amount.
 */
export function IssueInvoiceDialog({
  open,
  onClose,
  studentName,
  studentEmail,
  studentUid,
  applicationId,
  programId,
  outstandingBalance,
  onIssued,
}: IssueInvoiceDialogProps) {
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [description, setDescription] = useState('')
  const [email, setEmail] = useState(studentEmail ?? '')

  const todayIso = new Date().toISOString().slice(0, 10)

  const reset = () => {
    setAmount('')
    setDueDate('')
    setDescription('')
    setEmail(studentEmail ?? '')
  }

  const close = () => {
    onClose()
    reset()
  }

  const issueMutation = useMutation({
    mutationFn: () =>
      api.issueInvoice({
        studentUid,
        applicationId,
        amount: Number(amount),
        dueDate,
        description,
        email,
        programId,
      }),
    onSuccess: (res) => {
      close()
      onIssued?.()
      toast.success(`Invoice emailed to ${res.emailed_to}`)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const amountNum = Number(amount)
  const exceedsBalance =
    outstandingBalance != null && outstandingBalance > 0 && amountNum > outstandingBalance
  const invalid = !amount || amountNum <= 0 || !email.trim()

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Request Payment"
      description={`Invoice ${studentName} for an instalment. This emails them a PDF invoice and records the amount as pending until it is paid.`}
      className="max-w-sm"
    >
      <div className="space-y-4 pt-1">
        {outstandingBalance != null && outstandingBalance > 0 && (
          <div className="rounded-xl bg-warning/5 border border-warning/20 px-3.5 py-2.5">
            <p className="text-[11px] font-semibold text-warning">Outstanding balance</p>
            <p className="text-base font-bold text-warning mt-0.5">{fmtKSh(outstandingBalance)}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Amount (KSh) *</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 36000"
              min="1"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Due date</label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} min={todayIso} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Send to *</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@example.com"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">What is this for?</label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Instalment 2 of 3"
          />
        </div>

        {exceedsBalance && (
          <div className="rounded-xl bg-destructive/5 border border-destructive/20 px-3.5 py-2.5 text-xs text-destructive">
            This invoice is larger than the {fmtKSh(outstandingBalance!)} still owed.
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Button
            className="flex-1"
            disabled={issueMutation.isPending || invalid}
            onClick={() => issueMutation.mutate()}
          >
            {issueMutation.isPending
              ? 'Sending…'
              : <><FileText className="w-4 h-4 mr-1.5" /> Send Invoice</>}
          </Button>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
