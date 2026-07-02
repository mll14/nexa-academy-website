import Link from 'next/link'

export function GoogleAuthNotice() {
  return (
    <section className="py-12 md:py-16 bg-muted/40 border-y border-border">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
          What Nexa Academy Does
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Nexa Academy is the admissions and student portal for our Nairobi-based coding
          bootcamp. Applicants use it to apply to a program, book admissions interviews, track
          their application status, and pay program fees — all from one account.
        </p>

        <h3 className="text-base font-semibold text-foreground pt-2">
          How We Use Your Google Account
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          You can sign in to the Nexa Academy admissions portal with your Google account. We only
          request your basic Google profile — name, email address, and profile photo — to create
          and secure your account. We never access your Google Calendar, Drive, Gmail, or any
          other Google service on your behalf.
        </p>

        <p className="text-sm text-muted-foreground">
          Read our{' '}
          <Link href="/legal" className="text-primary font-medium underline underline-offset-2">
            Privacy Policy
          </Link>{' '}
          and{' '}
          <Link href="/legal" className="text-primary font-medium underline underline-offset-2">
            Terms of Service
          </Link>{' '}
          for full details.
        </p>
      </div>
    </section>
  )
}
