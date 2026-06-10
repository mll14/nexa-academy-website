import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";
import contentService from "@/services/contentService";

export function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState([]);

  useEffect(() => {
    contentService.getTestimonials().then(res => {
      if (res.success) setTestimonials(res.testimonials);
    });
  }, []);

  if (testimonials.length === 0) return null;

  return (
    <section className="w-full bg-muted/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 space-y-10">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div>
            <h2 className="font-semibold tracking-tight">
              Hear From Our <span className="text-primary">Graduates</span>
            </h2>
            <div className="w-16 h-0.5 bg-primary mx-auto" />
          </div>

          <p className="text-muted-foreground">
            Thousands of students have launched careers with Nexa Academy.
          </p>
        </div>

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
            <SwiperSlide key={t.id || t.name}>
              <Card className="border rounded-2xl bg-background">
                <CardContent className="p-5 sm:p-7 space-y-4">
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 fill-primary text-primary"
                      />
                    ))}
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div>
                    <p className="font-semibold text-md">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </CardContent>
              </Card>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}

