'use client'

import { useState } from 'react'
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import toast from 'react-hot-toast'
import { Phone, CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Separator } from '@/components/ui/Separator'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Field } from '@/components/application/Field'

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.nexaacademy.co.ke'
const CONTACT_METHODS = ['email', 'phone', 'whatsapp'] as const
type ContactMethod = typeof CONTACT_METHODS[number]

export function ContactForm() {
  const [form, setForm] = useState({
    name: '', email: '', subject: '',
    preferredContact: 'email' as ContactMethod,
    phone: '', message: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | string) => {
    const val = typeof e === 'string' ? e : e.target.value
    setForm((f) => ({ ...f, [field]: val }))
    setErrors((f) => ({ ...f, [field]: '' }))
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'A valid email is required'
    if (!form.subject.trim()) e.subject = 'Subject is required'
    if (!form.message.trim()) e.message = 'Message is required'
    if ((form.preferredContact === 'phone' || form.preferredContact === 'whatsapp') &&
        (!form.phone || !isValidPhoneNumber(form.phone)))
      e.phone = 'A valid phone number is required for phone/WhatsApp contact'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const res = await fetch(`${BASE_URL}/api/messages/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          subject: form.subject,
          preferred_contact: form.preferredContact,
          phone: form.phone,
          message: form.message,
        }),
      })
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      toast.success("Message sent — we'll get back to you soon.")
      setSuccess(true)
      setForm({ name: '', email: '', subject: '', preferredContact: 'email', phone: '', message: '' })
      setTimeout(() => setSuccess(false), 5000)
    } catch {
      toast.error('There was an error sending your message. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border border-border rounded-2xl">
      <CardContent className="p-6 sm:p-8 space-y-6">
        {success ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Message Sent!</h3>
              <p className="text-sm text-muted-foreground mt-1">We'll respond within 24 hours.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <h3 className="font-semibold">Send us a Message</h3>
              <p className="text-sm text-muted-foreground">We'll respond within 24 hours</p>
            </div>

            <Separator />

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="Your Name" required error={errors.name}>
                  <Input placeholder="John Doe" value={form.name} onChange={set('name')} disabled={loading} />
                </Field>
                <Field label="Email Address" required error={errors.email}>
                  <Input type="email" placeholder="john@example.com" value={form.email} onChange={set('email')} disabled={loading} />
                </Field>
              </div>

              <Field label="Subject" required error={errors.subject}>
                <Input placeholder="How can we help you?" value={form.subject} onChange={set('subject')} disabled={loading} />
              </Field>

              <div className="space-y-2">
                <label className="text-sm font-medium">Preferred Contact Method</label>
                <div className="grid grid-cols-3 gap-3">
                  {CONTACT_METHODS.map((method) => (
                    <label
                      key={method}
                      className={`flex items-center gap-2 border rounded-xl px-4 py-3 cursor-pointer transition-colors text-sm font-medium capitalize ${
                        form.preferredContact === method
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="preferredContact"
                        value={method}
                        checked={form.preferredContact === method}
                        onChange={() => { setForm((f) => ({ ...f, preferredContact: method })) }}
                        className="sr-only"
                      />
                      {method}
                    </label>
                  ))}
                </div>
              </div>

              {(form.preferredContact === 'phone' || form.preferredContact === 'whatsapp') && (
                <Field label="Phone Number" required error={errors.phone}>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                    <PhoneInput
                      international
                      defaultCountry="KE"
                      placeholder="Enter phone number"
                      value={form.phone}
                      onChange={(v) => { setForm((f) => ({ ...f, phone: v ?? '' })); setErrors((f) => ({ ...f, phone: '' })) }}
                      className="pl-9 w-full h-11 rounded-md border border-border bg-background text-sm"
                      disabled={loading}
                    />
                  </div>
                </Field>
              )}

              <Field label="Your Message" required error={errors.message}>
                <Textarea
                  rows={6}
                  placeholder="Tell us about your inquiry..."
                  value={form.message}
                  onChange={set('message')}
                  disabled={loading}
                  className="resize-none"
                />
              </Field>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending Message...
                  </>
                ) : 'Send Message'}
              </button>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  )
}
