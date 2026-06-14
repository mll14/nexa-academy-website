'use client'

import * as LucideIcons from 'lucide-react'
import { SectionWrapper } from './SectionWrapper'
import { SectionHeader } from './SectionHeader'
import { cn } from '@/lib/utils'
import type { FeaturesSection as FeaturesSectionType, FeatureItem, FeatureColor } from '@/types'

const colorMap: Record<FeatureColor, { card: string; icon: string; iconText: string }> = {
  'primary-tint':    { card: 'border-primary/20 hover:border-primary/50',              icon: 'bg-primary/10',   iconText: 'text-primary' },
  'primary-solid':   { card: 'border-primary bg-primary/5 hover:bg-primary/10',        icon: 'bg-primary',      iconText: 'text-white' },
  'secondary-tint':  { card: 'border-secondary/20 hover:border-secondary/40',          icon: 'bg-secondary/10', iconText: 'text-secondary' },
  'secondary-solid': { card: 'border-secondary bg-secondary/5 hover:bg-secondary/10',  icon: 'bg-secondary',    iconText: 'text-white' },
  'neutral':         { card: 'border-border bg-muted hover:border-muted-foreground/30', icon: 'bg-background',   iconText: 'text-muted-foreground' },
  'white':           { card: 'border-border bg-card hover:border-primary/30',           icon: 'bg-muted',        iconText: 'text-foreground' },
}

const columnClasses: Record<number, string> = {
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
}

function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const Icon = (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[name] ?? LucideIcons.Star
  return <Icon className={className} />
}

function ChalkArrow({ direction = 'right' }: { direction?: 'right' | 'down' }) {
  if (direction === 'down') {
    return (
      <div className="flex justify-center my-2 sm:hidden">
        <svg width="56" height="72" viewBox="0 0 56 72" fill="none" className="text-primary/70">
          <path d="M28,6 Q8,24 28,48 Q38,62 28,66" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="6 4" fill="none" />
          <path d="M16,57 L28,68 L40,57" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </div>
    )
  }
  return (
    <div className="hidden md:flex items-center justify-center shrink-0 w-20 self-center">
      <svg width="80" height="56" viewBox="0 0 80 56" fill="none" className="text-primary/70">
        <path d="M6,28 Q22,6 50,28 Q62,36 74,26" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="6 4" fill="none" />
        <path d="M63,14 L75,26 L63,38" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    </div>
  )
}

function FeatureCard({ feat, isList }: { feat: FeatureItem; isList: boolean }) {
  const c = colorMap[feat.color ?? 'primary-tint']
  return (
    <div className={cn(
      'flex gap-4',
      isList ? 'items-start' : cn('flex-col p-6 rounded-2xl border transition-colors', c.card),
    )}>
      {feat.iconName && (
        <div className={cn('flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-xl', c.icon, c.iconText)}>
          <DynamicIcon name={feat.iconName} className="w-5 h-5" />
        </div>
      )}
      <div>
        <h4 className="font-semibold">{feat.title}</h4>
        {feat.description && (
          <p className="mt-2 text-muted-foreground">{feat.description}</p>
        )}
      </div>
    </div>
  )
}

function JourneyCard({ feat, step }: { feat: FeatureItem; step: number }) {
  return (
    <div className="flex-1 h-full border border-border rounded-2xl bg-card p-5 sm:p-8 space-y-4 sm:space-y-5">
      <span className="text-xs font-medium text-muted-foreground">Step {step}</span>
      {feat.iconName && (
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <DynamicIcon name={feat.iconName} className="w-5 h-5 text-primary" />
        </div>
      )}
      <h4 className="font-semibold">{feat.title}</h4>
      {feat.description && <p className="text-muted-foreground">{feat.description}</p>}
    </div>
  )
}

export function FeaturesSection({ section }: { section: FeaturesSectionType }) {
  const cols = section.columns ?? 3
  const isJourney = section.layout === 'journey'
  const isList = section.layout === 'list'

  return (
    <SectionWrapper section={section}>
      <SectionHeader title={section.sectionTitle} subtitle={section.sectionSubtitle} />

      {isJourney ? (
        <div className="flex flex-col md:flex-row md:items-stretch gap-0">
          {section.features?.map((feat, i) => (
            <div key={feat._key ?? i} className="contents">
              {i > 0 && <ChalkArrow direction="down" />}
              {i > 0 && <ChalkArrow direction="right" />}
              <JourneyCard feat={feat} step={i + 1} />
            </div>
          ))}
        </div>
      ) : (
        <div className={cn(
          'grid gap-8',
          isList ? 'max-w-2xl mx-auto' : `grid-cols-1 ${columnClasses[cols] ?? 'md:grid-cols-3'}`,
        )}>
          {section.features?.map((feat, i) => (
            <FeatureCard key={feat._key ?? i} feat={feat} isList={isList} />
          ))}
        </div>
      )}
    </SectionWrapper>
  )
}
