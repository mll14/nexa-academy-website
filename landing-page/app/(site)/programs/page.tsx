export const runtime = 'edge'

import Link from 'next/link'
import Image from 'next/image'
import { Award, ArrowRight, BookOpen, Bell } from 'lucide-react'
import { getPrograms } from '@/lib/api/programs'
import { getIntakesForName } from '@/lib/api/intakes'
import { getAllSanityPrograms } from '@/lib/sanity/programs'
import { sanityFetch } from '@/lib/sanity/client'
import { pageBySlugQuery } from '@/lib/sanity/queries'
import { urlFor } from '@/lib/sanity/image'
import { SectionRenderer } from '@/components/sections/SectionRenderer'
import { Separator } from '@/components/ui/Separator'
import { FinanceCalculator } from '@/components/programs/FinanceCalculator'
import type { SanityProgram, ApiProgram, Page } from '@/types'

function fmtDate(dateStr: string, opts: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' }) {
  try { return new Date(dateStr).toLocaleDateString('en-KE', opts) } catch { return '—' }
}

function SeatsTag({ seats }: { seats: number }) {
  if (seats <= 5)
    return <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-600">Only {seats} spots left</span>
  if (seats <= 15)
    return <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-orange-100 text-orange-600">{seats} spots left</span>
  return <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">{seats} spots available</span>
}

async function ProgramCard({ sanity, api }: { sanity: SanityProgram; api: ApiProgram | undefined }) {
  const isComingSoon = api?.coming_soon ?? false
  const intakes = isComingSoon ? [] : await getIntakesForName(sanity.name)
  const next = intakes.find((i) => i.status === 'open') ?? intakes[0] ?? null

  const price = sanity.price ?? api?.price ?? null
  const nextIntakeLabel = next ? fmtDate(next.start_date) : 'TBA'
  const deadlineLabel = next?.application_deadline
    ? fmtDate(next.application_deadline, { month: 'short', day: 'numeric' })
    : null
  const seats = next?.seats_remaining ?? null
  const heroImgUrl = sanity.heroImage?.asset
    ? (() => { try { return urlFor(sanity.heroImage!).width(600).height(320).url() } catch { return null } })()
    : null

  return (
    <div className="group border border-border rounded-2xl hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col bg-background overflow-hidden">

      {/* Thumbnail */}
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-primary/15 via-emerald-50 to-teal-50 flex-shrink-0">
        {heroImgUrl ? (
          <Image
            src={heroImgUrl}
            alt={sanity.name}
            fill
            className={`object-cover group-hover:scale-105 transition-transform duration-500 ${isComingSoon ? 'opacity-60 grayscale' : ''}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl font-bold text-primary/10 select-none">
              {(sanity.name ?? '?').charAt(0)}
            </span>
          </div>
        )}
        {heroImgUrl && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        )}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
          <span className="bg-primary text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
            <Award className="h-3 w-3" /> Certificate
          </span>
          {isComingSoon
            ? <span className="ml-auto bg-amber-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">Coming Soon</span>
            : seats != null && <div className="ml-auto"><SeatsTag seats={seats} /></div>
          }
        </div>
        {sanity.heroIcon?.asset && (
          <div className="absolute bottom-3 left-4 h-11 w-11 rounded-xl bg-white shadow-lg flex items-center justify-center overflow-hidden border border-white/60">
            <Image
              src={urlFor(sanity.heroIcon).width(44).height(44).url()}
              alt=""
              width={28} height={28}
              className="object-contain"
            />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-5 sm:p-6 flex flex-col flex-1 gap-4">
        <div className="space-y-1.5">
          <h4 className="font-bold leading-snug group-hover:text-primary transition-colors">
            {sanity.name}
          </h4>
          {sanity.heroSubtitle && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
              {sanity.heroSubtitle}
            </p>
          )}
        </div>

        {price != null && (
          <div className="flex items-baseline gap-1">
            <span className="text-xs text-muted-foreground">KSh</span>
            <span className="font-semibold text-primary">{Number(price).toLocaleString()}</span>
            {(sanity.originalPrice ?? api?.original_price) && (
              <span className="text-xs text-muted-foreground line-through ml-1">
                {Number(sanity.originalPrice ?? api?.original_price).toLocaleString()}
              </span>
            )}
          </div>
        )}

        {isComingSoon ? (
          <div className="flex items-center gap-2 text-xs border-t border-border pt-3 text-amber-600">
            <Bell className="h-3.5 w-3.5 shrink-0" />
            <span>Not yet open for applications — register your interest below</span>
          </div>
        ) : (
          <div className="flex gap-4 text-xs border-t border-border pt-3">
            <div>
              <p className="text-muted-foreground">Starts</p>
              <p className="font-semibold text-foreground mt-0.5">{nextIntakeLabel}</p>
            </div>
            {deadlineLabel && (
              <div>
                <p className="text-muted-foreground">Apply by</p>
                <p className="font-semibold text-foreground mt-0.5">{deadlineLabel}</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-auto flex gap-2 pt-1">
          {isComingSoon ? (
            <Link
              href={`/apply?program=${sanity.slug}`}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 h-9 px-4 text-sm font-semibold transition-colors flex-1"
            >
              <Bell className="h-3.5 w-3.5" /> Register Interest
            </Link>
          ) : (
            <Link
              href={`/apply?program=${sanity.slug}`}
              className="inline-flex items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/90 h-9 px-4 text-sm font-semibold transition-colors flex-1"
            >
              Apply Now
            </Link>
          )}
          <Link
            href={`/programs/${sanity.slug}`}
            className="inline-flex items-center justify-center rounded-lg border border-border hover:border-primary hover:text-primary h-9 px-4 text-sm font-medium transition-colors gap-1 flex-1"
          >
            Details <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}

export default async function ProgramsPage() {
  const [sanityPrograms, apiPrograms, sanityPage] = await Promise.all([
    getAllSanityPrograms(),
    getPrograms(),
    sanityFetch<Page | null>({ query: pageBySlugQuery, params: { slug: 'programs' }, tags: ['page-programs'] }),
  ])

  const apiBySlug = Object.fromEntries(apiPrograms.map((p) => [p.slug, p]))

  const gridClass =
    sanityPrograms.length >= 3
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      : sanityPrograms.length === 2
        ? 'grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto'
        : 'grid-cols-1 max-w-md mx-auto'

  const extraSections = sanityPage?.sections?.filter((s) => s._type !== 'programsSection') ?? []

  // Build finance calculator data from Sanity programs that have a price
  const financeList = sanityPrograms
    .filter((p) => (p.price ?? apiBySlug[p.slug]?.price) != null)
    .map((p) => ({ id: p.slug, title: p.name, price: (p.price ?? apiBySlug[p.slug]?.price)! }))

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 flex flex-col gap-12 sm:gap-8">
        {/* Page header */}
        <div className="text-center space-y-4 max-w-2xl mx-auto mb-12">
          <div>
            <h1 className="font-semibold tracking-tight">Our Programs</h1>
            <div className="w-16 h-0.5 bg-primary mx-auto mt-2" />
          </div>
          <p className="text-muted-foreground">
            Practical, industry-aligned programs designed to get you job-ready fast. Learn by building real projects with expert mentors.
          </p>
        </div>

        {sanityPrograms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 text-center space-y-6 rounded-2xl border border-dashed border-border bg-muted/30">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2 max-w-md">
              <h2 className="text-xl font-semibold text-foreground">Programs coming soon</h2>
              <p className="text-sm text-muted-foreground">
                We&apos;re putting the finishing touches on our programs. Leave your email and we&apos;ll notify you the moment they&apos;re live.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-white hover:bg-primary/90 h-10 px-6 text-sm font-medium transition-colors"
              >
                <Bell className="w-4 h-4" /> Notify Me
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-lg border border-border hover:border-primary hover:text-primary h-10 px-6 text-sm font-medium transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </div>
        ) : (
          <div className={`grid gap-6 sm:gap-8 ${gridClass}`}>
            {sanityPrograms.map((p) => (
              <ProgramCard key={p.slug} sanity={p} api={apiBySlug[p.slug]} />
            ))}
          </div>
        )}

        {sanityPrograms.length > 0 && (
          <>
            <Separator />
            <FinanceCalculator programList={financeList} />
            <Separator />

            <div className="rounded-2xl bg-primary/5 border border-primary/20 px-6 sm:px-12 py-10 sm:py-14 text-center space-y-5">
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                Not sure which program is right for you?
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Our career advisors can help you choose the perfect path based on your goals and experience level.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary text-white hover:bg-primary/90 px-8 py-3 text-sm font-semibold transition-colors"
              >
                Get Free Career Counseling <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </>
        )}
      </div>

      {extraSections.length > 0 && <SectionRenderer sections={extraSections} />}
    </>
  )
}
