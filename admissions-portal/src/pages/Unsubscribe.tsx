import { Link, useSearch } from '@tanstack/react-router'
import { AlertTriangle, ArrowLeft, CheckCircle2, Home, MailX } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'

type UnsubscribeStatus = 'success' | 'error'

function resultCopy(status: UnsubscribeStatus, reason?: string) {
  if (status === 'success') {
    if (reason === 'already_unsubscribed') {
      return {
        icon: CheckCircle2,
        tone: 'success',
        eyebrow: 'Already Unsubscribed',
        title: 'You are already off the newsletter list',
        body: 'This email address had already been removed from Nexa Academy newsletter sends.',
      }
    }
    return {
      icon: CheckCircle2,
      tone: 'success',
      eyebrow: 'Unsubscribed',
      title: 'You have been removed from the newsletter',
      body: 'You will no longer receive Nexa Academy newsletter campaigns at this email address.',
    }
  }

  const messages: Record<string, string> = {
    missing_token: 'The unsubscribe link is missing its verification token.',
    expired: 'This unsubscribe link has expired. Use the latest newsletter email link or contact support.',
    invalid: 'This unsubscribe link is invalid or has been changed.',
    not_found: 'We could not find an active newsletter subscription for this link.',
  }
  return {
    icon: AlertTriangle,
    tone: 'error',
    eyebrow: 'Could Not Unsubscribe',
    title: 'We could not complete the request',
    body: messages[reason ?? ''] ?? 'The unsubscribe link could not be verified.',
  }
}

export function Unsubscribe() {
  const search = useSearch({ from: '/unsubscribe' })
  const status: UnsubscribeStatus = search.status === 'error' ? 'error' : 'success'
  const copy = resultCopy(status, search.reason)
  const Icon = copy.icon
  const isSuccess = copy.tone === 'success'

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center space-y-2">
          <img
            src="/nexa-academy-small-logo.png"
            alt="Nexa Academy"
            className="w-12 h-12 object-contain mx-auto"
          />
          <p className="text-sm font-semibold text-muted-foreground">Nexa Academy Newsletter</p>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className={`px-6 py-8 text-center border-b ${
              isSuccess ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20'
            }`}>
              <div className={`w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
                isSuccess ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
              }`}>
                <Icon className="w-7 h-7" />
              </div>
              <p className={`text-xs font-bold uppercase tracking-wide ${isSuccess ? 'text-success' : 'text-destructive'}`}>
                {copy.eyebrow}
              </p>
              <h1 className="font-heading text-2xl font-bold mt-2">{copy.title}</h1>
              <p className="text-sm text-muted-foreground leading-relaxed mt-3 max-w-md mx-auto">
                {copy.body}
              </p>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 flex items-start gap-3">
                <MailX className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This change is based on the secure unsubscribe link included in your newsletter email.
                  You can subscribe again later from the Nexa Academy website.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Link to="/login" className="flex-1">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="w-4 h-4" /> Admissions Portal
                  </Button>
                </Link>
                <a href="https://nexaacademy.co.ke" className="flex-1">
                  <Button className="w-full">
                    <Home className="w-4 h-4" /> Visit Website
                  </Button>
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
