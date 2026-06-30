'use client'

import { useEffect } from 'react'
import { CalendarClock, CheckCircle2, ExternalLink, Mail } from 'lucide-react'
import { FaWhatsapp, FaTelegramPlane, FaDiscord, FaLinkedinIn } from 'react-icons/fa'
import { Card, CardContent } from '@/components/ui/Card'
import { Separator } from '@/components/ui/Separator'
import { AppointmentBookingForm } from '@/app/(site)/appointments/AppointmentBookingForm'

interface SuccessData {
  id?: string
  full_name?: string
  email?: string
  phone?: string
  program_name?: string
  start_date?: string
  estimated_fees?: number
}

const COMMUNITY = [
  { Icon: FaWhatsapp,      label: 'WhatsApp', sub: 'Student Group', href: 'https://chat.whatsapp.com/your-group-link', color: 'text-green-600 bg-green-100' },
  { Icon: FaTelegramPlane, label: 'Telegram',  sub: 'Updates',       href: 'https://t.me/nexaacademy',                  color: 'text-sky-600 bg-sky-100'   },
  { Icon: FaDiscord,       label: 'Discord',   sub: 'Community',     href: 'https://discord.gg/nexaacademy',            color: 'text-indigo-600 bg-indigo-100' },
  { Icon: FaLinkedinIn,    label: 'LinkedIn',  sub: 'Network',       href: 'https://linkedin.com/company/nexaacademy', color: 'text-blue-600 bg-blue-100'  },
]

export function SuccessScreen({
  data,
  onHome,
  onContact,
}: {
  data: SuccessData | null
  onHome: () => void
  onContact: () => void
}) {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }, [])

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-8 text-center">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-primary" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold">Application Submitted!</h1>
          <p className="text-muted-foreground">
            We&apos;ve received your application and will review it within 24–48 hours.
          </p>
        </div>
      </div>

      {data && (
        <Card className="max-w-2xl mx-auto border border-border rounded-2xl text-left">
          <CardContent className="p-5 sm:p-7 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" /> Application Summary
            </h3>
            <Separator />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Application ID</p>
                <p className="font-mono font-bold text-primary">{data.id || 'Pending'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Program</p>
                <p className="font-semibold">{data.program_name}</p>
              </div>
              {data.estimated_fees != null && (
                <div>
                  <p className="text-muted-foreground text-xs">Estimated Fees</p>
                  <p className="font-bold text-lg text-primary">KSh {data.estimated_fees.toLocaleString()}</p>
                </div>
              )}
              {data.start_date && (
                <div>
                  <p className="text-muted-foreground text-xs">Start Date</p>
                  <p>{new Date(data.start_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Portal access card ── */}
      {data?.email && (
        <Card className="max-w-2xl mx-auto border border-border rounded-2xl text-left">
          <CardContent className="p-5 sm:p-7 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-primary" /> Access Your Application Portal
            </h3>
            <Separator />

            <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <Mail className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm space-y-1">
                <p className="font-semibold">Check your inbox</p>
                <p className="text-muted-foreground">
                  We sent a link to <strong className="text-foreground">{data.email}</strong> to
                  set up your account password.
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Once your password is set, sign in at{' '}
              <a
                href="https://admissions.nexaacademy.co.ke/login"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-medium hover:underline"
              >
                admissions.nexaacademy.co.ke/login
              </a>{' '}
              to track your application. You can also sign in with Google using the same email.
            </p>
          </CardContent>
        </Card>
      )}

      {data?.email && (
        <Card className="max-w-2xl mx-auto border border-primary/25 rounded-2xl text-left bg-primary/5">
          <CardContent className="p-5 sm:p-7 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-primary" /> Book Your Admissions Appointment
            </h3>
            <Separator />
            <p className="text-sm text-muted-foreground">
              This is a necessary step if you want to fast-track your application. Choose a physical or virtual appointment with the Admissions Manager so we can review your goals, answer questions, and move your application forward faster.
            </p>
          </CardContent>
        </Card>
      )}

      {data?.email && (
        <div className="text-left">
          <AppointmentBookingForm
            section={{
              _key: 'post-application-appointment',
              _type: 'appointmentFormSection',
              badge: 'Fast-track step',
              headline: 'Choose Your Appointment',
              subheadline: 'Book a time with the Admissions Manager to discuss your application.',
              sidebarItems: [
                {
                  _key: 'review',
                  title: 'Review your application',
                  description: 'Confirm your goals, program fit, fees, and next steps.',
                },
                {
                  _key: 'format',
                  title: 'Physical or virtual',
                  description: 'Choose the appointment format that works for you.',
                },
              ],
              nextSteps: [
                'Pick a physical or virtual appointment',
                'Receive your confirmation email',
                'Speak with the Admissions Manager',
              ],
              officeAddress: '10th Floor, JKUAT Towers, CBD Nairobi',
            }}
            initialValues={{
              name: data.full_name ?? '',
              email: data.email,
              phone: data.phone ?? '',
              reason: data.program_name
                ? `I just applied for ${data.program_name} and would like to discuss my application.`
                : 'I just submitted my application and would like to discuss the next steps.',
            }}
            lockedHost="admissions_manager"
            lockContactDetails
            successActions="none"
          />
        </div>
      )}

      <div className="space-y-3">
        <p className="text-sm font-medium">Join our community</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {COMMUNITY.map(({ Icon, label, sub, href, color }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border hover:border-primary transition-colors"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold">{label}</p>
              <p className="text-[10px] text-muted-foreground">{sub}</p>
            </a>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onHome}
          className="flex-1 h-11 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors"
        >
          Return to Homepage
        </button>
        <button
          onClick={onContact}
          className="flex-1 h-11 rounded-lg border border-primary text-primary font-semibold hover:bg-primary hover:text-white transition-colors"
        >
          Contact Support
        </button>
      </div>
    </div>
  )
}
