import { useState, useEffect } from "react";
import { setSeoData } from "../../utils/seoUtils";
import contentService from "@/services/contentService";
import { Header } from "@/components/sections/landing-page/header";
import { Footer } from "@/components/sections/landing-page/Footer";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ShieldCheck, ChevronDown, Check } from "lucide-react";

const HIGHLIGHTS = [
  { label: "No data selling" },
  { label: "Encrypted storage" },
  { label: "You control your data" },
  { label: "GDPR-aligned" },
];

function SummaryCard() {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-2xl border border-border bg-background p-5 sm:p-7 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm sm:text-base">
                Privacy at a Glance
              </p>
              <p className="text-xs text-muted-foreground">
                A quick summary of our key commitments
              </p>
            </div>
          </div>
          <CollapsibleTrigger asChild>
            <button
              className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
              aria-label="Toggle summary"
            >
              {open ? "Hide" : "Show"}
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <Separator className="my-3" />
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>We collect only the data needed to serve you.</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>We never sell your personal information.</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>You can request access or deletion of your data anytime.</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>All data is transmitted over encrypted (HTTPS) connections.</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Third-party access is limited to essential service providers.</span>
            </li>
          </ul>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

const Privacy = () => {
  const [sections, setSections] = useState([]);

  useEffect(() => {
    setSeoData("privacy");
    contentService.getLegalDocument('privacy').then(res => {
      if (res.success) setSections(res.sections);
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 w-full">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 space-y-10">
          {/* Hero Header */}
          <div className="space-y-4">
            <Badge
              variant="outline"
              className="border-primary text-primary text-xs"
            >
              Legal
            </Badge>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-muted-foreground max-w-2xl text-sm sm:text-base">
              This Privacy Policy explains how Nexa Academy collects, uses, and
              protects personal data submitted through our website and student
              services.
            </p>
            <p className="text-xs text-muted-foreground">
              Last updated: April 1, 2026
            </p>

            {/* Highlight badges */}
            <div className="flex flex-wrap gap-2 pt-1">
              {HIGHLIGHTS.map((h) => (
                <Badge
                  key={h.label}
                  className="bg-primary/10 text-primary hover:bg-primary/20 border-0 text-xs"
                >
                  {h.label}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Quick Summary (Collapsible) */}
          <SummaryCard />

          {/* Policy Sections (Accordion) */}
          <div className="space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold">
              Full Policy Details
            </h2>
            <Accordion type="multiple" className="space-y-3">
              {sections.map((s) => (
                <AccordionItem
                  key={s.id || s.sectionId}
                  value={s.id || s.sectionId}
                  className="border border-border rounded-2xl px-5 sm:px-7 overflow-hidden data-[state=open]:border-primary/40"
                >
                  <AccordionTrigger className="text-sm sm:text-base font-medium py-4 hover:no-underline hover:text-primary [&>svg]:text-primary">
                    {s.title}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground pb-5 leading-relaxed">
                    {s.content}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <Separator />

          {/* Contact CTA */}
          <div className="rounded-2xl bg-primary/5 border border-primary/20 px-6 sm:px-10 py-8 text-center space-y-3">
            <ShieldCheck className="w-8 h-8 text-primary mx-auto" />
            <h3 className="font-semibold text-base sm:text-lg">
              Have a Privacy Question?
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Reach out to our team at{" "}
              <a
                href="mailto:info@nexaacademy.co.ke"
                className="text-primary font-medium hover:underline"
              >
                info@nexaacademy.co.ke
              </a>{" "}
              and we'll respond within 5 business days.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Privacy;
