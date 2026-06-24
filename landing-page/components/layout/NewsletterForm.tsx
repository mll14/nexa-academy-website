'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3'
import { RecaptchaProvider } from '@/components/application/RecaptchaProvider'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.nexaacademy.co.ke'

function NewsletterFormContent() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const { executeRecaptcha } = useGoogleReCaptcha()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.includes('@')) {
      setStatus({ type: 'error', message: 'Please enter a valid email address.' })
      return
    }
    setLoading(true)
    setStatus(null)
    try {
      let recaptchaToken: string | undefined
      if (executeRecaptcha) {
        try {
          recaptchaToken = await executeRecaptcha('newsletter_subscribe')
        } catch {
          // non-fatal
        }
      }
      const res = await fetch(`${API_BASE}/api/newsletter/subscribe/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, recaptchaToken }),
      })
      const data = await res.json()
      if (res.ok && data.success !== false) {
        setStatus({ type: 'success', message: data.message ?? 'Subscribed successfully.' })
        setEmail('')
        setTimeout(() => setStatus(null), 5000)
      } else {
        setStatus({ type: 'error', message: data.error ?? data.message ?? 'Subscription failed.' })
      }
    } catch {
      setStatus({ type: 'error', message: 'Something went wrong. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-white">Subscribe to Newsletter</p>
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email"
          required
          disabled={loading}
          className="w-full rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 px-4 py-2.5 pr-12 outline-none focus:border-primary transition-colors disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-md bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-60"
          aria-label="Subscribe"
        >
          <Send className="w-3.5 h-3.5 text-white" />
        </button>
      </form>
      {status ? (
        <p className={`text-xs ${status.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
          {status.message}
        </p>
      ) : (
        <p className="text-xs text-white/40">Get updates on new programs and tech news</p>
      )}
    </div>
  )
}

export function NewsletterForm() {
  return (
    <RecaptchaProvider>
      <NewsletterFormContent />
    </RecaptchaProvider>
  )
}
