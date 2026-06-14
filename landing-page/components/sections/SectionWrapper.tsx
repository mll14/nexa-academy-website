import { cn } from '@/lib/utils'
import { Container } from '@/components/ui/Container'
import type { SectionBase } from '@/types'

const bgClasses: Record<string, string> = {
  white: 'bg-white',
  light: 'bg-muted/40',
  dark: 'bg-foreground text-background',
  primary: 'bg-primary text-white',
  gradient: 'bg-gradient-to-br from-primary/5 via-background to-secondary/5',
}

interface SectionWrapperProps {
  section: SectionBase
  children: React.ReactNode
  className?: string
  containerSize?: 'sm' | 'default' | 'lg' | 'full'
}

export function SectionWrapper({ section, children, className, containerSize }: SectionWrapperProps) {
  const bgStyle = section.background?.style ?? 'white'
  return (
    <section
      id={section.sectionId ?? undefined}
      className={cn('py-16 md:py-24', bgClasses[bgStyle] ?? 'bg-white', className)}
    >
      <Container size={containerSize}>{children}</Container>
    </section>
  )
}
