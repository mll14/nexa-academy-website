import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useCountUp } from "use-count-up";
import contentService from "@/services/contentService";

function StatCounter({ end, decimals = 0, suffix }) {
  const { value } = useCountUp({
    isCounting: true,
    end,
    duration: 2.5,
    decimalPlaces: decimals,
  });
  return (
    <span>
      {value}
      {suffix}
    </span>
  );
}

const STAT_DEFAULTS = [
  { key: "hero_stat_graduates",   end: 300, decimals: 0, suffix: "+",  label: "Graduates" },
  { key: "hero_stat_rating",      end: 4.9, decimals: 1, suffix: "/5", label: "Student Rating" },
  { key: "hero_stat_success_rate",end: 95,  decimals: 0, suffix: "%",  label: "Success Rate" },
];

export function Hero() {
  const [cmsStats, setCmsStats] = useState({});

  useEffect(() => {
    contentService.getSettings("hero").then((res) => {
      if (res.success) setCmsStats(res.settings);
    });
  }, []);

  return (
    <section className="w-full relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 grid md:grid-cols-2 gap-10 lg:gap-16 items-center">
        {/* Left Content */}
        <div className="flex flex-col gap-5 sm:gap-6 text-center md:text-left items-center md:items-start">
          <h1 className="font-semibold leading-tight">
            Master In-Demand Tech Skills with{" "}
            <span className="text-primary">Industry Certification</span>
          </h1>

          <p className="text-muted-foreground max-w-md">
            Join Nexa Academy — Africa's premier tech school offering certified
            programs in Full-Stack Development and Cloud Computing. Learn from
            industry experts and launch your tech career.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <Link
              to="/apply"
              className="inline-flex w-full sm:w-auto items-center justify-center rounded-md border border-transparent bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 text-sm font-medium transition-colors h-10"
            >
              Get Started
            </Link>
            <Link
              to="/programs"
              className="inline-flex w-full sm:w-auto items-center justify-center rounded-md border border-primary text-primary hover:bg-primary hover:text-white px-6 py-3 text-sm font-medium transition-colors h-10"
            >
              Browse Courses
            </Link>
          </div>

          {/* Stats / trust indicators */}
          <div className="flex items-center justify-center md:justify-start gap-8 sm:gap-10 pt-2">
            {STAT_DEFAULTS.map((stat) => (
              <div key={stat.label} className="text-center md:text-left">
                <p className="font-bold text-2xl sm:text-3xl text-foreground leading-none">
                  {cmsStats[stat.key] ? (
                    <span>{cmsStats[stat.key]}</span>
                  ) : (
                    <StatCounter end={stat.end} decimals={stat.decimals} suffix={stat.suffix} />
                  )}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Image / Illustration */}
        <div className="w-full h-80 sm:h-80 md:h-96 lg:h-112.5 rounded-2xl overflow-hidden relative">
          {/* Blob background shape */}
          <div
            className="absolute inset-0 z-0"
            style={{
              background:
                "radial-gradient(ellipse at 60% 40%, color-mix(in srgb, var(--color-primary) 18%, transparent) 0%, transparent 70%)",
            }}
          />
          <img
            src="/hero-img.jpg"
            alt="Students learning tech at Nexa Academy"
            className="w-full h-full object-cover relative z-10"
            loading="lazy"
            decoding="async"
            width="1600"
            height="900"
          />
        </div>
      </div>
    </section>
  );
}
