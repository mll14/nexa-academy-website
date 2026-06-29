import { useState, useEffect } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Calendar, Video, Check, X, Clock,
  Mail, Phone, BookOpen, CreditCard, CalendarDays,
  MessageSquare, Activity, User, AlertTriangle, Send,
  Banknote, BadgeCheck, CircleDashed, CircleX, RefreshCw, ChevronRight, UserPlus, Pencil,
} from 'lucide-react'
import type { Payment } from '../../types/index'
import { AdminLayout } from '../../components/AdminLayout'
import { ApplicationEditForm } from '../../components/ApplicationEditForm'
import { Card, CardContent } from '../../components/ui/card'
import { Select } from '../../components/ui/select'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Separator } from '../../components/ui/separator'
import { Dialog } from '../../components/ui/dialog'
import { SlotPicker } from '../../components/SlotPicker'
import { AdminNotesPanel } from '../../components/admin/AdminNotesPanel'
import { EmailEditor } from '../../components/admin/EmailEditor'
import * as api from '../../lib/api'
import { statusText, statusBadgeClass, formatDate, formatFullDateTime } from '../../lib/utils'
import toast from 'react-hot-toast'
import type { AvailableSlot, Intake } from '../../types/index'

const NEXT_STATUSES: Record<string, string[]> = {
  pending: ['reviewed', 'not_reached', 'achieved', 'approved', 'rejected'],
  reviewed: ['not_reached', 'achieved', 'approved', 'rejected'],
  not_reached: ['pending', 'reviewed', 'achieved', 'approved', 'rejected'],
  approved: ['not_reached', 'achieved', 'interview_scheduled', 'rejected'],
  interview_scheduled: ['not_reached', 'achieved', 'interview_completed', 'approved'],
  interview_completed: ['not_reached', 'achieved', 'enrolled', 'rejected'],
  achieved: ['pending', 'reviewed', 'not_reached', 'rejected'],
  enrolled: [],
  rejected: ['pending'],
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/20',
  reviewed: 'bg-secondary/10 text-secondary-foreground border-secondary/20',
  not_reached: 'bg-warning/10 text-warning border-warning/20',
  approved: 'bg-success/10 text-success border-success/20',
  interview_scheduled: 'bg-primary/10 text-primary border-primary/20',
  interview_completed: 'bg-primary/10 text-primary border-primary/20',
  achieved: 'bg-muted text-muted-foreground border-border',
  enrolled: 'bg-success/10 text-success border-success/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
}

const STATUS_SEQUENCE = [
  'pending',
  'reviewed',
  'approved',
  'interview_scheduled',
  'interview_completed',
  'achieved',
  'enrolled',
]

function InfoRow({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3">
      {icon && <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>}
      <div className="flex-1 flex justify-between items-start gap-4">
        <span className="text-sm text-muted-foreground shrink-0">{label}</span>
        <span className="text-sm font-medium text-right">{value ?? '—'}</span>
      </div>
    </div>
  )
}

function SectionCard({ title, icon, children, className }: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={className}>
      <CardContent className="p-0">
        <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
          <span className="text-primary">{icon}</span>
          <h2 className="font-heading font-semibold text-sm">{title}</h2>
        </div>
        <Separator />
        <div className="px-5 pb-5">{children}</div>
      </CardContent>
    </Card>
  )
}

const PAYMENT_STATUS_STYLE: Record<string, string> = {
  completed:  'bg-success/10 text-success border-success/20',
  pending:    'bg-warning/10 text-warning border-warning/20',
  processing: 'bg-blue-50 text-blue-600 border-blue-200',
  failed:     'bg-destructive/10 text-destructive border-destructive/20',
  refunded:   'bg-muted text-muted-foreground border-border',
}

const DEPOSIT_THRESHOLD = 10_000

function PaymentsTab({
  payments,
  estimatedFees,
  appStatus,
  onMarkEnrolled,
  enrolling,
  onRequestPaymentLink,
}: {
  payments: Payment[]
  estimatedFees: number | null
  appStatus: string
  onMarkEnrolled: () => void
  enrolling: boolean
  onRequestPaymentLink: () => void
}) {
  const paid  = payments.filter((p) => p.status === 'completed').reduce((sum, p) => sum + Number(p.amount), 0)
  const total = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const fullTarget = estimatedFees ?? 0
  const depositMet = paid >= DEPOSIT_THRESHOLD
  const fullyPaid  = fullTarget > 0 && paid >= fullTarget
  const alreadyEnrolled = appStatus === 'enrolled'

  const depositPct = Math.min(100, fullTarget > 0
    ? (Math.min(paid, DEPOSIT_THRESHOLD) / DEPOSIT_THRESHOLD) * 100
    : (paid / DEPOSIT_THRESHOLD) * 100)
  const fullPct = fullTarget > 0 ? Math.min(100, (paid / fullTarget) * 100) : 0

  const statusIcon = (s: string) => {
    if (s === 'completed') return <BadgeCheck className="w-3.5 h-3.5 text-success" />
    if (s === 'failed')    return <CircleX className="w-3.5 h-3.5 text-destructive" />
    if (s === 'refunded')  return <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
    return <CircleDashed className="w-3.5 h-3.5 text-warning" />
  }

  return (
    <div className="space-y-4">

      {/* Progress card */}
      <div className="rounded-2xl border border-border bg-card px-5 py-4 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm font-semibold font-heading">Payment Progress</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" className="text-xs h-7 px-3" onClick={onRequestPaymentLink}>
              <CreditCard className="w-3 h-3 mr-1.5" /> Take Payment
            </Button>
            {alreadyEnrolled ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-success/10 text-success border border-success/20">
                <BadgeCheck className="w-3.5 h-3.5" /> Enrolled
              </span>
            ) : depositMet ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                <BadgeCheck className="w-3.5 h-3.5" /> Deposit met
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-warning/10 text-warning border border-warning/20">
                <CircleDashed className="w-3.5 h-3.5" /> Deposit pending
              </span>
            )}
          </div>
        </div>

        {/* Deposit bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Deposit (KSh {DEPOSIT_THRESHOLD.toLocaleString('en-KE')})</span>
            <span className={`font-semibold ${depositMet ? 'text-success' : 'text-foreground'}`}>
              KSh {Math.min(paid, DEPOSIT_THRESHOLD).toLocaleString('en-KE')} / {DEPOSIT_THRESHOLD.toLocaleString('en-KE')}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${depositMet ? 'bg-success' : 'bg-primary'}`}
              style={{ width: `${depositPct}%` }}
            />
          </div>
        </div>

        {/* Full fees bar (only if estimatedFees is set) */}
        {fullTarget > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Full fees (KSh {fullTarget.toLocaleString('en-KE')})</span>
              <span className={`font-semibold ${fullyPaid ? 'text-success' : 'text-foreground'}`}>
                KSh {paid.toLocaleString('en-KE')} / {fullTarget.toLocaleString('en-KE')}
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${fullyPaid ? 'bg-success' : 'bg-primary/60'}`}
                style={{ width: `${fullPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Mark enrolled button */}
        {!alreadyEnrolled && depositMet && (
          <Button
            className="w-full"
            onClick={onMarkEnrolled}
            disabled={enrolling}
          >
            {enrolling
              ? 'Updating…'
              : <><BadgeCheck className="w-4 h-4 mr-1.5" /> Mark Student as Enrolled</>}
          </Button>
        )}
        {!alreadyEnrolled && !depositMet && (
          <p className="text-xs text-muted-foreground text-center">
            KSh {(DEPOSIT_THRESHOLD - paid).toLocaleString('en-KE')} more needed to unlock enrollment.
          </p>
        )}
      </div>

      {/* Summary strip */}
      {payments.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total charged',  value: `KSh ${total.toLocaleString('en-KE')}` },
            { label: 'Confirmed paid', value: `KSh ${paid.toLocaleString('en-KE')}`, highlight: true },
            { label: 'Transactions',   value: String(payments.length) },
          ].map(({ label, value, highlight }) => (
            <div key={label} className={`rounded-xl border px-4 py-3 ${highlight ? 'bg-success/5 border-success/20' : 'bg-muted/30 border-border'}`}>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
              <p className={`text-lg font-bold mt-0.5 ${highlight ? 'text-success' : 'text-foreground'}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Payment rows */}
      {payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <CreditCard className="w-10 h-10 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">No payments recorded yet</p>
          <p className="text-xs text-muted-foreground/70">Payments appear here once the student initiates one.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="divide-y divide-border">
            {payments.map((p) => (
              <div key={p.id} className="flex items-start justify-between gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    {statusIcon(p.status)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">KSh {Number(p.amount).toLocaleString('en-KE')}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {p.payment_type?.replace(/_/g, ' ') ?? 'Payment'}
                      {p.payment_reference && <span className="ml-1 opacity-60">· {p.payment_reference}</span>}
                    </p>
                    {p.description && <p className="text-xs text-muted-foreground/60 truncate mt-0.5">{p.description}</p>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${PAYMENT_STATUS_STYLE[p.status] ?? ''}`}>
                    {statusIcon(p.status)} {p.status}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{formatDate(p.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function ApplicationDetail() {
  const { id } = useParams({ from: '/admin/applications/$id' })
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [newStatus, setNewStatus] = useState('')
  const [showSlotPicker, setShowSlotPicker] = useState(false)
  const [slotsData, setSlotsData] = useState<AvailableSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [showNotifyDialog, setShowNotifyDialog] = useState(false)
  const [selectedIntakeId, setSelectedIntakeId] = useState('')
  const [leftTab, setLeftTab] = useState<'details' | 'payments' | 'notes' | 'email'>('details')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [showPayLinkDialog, setShowPayLinkDialog] = useState(false)
  const [payLinkAmount, setPayLinkAmount] = useState('')
  const [payLinkDescription, setPayLinkDescription] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)

  const { data: app, isLoading, error } = useQuery({
    queryKey: ['admin', 'application', id],
    queryFn: () => api.getApplicationById(id),
  })

  const { data: payments = [] } = useQuery<Payment[]>({
    queryKey: ['payments', 'application', app?.email],
    queryFn: async () => {
      const res = await api.getPayments({ search: app!.email })
      return Array.isArray(res) ? res : (res as { results?: Payment[] }).results ?? []
    },
    enabled: !!app?.email,
  })

  const { data: programIntakes = [] } = useQuery<Intake[]>({
    queryKey: ['intakes', app?.program],
    queryFn: () => api.getIntakes({ program_slug: app?.program, ordering: 'start_date' }),
    enabled: showNotifyDialog && !!app?.program,
    select: (data) => {
      const list = Array.isArray(data) ? data : (data as { results?: Intake[] }).results ?? []
      return list.filter((i) => i.status === 'open' && new Date(i.start_date) >= new Date())
    },
  })

  const notifyMutation = useMutation({
    mutationFn: () => api.notifyIntake(id, { intake_id: selectedIntakeId || undefined }),
    onSuccess: (result) => {
      if (result.application) {
        qc.setQueryData(['admin', 'application', id], result.application)
      }
      qc.invalidateQueries({ queryKey: ['admin', 'application', id] })
      qc.invalidateQueries({ queryKey: ['admin', 'applications'] })
      setShowNotifyDialog(false)
      setSelectedIntakeId('')
      toast.success(`Intake assigned and email sent to ${app?.email}`)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateMutation = useMutation({
    mutationFn: (status: string) => api.updateApplicationStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'application', id] })
      qc.invalidateQueries({ queryKey: ['admin', 'applications'] })
      setNewStatus('')
      toast.success('Status updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const confirmMutation = useMutation({
    mutationFn: (time: string) => api.confirmInterview(id, time),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'application', id] })
      setShowSlotPicker(false)
      toast.success('Interview scheduled!')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const cancelMutation = useMutation({
    mutationFn: () => api.cancelInterview(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'application', id] })
      toast.success('Interview cancelled')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const sendEmailMutation = useMutation({
    mutationFn: () => api.sendFollowUp({
      to: app!.email,
      name: app!.full_name,
      subject: emailSubject,
      message: emailBody,
    }),
    onSuccess: () => {
      toast.success(`Email sent to ${app?.email}`)
      setEmailSubject('')
      setEmailBody('')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const [extraGuests, setExtraGuests] = useState<string[]>([])
  const [newGuestEmail, setNewGuestEmail] = useState('')
  const [savingGuests, setSavingGuests] = useState(false)

  const [payLinkLoading, setPayLinkLoading] = useState(false)

  const handleAdminPayment = async () => {
    if (!app || !payLinkAmount) return
    setPayLinkLoading(true)
    try {
      const res = await api.adminSendPaymentLink({
        studentUid: app.user_id ?? (app.user as string) ?? '',
        amount: Number(payLinkAmount),
        description: payLinkDescription,
        programId: app.program,
      })

      const { default: PaystackPop } = await import('@paystack/inline-js')
      const popup = new PaystackPop()
      try {
        popup.newTransaction({
          key: res.public_key,
          email: res.student_email,
          amount: Number(payLinkAmount) * 100,
          currency: 'KES',
          ref: res.reference,
          access_code: res.access_code,
          onSuccess: async (tx: { reference: string }) => {
            toast.loading('Verifying payment…')
            try {
              await api.verifyPayment(tx.reference)
              toast.dismiss()
              toast.success('Payment successful — recorded to student account')
              qc.invalidateQueries({ queryKey: ['payments', 'application', app.email] })
              setShowPayLinkDialog(false)
              setPayLinkAmount('')
              setPayLinkDescription('')
              setLeftTab('payments')
            } catch {
              toast.dismiss()
              toast.error('Payment was made but verification failed — refresh or check Transactions')
            }
          },
          onCancel: () => toast('Payment cancelled'),
        })
      } catch {
        // Paystack popup blocked (e.g. mobile) — open hosted page in new tab
        if (res.authorization_url) {
          window.open(res.authorization_url, '_blank')
          toast('Opened Paystack checkout in a new tab')
        } else {
          toast.error('Could not open Paystack checkout')
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not initialise payment')
    } finally {
      setPayLinkLoading(false)
    }
  }

  const loadSlots = async () => {
    setSlotsLoading(true)
    try {
      const res = await api.getAvailableSlots(id)
      setSlotsData(res.slots)
      setShowSlotPicker(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load slots')
    } finally {
      setSlotsLoading(false)
    }
  }

  const handleConfirmSlot = (time: string) => {
    confirmMutation.mutate(time, {
      onSuccess: () => setShowSlotPicker(false),
    })
  }

  // Sync extra guests local state when slot data changes identity
  const slotId = app?.interview_slot?.id
  useEffect(() => {
    setExtraGuests(app?.interview_slot?.extra_guests ?? [])
    setNewGuestEmail('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotId])

  const guestsChanged = JSON.stringify(extraGuests) !== JSON.stringify(app?.interview_slot?.extra_guests ?? [])

  const handleSaveGuests = async () => {
    setSavingGuests(true)
    try {
      await api.updateInterviewDetails(id, { extra_guests: extraGuests })
      qc.invalidateQueries({ queryKey: ['admin', 'application', id] })
      toast.success('Attendees updated — notification sent to applicant.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update attendees.')
    } finally {
      setSavingGuests(false)
    }
  }

  const addGuest = () => {
    const email = newGuestEmail.trim()
    if (!email || extraGuests.includes(email)) return
    setExtraGuests((prev) => [...prev, email])
    setNewGuestEmail('')
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-64">
          <span className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </AdminLayout>
    )
  }

  if (error || !app) {
    return (
      <AdminLayout>
        <div className="max-w-xl mx-auto text-center py-20">
          <p className="text-destructive font-medium">Application not found.</p>
          <Button variant="ghost" className="mt-4" onClick={() => navigate({ to: '/admin/applications', search: { tab: undefined } })}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Applications
          </Button>
        </div>
      </AdminLayout>
    )
  }

  const slot = app.interview_slot
  const nextStatuses = NEXT_STATUSES[app.status] ?? []
  const currentStepIndex = STATUS_SEQUENCE.indexOf(app.status)
  const isStartDatePast = !!app.start_date && new Date(app.start_date) < new Date()

  return (
    <AdminLayout>
      <div className="space-y-6">

        {/* Page header */}
        <div className="flex flex-col gap-4">
          <button
            onClick={() => navigate({ to: '/admin/applications', search: { tab: undefined } })}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Applications
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-lg font-bold text-primary">
                  {(app.full_name || '?').charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="font-heading text-xl font-bold">{app.full_name}</h1>
                <p className="text-sm text-muted-foreground">{app.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-sm font-semibold border ${STATUS_COLORS[app.status] ?? 'bg-muted text-foreground border-border'}`}>
                {statusText(app.status)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEditModal(true)}
                className="gap-1.5"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit Details
              </Button>
            </div>
          </div>

          {/* Progress stepper (non-rejected) */}
          {app.status !== 'rejected' && app.status !== 'not_reached' && (
            <div className="bg-muted/40 border border-border rounded-2xl px-6 py-5 overflow-x-auto">
              <div className="flex items-center gap-0 min-w-max mx-auto w-full justify-between">
                {STATUS_SEQUENCE.map((s, i) => {
                  const done = i < currentStepIndex
                  const active = i === currentStepIndex
                  return (
                    <div key={s} className="flex items-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all shadow-sm ${
                          done
                            ? 'bg-primary border-primary text-primary-foreground'
                            : active
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-background border-border text-muted-foreground'
                        }`}>
                          {done ? <Check className="w-4 h-4" /> : i + 1}
                        </div>
                        <span className={`text-xs font-medium leading-tight text-center max-w-20 ${active ? 'text-primary' : done ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {statusText(s)}
                        </span>
                      </div>
                      {i < STATUS_SEQUENCE.length - 1 && (
                        <div className={`h-0.5 w-12 sm:w-20 mx-2 mb-6 rounded-full transition-colors ${i < currentStepIndex ? 'bg-primary' : 'bg-border'}`} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {app.status === 'rejected' && (
            <div className="px-5 py-3.5 bg-destructive/5 border border-destructive/20 rounded-2xl text-sm text-destructive font-semibold">
              Application rejected
            </div>
          )}
          {app.status === 'not_reached' && (
            <div className="px-5 py-3.5 bg-warning/8 border border-warning/25 rounded-2xl text-sm text-warning font-semibold">
              Followed up but not responding
            </div>
          )}
        </div>

        {/* No-intake warning banner */}
        {!app.start_date && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 bg-amber-50 border border-amber-200 rounded-2xl">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800">Inquiry of Interest — No intake selected</p>
              <p className="text-xs text-amber-700 mt-0.5">
                This applicant applied without choosing a start date. Assign an open intake for{' '}
                <span className="font-medium">{app.program_name}</span>.
              </p>
            </div>
            <button
              onClick={() => setShowNotifyDialog(true)}
              className="flex items-center gap-2 shrink-0 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
            >
              <Send className="w-3.5 h-3.5" /> Assign Intake & Send Email
            </button>
          </div>
        )}

        {/* Two-column layout */}
        <div className="grid lg:grid-cols-3 gap-5">

          {/* Left column (wider) */}
          <div className="lg:col-span-2 space-y-5">

            {/* Tab switcher */}
            <div className="flex border-b border-border">
              {([
                { id: 'details', label: 'Details', icon: User },
                { id: 'payments', label: `Payments${payments.length ? ` (${payments.length})` : ''}`, icon: CreditCard },
                { id: 'notes', label: 'Notes', icon: MessageSquare },
                { id: 'email', label: 'Email', icon: Mail },
              ] as { id: 'details' | 'payments' | 'notes' | 'email'; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setLeftTab(id)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                    leftTab === id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" />{label}
                </button>
              ))}
            </div>

            {leftTab === 'payments' && (
              <PaymentsTab
                payments={payments}
                estimatedFees={app.estimated_fees != null ? Number(app.estimated_fees) : null}
                appStatus={app.status}
                onMarkEnrolled={() => updateMutation.mutate('enrolled')}
                enrolling={updateMutation.isPending}
                onRequestPaymentLink={() => setShowPayLinkDialog(true)}
              />
            )}

            {leftTab === 'notes' && (
              <AdminNotesPanel
                source={{ kind: 'application', applicationId: app.id }}
                stage={app.status}
                title="Internal Notes"
                emptyText="No internal notes for this application yet."
              />
            )}

            {leftTab === 'email' && (
              <div className="space-y-4">
                {/* Recipient strip */}
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3">
                  <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">To</p>
                    <p className="text-sm font-medium truncate">{app.full_name} &lt;{app.email}&gt;</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">via admissions@nexaacademy.co.ke</span>
                </div>

                {/* Subject */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Subject *</label>
                  <Input
                    placeholder="e.g. Next steps for your application"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                  />
                </div>

                {/* Rich email editor */}
                <div style={{ minHeight: 420 }}>
                  <EmailEditor
                    value={emailBody}
                    onChange={setEmailBody}
                    previewSubject={emailSubject}
                    previewText=""
                  />
                </div>

                {/* Send bar */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <p className="text-xs text-muted-foreground">
                    This email is sent directly to the applicant and is not logged as a newsletter campaign.
                  </p>
                  <Button
                    className="shrink-0 gap-1.5"
                    disabled={!emailSubject.trim() || !emailBody.trim() || sendEmailMutation.isPending}
                    onClick={() => sendEmailMutation.mutate()}
                  >
                    {sendEmailMutation.isPending
                      ? <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      : <Send className="w-4 h-4" />}
                    {sendEmailMutation.isPending ? 'Sending…' : 'Send Email'}
                  </Button>
                </div>
              </div>
            )}

            {leftTab === 'details' && <>

            {/* Applicant info */}
            <SectionCard title="Applicant Details" icon={<User className="w-4 h-4" />}>
              <div className="divide-y divide-border">
                <InfoRow label="Email" value={app.email} icon={<Mail className="w-4 h-4" />} />
                <InfoRow label="Phone" value={app.phone} icon={<Phone className="w-4 h-4" />} />
                <InfoRow label="Program" value={app.program_name} icon={<BookOpen className="w-4 h-4" />} />
                <InfoRow label="Start Date" value={formatDate(app.start_date)} icon={<CalendarDays className="w-4 h-4" />} />
                {isStartDatePast && (
                  <div className="flex items-start gap-3 py-3">
                    <div className="flex-1 flex items-start gap-2.5 bg-warning/8 border border-warning/25 rounded-xl px-3.5 py-3">
                      <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-warning">Intake date has passed</p>
                        <p className="text-xs text-muted-foreground mt-0.5">This student applied for a cohort that has already started. You can notify them of the next available intake.</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 text-xs h-7 px-2.5 border-warning/40 text-warning hover:bg-warning/10"
                        onClick={() => setShowNotifyDialog(true)}
                      >
                        <Send className="w-3 h-3 mr-1" /> Notify
                      </Button>
                    </div>
                  </div>
                )}
                <InfoRow
                  label="Payment Plan"
                  value={app.payment_plan
                    ? app.payment_plan.replace('installment', 'Installment ').replace('full', 'Full Payment')
                    : undefined}
                  icon={<CreditCard className="w-4 h-4" />}
                />
                <InfoRow
                  label="Estimated Fees"
                  value={app.estimated_fees != null ? `KSh ${Number(app.estimated_fees).toLocaleString('en-KE')}` : undefined}
                  icon={<CreditCard className="w-4 h-4" />}
                />
                <InfoRow label="Applied on" value={formatDate(app.applied_at)} icon={<CalendarDays className="w-4 h-4" />} />
              </div>
            </SectionCard>

            {/* Background */}
            {app.knowledge_description && (
              <SectionCard title="Technical Background" icon={<BookOpen className="w-4 h-4" />}>
                <div className="pt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${app.has_basic_knowledge ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground border-border'}`}>
                      {app.has_basic_knowledge ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      {app.has_basic_knowledge ? 'Has basic knowledge' : 'No prior knowledge'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{app.knowledge_description}</p>
                </div>
              </SectionCard>
            )}

            {/* Applicant's message */}
            {app.message && (
              <SectionCard title="Applicant's Message" icon={<MessageSquare className="w-4 h-4" />}>
                <p className="pt-4 text-sm text-muted-foreground leading-relaxed italic">"{app.message}"</p>
              </SectionCard>
            )}

            {/* Activity log — merged status changes + payment events */}
            {(() => {
              type LogEntry =
                | { kind: 'status'; id: string; date: string; status: string; notes?: string; changed_by?: string }
                | { kind: 'payment'; id: string; date: string; amount: string; paymentType?: string; status: string; ref?: string }

              const entries: LogEntry[] = [
                ...(app.logs ?? []).map((l) => ({
                  kind: 'status' as const,
                  id: `s-${l.id}`,
                  date: l.created_at,
                  status: l.status,
                  notes: l.notes,
                  changed_by: l.changed_by,
                })),
                ...payments.map((p) => ({
                  kind: 'payment' as const,
                  id: `p-${p.id}`,
                  date: p.created_at,
                  amount: p.amount,
                  paymentType: p.payment_type,
                  status: p.status,
                  ref: p.payment_reference,
                })),
              ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

              if (entries.length === 0) return null

              return (
                <SectionCard title={`Activity Log · ${entries.length} event${entries.length !== 1 ? 's' : ''}`} icon={<Activity className="w-4 h-4" />}>
                  <div className="pt-4">
                    {entries.map((entry, i) => {
                      const isFirst = i === 0
                      const isLast = i === entries.length - 1
                      return (
                        <div key={entry.id} className="flex gap-4">
                          <div className="flex flex-col items-center shrink-0">
                            <div className={`w-3 h-3 rounded-full mt-1 border-2 ${
                              entry.kind === 'payment'
                                ? entry.status === 'completed' ? 'bg-success border-success' : 'bg-warning border-warning'
                                : isFirst ? 'bg-primary border-primary' : 'bg-background border-border'
                            }`} />
                            {!isLast && <div className="w-0.5 flex-1 bg-border/60 my-1" />}
                          </div>

                          <div className={`flex-1 ${isLast ? 'pb-2' : 'pb-5'}`}>
                            {entry.kind === 'status' ? (
                              <div className={`rounded-xl border px-4 py-3 ${isFirst && entries[0].kind === 'status' ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-border'}`}>
                                <div className="flex items-start justify-between gap-3 flex-wrap">
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusBadgeClass(entry.status)}`}>
                                    {statusText(entry.status)}
                                  </span>
                                  <span className="text-xs text-muted-foreground shrink-0">{formatDate(entry.date)}</span>
                                </div>
                                {(entry.notes || entry.changed_by) && (
                                  <div className="mt-2 space-y-0.5">
                                    {entry.notes && <p className="text-xs text-muted-foreground leading-relaxed">{entry.notes}</p>}
                                    {entry.changed_by && <p className="text-xs text-muted-foreground/60">by {entry.changed_by}</p>}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className={`rounded-xl border px-4 py-3 ${entry.status === 'completed' ? 'bg-success/5 border-success/20' : 'bg-warning/5 border-warning/20'}`}>
                                <div className="flex items-start justify-between gap-3 flex-wrap">
                                  <div className="flex items-center gap-2">
                                    <Banknote className="w-3.5 h-3.5 text-success shrink-0" />
                                    <span className="text-xs font-semibold text-foreground">
                                      KSh {Number(entry.amount).toLocaleString('en-KE')}
                                      {entry.paymentType && <span className="font-normal text-muted-foreground ml-1">· {entry.paymentType.replace(/_/g, ' ')}</span>}
                                    </span>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${PAYMENT_STATUS_STYLE[entry.status] ?? 'bg-muted text-muted-foreground border-border'}`}>
                                      {entry.status}
                                    </span>
                                  </div>
                                  <span className="text-xs text-muted-foreground shrink-0">{formatDate(entry.date)}</span>
                                </div>
                                {entry.ref && <p className="text-xs text-muted-foreground/60 mt-1">Ref: {entry.ref}</p>}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </SectionCard>
              )
            })()}
            </>}
          </div>

          {/* Right column */}
          <div className="space-y-5">

            {/* Status management */}
            <SectionCard title="Update Status" icon={<Activity className="w-4 h-4" />}>
              <div className="pt-4 space-y-3">
                {nextStatuses.length > 0 ? (
                  <>
                    <Select
                      value={newStatus}
                      onChange={setNewStatus}
                      placeholder="Move to…"
                      options={nextStatuses.map((s) => ({ value: s, label: statusText(s) }))}
                    />
                    <Button
                      className="w-full"
                      disabled={!newStatus || updateMutation.isPending}
                      onClick={() => newStatus && updateMutation.mutate(newStatus)}
                    >
                      {updateMutation.isPending ? 'Saving…' : 'Apply Status'}
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No further transitions available.</p>
                )}

                {/* Quick approve / reject */}
                {['pending', 'reviewed'].includes(app.status) && (
                  <div className="pt-1 space-y-2">
                    <Separator />
                    <p className="text-xs text-muted-foreground pt-1">Quick actions</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
                        onClick={() => updateMutation.mutate('approved')}
                        disabled={updateMutation.isPending}
                      >
                        <Check className="w-3.5 h-3.5 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() => updateMutation.mutate('rejected')}
                        disabled={updateMutation.isPending}
                      >
                        <X className="w-3.5 h-3.5 mr-1" /> Reject
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>

            {/* Interview scheduling */}
            {app.status === 'approved' && (
              <SectionCard title="Schedule Interview" icon={<Calendar className="w-4 h-4" />}>
                <div className="pt-4">
                  <Button
                    onClick={loadSlots}
                    disabled={slotsLoading}
                    variant="outline"
                    className="w-full"
                  >
                    {slotsLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        Loading slots…
                      </span>
                    ) : (
                      <><Calendar className="w-4 h-4 mr-2" />Pick a slot</>
                    )}
                  </Button>
                </div>
              </SectionCard>
            )}

            {/* Existing interview slot */}
            {slot && app.status === 'interview_scheduled' && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-0">
                  <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
                    <Calendar className="w-4 h-4 text-primary" />
                    <h2 className="font-heading font-semibold text-sm">Scheduled Interview</h2>
                  </div>
                  <Separator className="bg-primary/10" />
                  <div className="px-5 pb-5 pt-4 space-y-3">
                    <p className="text-sm font-semibold">{formatFullDateTime(slot.chosen_time)}</p>
                    <p className="text-xs text-muted-foreground">East Africa Time (EAT)</p>
                    {(slot.meet_url || slot.zoom_link) && (
                      <a
                        href={slot.meet_url ?? slot.zoom_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline font-medium"
                      >
                        <Video className="w-4 h-4" />
                        {slot.meet_url ? 'Open Google Meet' : 'Open Meeting Link'}
                      </a>
                    )}

                    {/* Extra attendees */}
                    <div className="space-y-2 pt-1 border-t border-primary/10">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">Extra Attendees</p>
                      {extraGuests.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {extraGuests.map((g) => (
                            <span key={g} className="flex items-center gap-1 text-xs bg-muted rounded-full px-2.5 py-1">
                              {g}
                              <button
                                onClick={() => setExtraGuests((prev) => prev.filter((e) => e !== g))}
                                className="hover:text-destructive transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-1.5">
                        <Input
                          type="email"
                          placeholder="Add email…"
                          value={newGuestEmail}
                          onChange={(e) => setNewGuestEmail(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGuest() } }}
                          className="text-xs h-8"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2.5 shrink-0"
                          disabled={!newGuestEmail.trim() || extraGuests.includes(newGuestEmail.trim())}
                          onClick={addGuest}
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      {guestsChanged && (
                        <Button size="sm" className="w-full" disabled={savingGuests} onClick={handleSaveGuests}>
                          {savingGuests ? 'Saving…' : 'Save Attendees'}
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-2 pt-1">
                      <Button
                        size="sm"
                        className="bg-success hover:bg-success/90 text-success-foreground"
                        onClick={() => updateMutation.mutate('interview_completed')}
                        disabled={updateMutation.isPending}
                      >
                        <Check className="w-3.5 h-3.5 mr-1" /> Mark Complete
                      </Button>
                      <Button size="sm" variant="outline" onClick={loadSlots} disabled={slotsLoading}>
                        <Clock className="w-3.5 h-3.5 mr-1" /> Reschedule
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => cancelMutation.mutate()}
                        disabled={cancelMutation.isPending}
                      >
                        Cancel Interview
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <button
              type="button"
              onClick={() => setLeftTab('notes')}
              className="w-full rounded-2xl border border-border bg-card p-5 text-left transition-colors hover:bg-muted/30"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MessageSquare className="w-4 h-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-heading text-sm font-semibold">Internal Notes</span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                    Open the Notes tab to add rich-text admin notes. Current stage: {statusText(app.status)}.
                  </span>
                </span>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Send payment link dialog */}
      <Dialog
        open={showPayLinkDialog}
        onClose={() => { setShowPayLinkDialog(false); setPayLinkAmount(''); setPayLinkDescription('') }}
        title="Process Payment"
        description={`Opens Paystack checkout for ${app.full_name}. Payment will be recorded to their account.`}
        className="max-w-sm"
      >
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Amount (KSh) *</label>
            <Input
              type="number"
              value={payLinkAmount}
              onChange={(e) => setPayLinkAmount(e.target.value)}
              placeholder="e.g. 10000"
              min="100"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <Input
              value={payLinkDescription}
              onChange={(e) => setPayLinkDescription(e.target.value)}
              placeholder="e.g. Program deposit"
            />
          </div>
          {payLinkAmount && (
            <div className="rounded-xl bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
              Paystack will charge <span className="font-medium text-foreground">KSh {Number(payLinkAmount).toLocaleString('en-KE')}</span> using <span className="font-medium text-foreground">{app.email}</span>. Payment records to {app.full_name}'s account.
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <Button
              className="flex-1"
              disabled={payLinkLoading || !payLinkAmount || Number(payLinkAmount) < 100}
              onClick={handleAdminPayment}
            >
              {payLinkLoading
                ? 'Opening Paystack…'
                : <><CreditCard className="w-4 h-4 mr-1.5" /> Process Payment</>}
            </Button>
            <Button variant="outline" onClick={() => { setShowPayLinkDialog(false); setPayLinkAmount(''); setPayLinkDescription('') }}>
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Notify next intake dialog */}
      <Dialog
        open={showNotifyDialog}
        onClose={() => { setShowNotifyDialog(false); setSelectedIntakeId('') }}
        title="Assign Intake and Notify"
        description={`Assign an intake to ${app.full_name} and email the cohort details.`}
        className="max-w-md"
      >
        <div className="space-y-4 pt-1">
          {programIntakes.length > 0 ? (
            <>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Select an upcoming intake</p>
                <div className="space-y-2">
                  {programIntakes.map((intake) => (
                    <button
                      key={intake.id}
                      onClick={() => setSelectedIntakeId(intake.id)}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                        selectedIntakeId === intake.id
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold">{formatDate(intake.start_date)}</p>
                        {intake.application_deadline && (
                          <p className="text-xs text-muted-foreground mt-0.5">Deadline: {formatDate(intake.application_deadline)}</p>
                        )}
                      </div>
                      {selectedIntakeId === intake.id && <Check className="w-4 h-4 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-muted/50 rounded-xl px-4 py-3 text-xs text-muted-foreground">
                The selected cohort date will be saved on this application, then emailed to <span className="font-medium text-foreground">{app.email}</span>.
              </div>
              <div className="flex gap-3 pt-1">
                <Button
                  className="flex-1"
                  disabled={!selectedIntakeId || notifyMutation.isPending}
                  onClick={() => notifyMutation.mutate()}
                >
                  {notifyMutation.isPending ? 'Sending…' : <><Send className="w-4 h-4 mr-1.5" /> Assign & Send Email</>}
                </Button>
                <Button variant="outline" onClick={() => { setShowNotifyDialog(false); setSelectedIntakeId('') }}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <div className="py-8 text-center space-y-2">
              <CalendarDays className="w-8 h-8 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground">No open upcoming intakes found for <strong>{app.program_name}</strong>.</p>
              <p className="text-xs text-muted-foreground">Add an intake in Programs &amp; Intakes first.</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => { setShowNotifyDialog(false); setSelectedIntakeId('') }}>
                Close
              </Button>
            </div>
          )}
        </div>
      </Dialog>

      {/* Slot picker dialog */}
      <Dialog
        open={showSlotPicker}
        onClose={() => setShowSlotPicker(false)}
        title="Pick an Interview Slot"
        description="All times are in East Africa Time (EAT). Select a date then a time."
        className="max-w-2xl"
      >
        <SlotPicker
          slots={slotsData}
          onConfirm={handleConfirmSlot}
          submitting={confirmMutation.isPending}
          confirmLabel={app?.status === 'interview_scheduled' ? 'Reschedule Interview' : 'Schedule Interview'}
        />
      </Dialog>

      {/* Edit application details modal */}
      <Dialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Application Details"
        description={`Update details for ${app.full_name}'s application.`}
        className="max-w-2xl"
      >
        <div className="pt-1">
          <ApplicationEditForm
            application={app}
            showHeader={false}
            onSaved={(updated) => {
              qc.setQueryData(['admin', 'application', id], updated)
              qc.invalidateQueries({ queryKey: ['admin', 'applications'] })
              setShowEditModal(false)
            }}
          />
        </div>
      </Dialog>

    </AdminLayout>
  )
}
