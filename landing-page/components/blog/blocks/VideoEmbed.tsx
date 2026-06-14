import type { VideoEmbedData } from '@/types'

function getEmbedUrl(url: string, startAt?: number): string | null {
  // YouTube
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  )
  if (ytMatch) {
    const params = new URLSearchParams({ rel: '0', modestbranding: '1' })
    if (startAt) params.set('start', String(startAt))
    return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?${params}`
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) {
    const params = new URLSearchParams({ dnt: '1' })
    if (startAt) params.set('t', String(startAt))
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?${params}`
  }

  return null
}

export function VideoEmbed({ value }: { value: VideoEmbedData }) {
  const embedUrl = getEmbedUrl(value.url, value.startAt)

  if (!embedUrl) {
    return (
      <div className="my-8 rounded-xl border border-border bg-muted/50 px-6 py-8 text-center text-sm text-muted-foreground">
        Unsupported video URL: {value.url}
      </div>
    )
  }

  return (
    <figure className="my-8">
      <div className="relative overflow-hidden rounded-xl border border-border bg-black aspect-video">
        <iframe
          src={embedUrl}
          title={value.caption ?? 'Embedded video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
      {value.caption && (
        <figcaption className="mt-2 text-center text-xs text-muted-foreground italic">
          {value.caption}
        </figcaption>
      )}
    </figure>
  )
}
