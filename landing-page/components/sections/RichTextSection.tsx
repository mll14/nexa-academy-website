import { SectionWrapper } from './SectionWrapper'
import { PortableTextRenderer } from '@/components/shared/PortableTextRenderer'
import { cn } from '@/lib/utils'
import type { RichTextSection as RichTextSectionType } from '@/types'

const widthClasses = {
  narrow: 'max-w-2xl',
  default: 'max-w-3xl',
  wide: 'max-w-5xl',
}

export function RichTextSection({ section }: { section: RichTextSectionType }) {
  const width = section.width ?? 'default'
  return (
    <SectionWrapper section={section}>
      <div className={cn('mx-auto', widthClasses[width] ?? widthClasses.default)}>
        {section.content && <PortableTextRenderer value={section.content} />}
      </div>
    </SectionWrapper>
  )
}
