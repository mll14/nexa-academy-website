import Link from 'next/link'
import Image from 'next/image'
import { Clock, Award, ArrowRight, BookOpen } from 'lucide-react'
import { SectionWrapper } from './SectionWrapper'
import { SectionHeader } from './SectionHeader'
import { getPrograms } from '@/lib/api/programs'
import { getIntakesForName } from '@/lib/api/intakes'
import { getAllSanityPrograms } from '@/lib/sanity/programs'
import { urlFor } from '@/lib/sanity/image'
import type { ProgramsSection as ProgramsSectionType, SanityProgram, ApiProgram } from '@/types'

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
  const intakes = await getIntakesForName(sanity.name)
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
            className="object-cover group-hover:scale-105 transition-transform duration-500"
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
          {seats != null && <div className="ml-auto"><SeatsTag seats={seats} /></div>}
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

        <div className="flex flex-wrap gap-2">
          <span className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-full text-xs font-medium">
            <Clock className="h-3.5 w-3.5 text-primary" /> {next ? fmtDate(next.start_date) : 'Flexible'}
          </span>
        </div>

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

        <div className="mt-auto flex gap-2 pt-1">
          <Link
            href={`/apply?program=${sanity.slug}`}
            className="inline-flex items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/90 h-9 px-4 text-sm font-semibold transition-colors flex-1"
          >
            Apply Now
          </Link>
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

export async function ProgramsSection({ section }: { section: ProgramsSectionType }) {
  const [sanityPrograms, apiPrograms] = await Promise.all([
    getAllSanityPrograms(),
    getPrograms(),
  ])

  const apiBySlug = Object.fromEntries(apiPrograms.map((p) => [p.slug, p]))

  const displayPrograms = sanityPrograms.slice(0, 3)

  const gridClass =
    displayPrograms.length >= 3
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      : displayPrograms.length === 2
        ? 'grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto'
        : 'grid-cols-1 max-w-md mx-auto'

  return (
    <SectionWrapper section={section} containerSize="lg">
      <SectionHeader title={section.sectionTitle} subtitle={section.sectionSubtitle} />
      {sanityPrograms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-5 rounded-2xl border border-dashed border-border bg-muted/30">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <BookOpen className="w-7 h-7 text-primary" />
          </div>
          <div className="space-y-1.5 max-w-sm">
            <p className="font-semibold text-foreground">Programs coming soon</p>
            <p className="text-sm text-muted-foreground">
              We&apos;re building something great. Check back soon or get notified when we launch.
            </p>
          </div>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-lg border border-primary text-primary hover:bg-primary hover:text-white h-9 px-5 text-sm font-medium transition-colors"
          >
            Get Notified
          </Link>
        </div>
      ) : (
        <>
          <div className={`grid gap-6 sm:gap-8 ${gridClass}`}>
            {displayPrograms.map((p) => (
              <ProgramCard key={p.slug} sanity={p} api={apiBySlug[p.slug]} />
            ))}
          </div>
          <div className="flex justify-center mt-10">
            <Link
              href="/programs"
              className="inline-flex items-center justify-center rounded-md bg-primary text-white hover:bg-primary/90 px-6 py-3 text-lg font-semibold transition-colors"
            >
              See More
            </Link>
          </div>
        </>
      )}
    </SectionWrapper>
  )
}
