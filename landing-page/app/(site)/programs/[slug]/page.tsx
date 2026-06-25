export const runtime = 'edge'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { PortableText } from '@portabletext/react'
import { MarkdownRenderer } from '@/components/shared/MarkdownRenderer'
import { urlFor } from '@/lib/sanity/image'
import { getSanityProgram } from '@/lib/sanity/programs'
import { getProgramBySlug } from '@/lib/api/programs'
import {
  ArrowLeft, CheckCircle2, Calendar, AlertCircle,
  Wallet, ChevronRight, Award, Download, Clock,
} from 'lucide-react'
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from '@/components/ui/Accordion'
import { TestimonialsCarousel } from '@/components/sections/TestimonialsCarousel'
import { sanityFetch } from '@/lib/sanity/client'
import { siteSettingsQuery } from '@/lib/sanity/queries'
import { buildMetadata, serializeJsonLd } from '@/lib/seo'
import type { Metadata } from 'next'
import { getIntakesForProgram } from '@/lib/api/intakes'
import type { ApiIntake, SanityProgram, ApiProgram, TestimonialDoc, SiteSettings } from '@/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(s: string, opts: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' }) {
  try { return new Date(s).toLocaleDateString('en-KE', opts) } catch { return '—' }
}

function safeSyllabusUrl(url: string | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
    return url
  } catch { return null }
}

function imageUrl(img: SanityProgram['heroImage']): string | null {
  if (!img?.asset) return null
  try { return urlFor(img).width(1200).height(480).url() } catch { return null }
}

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params
  const [sanity, settings] = await Promise.all([
    getSanityProgram(slug),
    sanityFetch<SiteSettings>({ query: siteSettingsQuery, tags: ['siteSettings'] }),
  ])
  if (!sanity) return {}
  return buildMetadata(
    { ...sanity.seo, ogImage: sanity.seo?.ogImage ?? sanity.heroImage },
    { title: sanity.name, description: sanity.heroSubtitle ?? undefined },
    settings?.siteName,
    settings?.defaultSeo?.ogImage,
    `/programs/${slug}`,
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ProgramDetailPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  const sanityP = getSanityProgram(slug)
  const apiP = getProgramBySlug(slug)
  // Start intakes fetch as soon as the API program resolves — no need to wait for Sanity.
  // If the API program is missing, fall back to a name-based lookup after Sanity resolves.
  const intakesP = apiP.then(api => api ? getIntakesForProgram(api.id) : [])

  const [sanity, api] = await Promise.all([sanityP, apiP])
  if (!sanity) notFound()

  const program: ApiProgram | null = api
  // Await intakes (likely already in-flight); fall back to name lookup only when API program was missing
  const intakes: ApiIntake[] = api
    ? await intakesP
    : await getIntakesForName(sanity.name)
  const nextIntake = intakes.find((i) => i.status === 'open') ?? intakes[0] ?? null

  const price = sanity.price ?? program?.price ?? null
  const originalPrice = sanity.originalPrice ?? program?.original_price ?? null

  const heroImgUrl = imageUrl(sanity.heroImage)
  const syllabusUrl = safeSyllabusUrl(sanity.syllabusUrl)

  const navLinks = [
    { href: '#overview', label: 'Overview' },
    { href: '#curriculum', label: 'Curriculum' },
    { href: '#impact', label: 'Impact' },
    ...(sanity.testimonialsHidden ? [] : [{ href: '#testimonials', label: 'Testimonials' }]),
    { href: '#apply', label: 'Apply' },
  ]

  const showTestimonials = !sanity.testimonialsHidden && (sanity.testimonials?.length ?? 0) > 0

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nexaacademy.co.ke'
  const courseSchema = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: sanity.name,
    description: sanity.heroSubtitle ?? undefined,
    url: `${SITE_URL}/programs/${slug}`,
    provider: {
      '@type': 'EducationalOrganization',
      name: 'Nexa Academy',
      url: SITE_URL,
    },
    ...(price != null && {
      offers: {
        '@type': 'Offer',
        price: String(price),
        priceCurrency: 'KES',
        availability: nextIntake ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder',
      },
    }),
    ...(sanity.durationMonths && {
      timeRequired: `P${sanity.durationMonths}M`,
    }),
  }

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(courseSchema) }}
      />
      {/* Hero */}
      <div className="relative">
        {heroImgUrl ? (
          <div className="relative h-72 sm:h-96 lg:h-[440px] w-full overflow-hidden">
            <Image src={heroImgUrl} alt={sanity.name} fill className="object-cover" priority />
            {/* bottom-heavy gradient so text stays readable against any image */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/10" />
            {/* subtle left vignette for extra contrast */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />
          </div>
        ) : (
          <div className="relative h-72 sm:h-80 lg:h-[360px] overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800">
            {/* decorative grid */}
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
                backgroundSize: '48px 48px',
              }}
            />
            {/* glow accents */}
            <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary/25 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-72 h-48 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
          </div>
        )}

        {/* Content overlay */}
        <div className="absolute inset-0 flex flex-col justify-end">
          <div className="max-w-5xl mx-auto w-full px-4 sm:px-8 pb-10">
            <Link
              href="/programs"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-white/55 hover:text-white/90 mb-5 transition-colors uppercase tracking-widest"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> All Programs
            </Link>

            <div className="flex items-start gap-4">
              {sanity.heroIcon?.asset && (
                <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-2.5 shrink-0 shadow-2xl">
                  <Image
                    src={urlFor(sanity.heroIcon).width(56).height(56).url()}
                    alt="icon"
                    width={56} height={56}
                    className="rounded-xl object-contain"
                  />
                </div>
              )}

              <div className="min-w-0">
                <h1 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight [text-shadow:0_2px_12px_rgba(0,0,0,0.6)]">
                  {sanity.name}
                </h1>
                {sanity.heroSubtitle && (
                  <p className="mt-2 text-white/75 text-sm sm:text-base max-w-2xl leading-relaxed [text-shadow:0_1px_6px_rgba(0,0,0,0.5)]">
                    {sanity.heroSubtitle}
                  </p>
                )}

                {/* Metadata pills */}
                {(sanity.durationMonths || price != null || nextIntake) && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {sanity.durationMonths && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/15 text-white/85 text-xs px-3 py-1.5 font-medium">
                        <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                        {sanity.durationMonths} {sanity.durationMonths === 1 ? 'month' : 'months'}
                      </span>
                    )}
                    {price != null && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/15 text-white/85 text-xs px-3 py-1.5 font-medium">
                        <span className="text-primary">KSh {Number(price).toLocaleString()}</span>
                      </span>
                    )}
                    {nextIntake && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/15 text-white/85 text-xs px-3 py-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                        Next: {fmtDate(nextIntake.start_date, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main layout: jump-nav + content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex gap-8 items-start">

          {/* Left jump nav (sticky) */}
          <aside className="hidden lg:block w-48 shrink-0 sticky top-24 space-y-1">
            {navLinks.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary py-1.5 px-2 rounded-lg hover:bg-primary/5 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                {label}
              </a>
            ))}
            {syllabusUrl && (
              <a
                href={syllabusUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary py-1.5 px-2 rounded-lg hover:bg-primary/5 transition-colors mt-4 border border-primary/30"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                Syllabus
              </a>
            )}
          </aside>

          {/* Scrollable content */}
          <div className="flex-1 min-w-0 space-y-14">

            {/* ── Overview ── */}
            {(sanity.overviewTitle || (sanity.faqItems?.length ?? 0) > 0) && (
              <section id="overview" className="scroll-mt-24">
                {sanity.overviewTitle && (
                  <h2 className="text-xl font-semibold mb-1">{sanity.overviewTitle}</h2>
                )}
                {sanity.overviewSubtitle && (
                  <p className="text-muted-foreground text-sm mb-6">{sanity.overviewSubtitle}</p>
                )}
                {(sanity.faqItems?.length ?? 0) > 0 && (
                  <Accordion type="single" defaultValue="0" className="mt-4">
                    {sanity.faqItems!.map((item, i) => (
                      <AccordionItem key={i} value={String(i)}>
                        <AccordionTrigger>{item.question}</AccordionTrigger>
                        {item.answer && item.answer.length > 0 && (
                          <AccordionContent>
                            <MarkdownRenderer value={item.answer} />
                          </AccordionContent>
                        )}
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </section>
            )}

            {/* ── Salary Ranges ── */}
            {(sanity.salaryRanges?.length ?? 0) > 0 && (
              <section className="scroll-mt-24">
                <h2 className="text-xl font-semibold mb-4">Salary Potential</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Stage</th>
                        <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Kenya</th>
                        <th className="text-left py-2 font-medium text-muted-foreground">Global</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sanity.salaryRanges!.map((r, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-2.5 pr-4 font-medium">{r.stage}</td>
                          <td className="py-2.5 pr-4 text-muted-foreground">{r.kenyaRange}</td>
                          <td className="py-2.5 text-muted-foreground">{r.globalRange}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* ── Differentiators ── */}
            {(sanity.differentiators?.length ?? 0) > 0 && (
              <section className="scroll-mt-24">
                <h2 className="text-xl font-semibold mb-6">{sanity.differentiatorTitle ?? 'Why This Course'}</h2>
                <div className="grid sm:grid-cols-3 gap-5">
                  {sanity.differentiators!.map((d, i) => (
                    <div key={i} className="border border-border rounded-2xl p-5 space-y-2">
                      <span className="text-3xl font-bold text-primary/20">{d.number}</span>
                      <h3 className="font-semibold">{d.title}</h3>
                      {d.body && d.body.length > 0 && (
                        <div className="prose prose-sm max-w-none text-muted-foreground">
                          <PortableText value={d.body} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Curriculum ── */}
            {(sanity.modules?.length ?? 0) > 0 && (
              <section id="curriculum" className="scroll-mt-24">
                <h2 className="text-xl font-semibold mb-1">{sanity.curriculumTitle ?? 'Curriculum'}</h2>
                {sanity.curriculumSubtitle && (
                  <p className="text-muted-foreground text-sm mb-6">{sanity.curriculumSubtitle}</p>
                )}
                <Accordion type="single" className="mt-4">
                  {sanity.modules!.map((m, i) => (
                    <AccordionItem key={i} value={String(i)}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            {m.isBonus
                              ? <Award className="w-3.5 h-3.5 text-primary" />
                              : <span className="text-xs font-bold text-primary">{i + 1}</span>
                            }
                          </div>
                          <span>{m.title}</span>
                          {m.isBonus && (
                            <span className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 ml-1">Bonus</span>
                          )}
                        </div>
                      </AccordionTrigger>
                      {m.description && m.description.length > 0 && (
                        <AccordionContent>
                          <MarkdownRenderer value={m.description} className="pl-10" />
                        </AccordionContent>
                      )}
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            )}

            {/* ── Impact ── */}
            {(sanity.impactMetrics?.length ?? 0) > 0 && (
              <section id="impact" className="scroll-mt-24">
                {sanity.impactLabel && (
                  <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-2">
                    {sanity.impactLabel}
                  </p>
                )}
                <h2 className="text-xl font-semibold mb-1">{sanity.impactTitle ?? 'Our Impact'}</h2>
                {sanity.impactSubtitle && (
                  <p className="text-muted-foreground text-sm mb-8">{sanity.impactSubtitle}</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6">
                  {sanity.impactMetrics!.map((m, i) => (
                    <div key={i} className="text-center space-y-1.5 py-4">
                      <p className="text-5xl font-bold text-primary">{m.value}</p>
                      <p className="font-semibold text-foreground">{m.label}</p>
                      {m.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed max-w-[200px] mx-auto">
                          {m.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Testimonials ── */}
            {showTestimonials && (
              <section id="testimonials" className="scroll-mt-24">
                <div className="text-center space-y-2 mb-8">
                  <h2 className="text-xl font-semibold">{sanity.testimonialsTitle ?? 'Hear from our graduates'}</h2>
                  <div className="w-16 h-0.5 bg-primary mx-auto" />
                  {sanity.testimonialsSubtitle && (
                    <p className="text-muted-foreground text-sm">{sanity.testimonialsSubtitle}</p>
                  )}
                </div>
                <TestimonialsCarousel
                  testimonials={sanity.testimonials as unknown as TestimonialDoc[]}
                />
              </section>
            )}

            {/* ── CTA ── */}
            {(sanity.ctaTitle || sanity.ctaSubtitle || price != null || nextIntake) && (
              <section id="apply" className="scroll-mt-24 rounded-2xl border border-primary/20 overflow-hidden">
                {/* Top: heading + price + intake */}
                <div className="bg-primary/5 p-8 grid lg:grid-cols-2 gap-8">

                  {/* Left: heading + buttons */}
                  <div className="space-y-4">
                    {sanity.ctaTitle && (
                      <h2 className="text-2xl font-bold">{sanity.ctaTitle}</h2>
                    )}
                    {sanity.ctaSubtitle && (
                      <p className="text-muted-foreground">{sanity.ctaSubtitle}</p>
                    )}
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <Link
                        href={`/apply?program=${slug}`}
                        className="inline-flex items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/90 h-11 px-8 text-sm font-medium transition-colors"
                      >
                        {sanity.ctaButtonText ?? 'Apply Now'}
                      </Link>
                      <Link
                        href="/contact"
                        className="inline-flex items-center justify-center rounded-lg border border-primary text-primary hover:bg-primary hover:text-white h-11 px-8 text-sm font-medium transition-colors"
                      >
                        Ask a Question
                      </Link>
                    </div>
                  </div>

                  {/* Right: pricing + intake details */}
                  <div className="space-y-4 lg:border-l lg:border-primary/20 lg:pl-8">
                    {/* Price */}
                    <div className="space-y-0.5">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs font-medium text-muted-foreground">KSh</span>
                        <span className="text-3xl font-bold text-primary">
                          {price != null ? Number(price).toLocaleString() : 'TBA'}
                        </span>
                      </div>
                      {originalPrice != null && (
                        <p className="text-xs text-muted-foreground line-through">
                          KSh {Number(originalPrice).toLocaleString()}
                        </p>
                      )}
                      {sanity.paymentNote && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Wallet className="w-3.5 h-3.5 text-primary shrink-0" />
                          {sanity.paymentNote}
                        </div>
                      )}
                    </div>

                    {/* Duration + intake */}
                    <div className="space-y-2 text-sm">
                      {sanity.durationMonths && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4 text-primary shrink-0" />
                          <span>
                            Duration:{' '}
                            <span className="font-medium text-foreground">
                              {sanity.durationMonths} {sanity.durationMonths === 1 ? 'month' : 'months'}
                            </span>
                          </span>
                        </div>
                      )}
                      {nextIntake ? (
                        <>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="w-4 h-4 text-primary shrink-0" />
                            <span>
                              Next intake:{' '}
                              <span className="font-medium text-foreground">
                                {fmtDate(nextIntake.start_date, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </span>
                          </div>
                          {nextIntake.application_deadline && (
                            <div className="flex items-center gap-2 text-destructive">
                              <AlertCircle className="w-4 h-4 shrink-0" />
                              <span>Deadline: {fmtDate(nextIntake.application_deadline, { month: 'short', day: 'numeric' })}</span>
                            </div>
                          )}
                          {nextIntake.seats_remaining != null && (
                            <p className={`text-xs font-medium ${nextIntake.seats_remaining <= 5 ? 'text-red-600' : 'text-green-600'}`}>
                              {nextIntake.seats_remaining} seats remaining
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">No upcoming intakes listed.</p>
                      )}
                    </div>

                    {syllabusUrl && (
                      <a
                        href={syllabusUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                      >
                        <Download className="w-3.5 h-3.5" /> Download Syllabus
                      </a>
                    )}
                  </div>
                </div>

                {/* Payment plans strip */}
                {(sanity.paymentPlans?.length ?? 0) > 0 && (
                  <div className="border-t border-primary/20 bg-primary/[0.02] px-8 py-5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Payment Plans</p>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {sanity.paymentPlans!.map((plan) => (
                        <div
                          key={plan.title}
                          className="relative rounded-xl border border-border bg-background px-4 py-3 space-y-0.5"
                        >
                          {plan.badge && (
                            <span className="absolute -top-2.5 right-3 inline-block rounded-full bg-primary text-white text-[10px] font-semibold px-2 py-0.5 leading-none">
                              {plan.badge}
                            </span>
                          )}
                          <p className="text-sm font-semibold text-foreground">{plan.title}</p>
                          {plan.description && (
                            <p className="text-xs text-muted-foreground">{plan.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* What's included strip */}
                {(sanity.includedItems?.length ?? 0) > 0 && (
                  <div className="border-t border-primary/20 bg-primary/[0.03] px-8 py-5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">What's included</p>
                    <div className="flex flex-wrap gap-x-8 gap-y-2">
                      {sanity.includedItems!.map((item) => (
                        <div key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
