import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import * as LucideIcons from "lucide-react";
import contentService from "@/services/contentService";

function DynamicIcon({ name, className }) {
  const Icon = LucideIcons[name] || LucideIcons.Star;
  return <Icon className={className} />;
}

function ChalkArrow({ direction = "right" }) {
  if (direction === "down") {
    return (
      <div className="flex justify-center my-2 sm:hidden">
        <svg
          width="56"
          height="72"
          viewBox="0 0 56 72"
          fill="none"
          className="text-primary/70"
        >
          <path
            d="M28,6 Q8,24 28,48 Q38,62 28,66"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="6 4"
            fill="none"
          />
          <path
            d="M16,57 L28,68 L40,57"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>
    );
  }
  return (
    <div className="hidden md:flex items-center justify-center shrink-0 w-20 self-center">
      <svg
        width="80"
        height="56"
        viewBox="0 0 80 56"
        fill="none"
        className="text-primary/70"
      >
        <path
          d="M6,28 Q22,6 50,28 Q62,36 74,26"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray="6 4"
          fill="none"
        />
        <path
          d="M63,14 L75,26 L63,38"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  );
}

export function WhyChooseSection() {
  const [features, setFeatures] = useState([]);
  const [journey, setJourney] = useState([]);

  useEffect(() => {
    contentService.getFeatures('why_choose').then(res => {
      if (res.success) setFeatures(res.features);
    });
    contentService.getFeatures('journey').then(res => {
      if (res.success) setJourney(res.features);
    });
  }, []);

  return (
    <section className="w-full relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 space-y-14 sm:space-y-20">
        {/* Header */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div>
            <h2 className="font-semibold tracking-tight">
              Why Choose <span className="text-primary">Nexa Academy</span>
            </h2>

            <div className="w-16 h-0.5 bg-primary mx-auto" />
          </div>

          <p className="text-muted-foreground">
            We're building a structured, mentor-led path from fundamentals to
            job-ready engineering skills.
          </p>
        </div>

        {/* Core Features */}
        {features.length > 0 && (
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <Card key={feature.id || i} className="border rounded-2xl bg-white">
                <CardContent className="p-5 sm:p-8 text-center space-y-4 sm:space-y-5">
                  <div className="mx-auto w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
                    <DynamicIcon name={feature.iconName} className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="font-semibold">{feature.title}</h4>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Learning Journey */}
        <div className="space-y-10">
          <div className="text-left space-y-2">
            <h3 className="font-semibold">Your Learning Journey</h3>
            <p className="text-muted-foreground max-w-xl">
              Follow a practical, mentor-guided roadmap from beginner
              foundations to job-ready project delivery.
            </p>
          </div>

          <div className="flex flex-col md:flex-row md:items-start gap-0">
            {journey.map((step, i) => (
              <div key={step.id || i} className="contents">
                {i > 0 && <ChalkArrow direction="down" />}
                {i > 0 && <ChalkArrow direction="right" />}
                <Card className="border rounded-2xl bg-white flex-1">
                  <CardContent className="p-5 sm:p-8 space-y-4 sm:space-y-5">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-muted-foreground">
                        Step {i + 1}
                      </span>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <DynamicIcon name={step.iconName} className="w-5 h-5 text-primary" />
                    </div>
                    <h4 className="font-semibold">{step.title}</h4>
                    <p className="text-muted-foreground">{step.description}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
