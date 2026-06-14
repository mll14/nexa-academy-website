import { SectionWrapper } from './SectionWrapper'
import { SectionHeader } from './SectionHeader'
import { SanityImage } from '@/components/shared/SanityImage'
import type { VideoSection as VideoSectionType } from '@/types'

function getEmbedUrl(url: string): string {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`
  return url
}

export function VideoSection({ section }: { section: VideoSectionType }) {
  const embedUrl = section.videoUrl ? getEmbedUrl(section.videoUrl) : null

  return (
    <SectionWrapper section={section}>
      <div className="max-w-4xl mx-auto">
        <SectionHeader title={section.sectionTitle} />
        <div className="relative overflow-hidden rounded-2xl aspect-video bg-muted">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              className="absolute inset-0 w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={section.sectionTitle ?? 'Video'}
            />
          ) : section.thumbnail?.asset ? (
            <SanityImage image={section.thumbnail} fill className="object-cover" sizes="(max-width: 768px) 100vw, 900px" />
          ) : null}
        </div>
        {section.caption && (
          <p className="mt-4 text-center text-sm text-muted-foreground">{section.caption}</p>
        )}
      </div>
    </SectionWrapper>
  )
}
