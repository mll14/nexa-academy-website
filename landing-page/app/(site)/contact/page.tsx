import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo'
import { Mail, Phone, MapPin, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Separator } from '@/components/ui/Separator'
import { ContactForm } from '@/components/contact/ContactForm'
import { ContactSidebar } from '@/components/contact/ContactSidebar'
import { sanityFetch } from '@/lib/sanity/client'
import { siteSettingsQuery } from '@/lib/sanity/queries'
import type { SiteSettings } from '@/types'

export async function generateMetadata(): Promise<Metadata> {
  const s = await sanityFetch<SiteSettings>({ query: siteSettingsQuery, tags: ['siteSettings'] })
  return buildMetadata(
    null,
    { title: 'Contact Us', description: 'Get in touch with the Nexa Academy team. We respond within 24 hours.' },
    s?.siteName,
    s?.defaultSeo?.ogImage,
  )
}

const FALLBACK_MAP = 'https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d3988.8160025351544!2d36.818476275755984!3d-1.2843189356256064!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zMcKwMTcnMDIuNiJTIDM2wrA0OScxNS41IkU!5e0!3m2!1sen!2ske!4v1777660539958!5m2!1sen!2ske'
const FALLBACK_MAPS_URL = 'https://maps.app.goo.gl/ythn37VzoNNi3jRA7'

export default async function ContactPage() {
  const s = await sanityFetch<SiteSettings>({ query: siteSettingsQuery, tags: ['siteSettings'] })

  const email    = s?.contactEmail ?? 'info@nexaacademy.co.ke'
  const phone    = s?.contactPhone ?? '+254 713 067 311'
  const address  = s?.address      ?? '10th Floor, JKUAT Towers, CBD — Opp. Jamia Mosque'
  const locationUrl = s?.locationUrl ?? FALLBACK_MAPS_URL
  const mapUrl   = s?.mapEmbedUrl  ?? FALLBACK_MAP

  const contactLinks = [
    { label: 'Email Us',  value: email,   href: `mailto:${email}`,    Icon: Mail,   external: false },
    { label: 'Call Us',   value: phone,   href: `tel:${phone.replace(/\s/g,'')}`, Icon: Phone, external: false },
    { label: 'Location',  value: address, href: locationUrl,           Icon: MapPin, external: true  },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 space-y-12 sm:space-y-16">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <h1 className="font-semibold tracking-tight">
          Get in <span className="text-primary">Touch</span>
        </h1>
        <div className="w-16 h-0.5 bg-primary mx-auto" />
        <p className="text-muted-foreground">
          Have a question about our programs? We&apos;re here to help — fill out the form or reach us directly.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {contactLinks.map(({ label, value, href, Icon, external }) => (
          <a key={label} href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}
            className="flex items-center gap-3 rounded-2xl border border-border bg-background p-4 hover:border-primary transition-colors">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{label}</p>
              <p className="text-sm font-semibold mt-0.5">{value}</p>
            </div>
          </a>
        ))}
      </div>

      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 lg:sticky lg:top-24">
          <ContactSidebar responseTimes={s?.responseTimes} whyReach={s?.whyReach} />
        </div>
        <div className="lg:col-span-7">
          <ContactForm />
        </div>
      </div>

      <Separator />

      <div className="space-y-5">
        <div className="space-y-1">
          <Badge variant="outline" className="border-primary text-primary text-xs">Visit Our Office</Badge>
          <h2 className="text-2xl sm:text-3xl font-semibold">{address}</h2>
          <p className="text-sm text-muted-foreground">We welcome visitors during office hours.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a href={locationUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-white hover:bg-primary/90 px-5 py-2.5 text-sm font-medium transition-colors">
            Open in Maps <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a href={locationUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-primary text-primary hover:bg-primary hover:text-white px-5 py-2.5 text-sm font-medium transition-colors">
            View on Google Maps <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
        <div className="rounded-2xl overflow-hidden border border-border">
          <iframe title="Nexa Academy Office Location" src={mapUrl}
            width="100%" height="380" style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        </div>
      </div>
    </div>
  )
}
