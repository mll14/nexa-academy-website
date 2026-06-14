import { SectionWrapper } from './SectionWrapper'
import { SectionHeader } from './SectionHeader'
import { cn } from '@/lib/utils'
import type { StatsSection as StatsSectionType } from '@/types'

export function StatsSection({ section }: { section: StatsSectionType }) {
  return (
    <SectionWrapper section={section}>
      <SectionHeader title={section.sectionTitle} />
      <div className={cn(
        'grid gap-8',
        section.layout === 'grid' ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:flex md:justify-around',
      )}>
        {section.stats?.map((stat, i) => (
          <div key={i} className="text-center">
            <div className="text-4xl md:text-5xl font-extrabold text-primary">
              {stat.prefix}{stat.value}{stat.suffix}
            </div>
            <div className="mt-2 text-base font-semibold text-foreground">{stat.label}</div>
            {stat.description && (
              <div className="mt-1 text-sm text-muted-foreground">{stat.description}</div>
            )}
          </div>
        ))}
      </div>
    </SectionWrapper>
  )
}
