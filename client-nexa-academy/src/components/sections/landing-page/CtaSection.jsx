import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import contentService from "@/services/contentService";

const CTA_DEFAULTS = {
  cta_heading: "Ready To Become Job-Ready?",
  cta_subtext: "Join a cohort built for outcomes and start your transition into high-impact tech roles.",
  cta_button_label: "Apply Now",
};

export function CTASection() {
  const [cta, setCta] = useState(CTA_DEFAULTS);

  useEffect(() => {
    contentService.getSettings("cta").then((res) => {
      if (res.success && Object.keys(res.settings).length > 0) {
        setCta({ ...CTA_DEFAULTS, ...res.settings });
      }
    });
  }, []);

  return (
    <section className="w-full mx-auto py-5 flex items-center justify-center">
      <div className="max-w-7xl rounded-2xl bg-primary/5 border border-primary/20 px-6 sm:px-12 py-10 sm:py-14 text-center space-y-5">
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          {cta.cta_heading}
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {cta.cta_subtext}
        </p>
        <Link
          to="/apply"
          className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary text-primary-foreground hover:bg-primary/90 px-8 h-9 text-sm font-medium transition-colors"
        >
          {cta.cta_button_label}
        </Link>
      </div>
    </section>
  );
}
