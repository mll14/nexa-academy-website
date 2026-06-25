import { SanityImage } from '@/components/shared/SanityImage'
import { SectionWrapper } from './SectionWrapper'
import { Badge } from '@/components/ui/Badge'
import type { GallerySection as GallerySectionType } from '@/types'

export function GallerySection({ section }: { section: GallerySectionType }) {
  const { badge, headline, subheadline, photos = [], layout = 'grid', columns = 3 } = section

  if (!photos.length) return null

  const colClass =
    columns === 2
      ? 'sm:grid-cols-2'
      : columns === 4
        ? 'sm:grid-cols-2 lg:grid-cols-4'
        : 'sm:grid-cols-2 lg:grid-cols-3'

  return (
    <SectionWrapper section={section} containerSize="lg" className="py-14 md:py-20">
      {(badge || headline || subheadline) && (
        <div className="text-center mb-10 space-y-3">
          {badge && <Badge>{badge}</Badge>}
          {headline && <h2 className="font-semibold tracking-tight">{headline}</h2>}
          {subheadline && <p className="text-muted-foreground max-w-xl mx-auto">{subheadline}</p>}
        </div>
      )}

      {layout === 'featured' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Large featured photo */}
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden md:row-span-2">
            <SanityImage
              image={photos[0].image}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
            {photos[0].caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
                <p className="text-white text-sm font-medium">{photos[0].caption}</p>
              </div>
            )}
          </div>
          {/* Remaining photos */}
          <div className="grid grid-cols-2 gap-3">
            {photos.slice(1, 5).map((photo, i) => (
              <div key={photo._key ?? i} className="relative aspect-square rounded-xl overflow-hidden">
                <SanityImage
                  image={photo.image}
                  fill
                  className="object-cover"
                  sizes="25vw"
                />
                {photo.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-2">
                    <p className="text-white text-xs font-medium">{photo.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : layout === 'masonry' ? (
        <div
          className={`columns-1 ${
            columns === 2
              ? 'sm:columns-2'
              : columns === 4
                ? 'sm:columns-2 lg:columns-4'
                : 'sm:columns-2 lg:columns-3'
          } gap-3 space-y-3`}
        >
          {photos.map((photo, i) => (
            <div key={photo._key ?? i} className="relative break-inside-avoid rounded-xl overflow-hidden">
              <SanityImage
                image={photo.image}
                width={600}
                height={400}
                className="w-full h-auto object-cover"
                sizes="(max-width: 640px) 100vw, 33vw"
              />
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
                  <p className="text-white text-xs font-medium">{photo.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className={`grid grid-cols-1 ${colClass} gap-3`}>
          {photos.map((photo, i) => (
            <div key={photo._key ?? i} className="relative aspect-[4/3] rounded-xl overflow-hidden group">
              <SanityImage
                image={photo.image}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes={`(max-width: 640px) 100vw, ${Math.round(100 / columns)}vw`}
              />
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p className="text-white text-xs font-medium">{photo.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </SectionWrapper>
  )
}
