'use client'

import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay } from 'swiper/modules'
import { Star } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { SanityImage } from '@/components/shared/SanityImage'
import type { TestimonialDoc } from '@/types'
import 'swiper/css'

export function TestimonialsCarousel({ testimonials }: { testimonials: TestimonialDoc[] }) {
  if (!testimonials?.length) return null

  return (
    <Swiper
      modules={[Autoplay]}
      spaceBetween={20}
      loop={true}
      autoplay={{ delay: 3500, disableOnInteraction: false }}
      breakpoints={{
        0: { slidesPerView: 1 },
        768: { slidesPerView: 2 },
        1024: { slidesPerView: 3 },
      }}
    >
      {testimonials.map((t) => (
        <SwiperSlide key={t._id}>
          <Card className="border rounded-2xl bg-background h-full">
            <CardContent className="p-5 sm:p-7 space-y-4">
              {t.rating != null && (
                <div className="flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>
              )}
              <p className="text-muted-foreground leading-relaxed">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                {(t.avatar?.asset || t.avatarUrl) && (
                  <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-muted">
                    {t.avatar?.asset ? (
                      <SanityImage image={t.avatar} fill className="object-cover" sizes="40px" />
                    ) : t.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.avatarUrl} alt={t.name} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.role}{t.company ? `, ${t.company}` : ''}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </SwiperSlide>
      ))}
    </Swiper>
  )
}
