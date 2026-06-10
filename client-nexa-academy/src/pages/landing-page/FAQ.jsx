import { useMemo, useState, useEffect } from "react";
import { setSeoData } from "@/utils/seoUtils";
import contentService from "@/services/contentService";

const CATEGORY_META = {
  general:    { title: "General",             description: "Common questions about Nexa Academy and our programs" },
  bootcamp:   { title: "Software Engineering", description: "Questions about our Software Engineering program" },
  cloud:      { title: "Cloud & AI",           description: "Questions about Cloud Computing and AI" },
  pricing:    { title: "Pricing & Payments",   description: "Questions about fees and payment plans" },
  admissions: { title: "Admissions",           description: "Questions about the admissions process" },
};

const TAB_LABELS = {
  bootcamp:   "Software Engineering",
  cloud:      "Cloud & AI",
  pricing:    "Pricing",
  admissions: "Admissions",
  general:    "General",
};

import { Header } from "@/components/sections/landing-page/header";
import { Footer } from "@/components/sections/landing-page/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpCircle, ArrowRight, Mail } from "lucide-react";

// ── Category Section ─────────────────────────────────────────────
function FAQCategory({ category }) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-semibold">{category.title}</h2>
        <p className="text-sm text-muted-foreground">{category.description}</p>
      </div>

      <Accordion type="multiple" className="space-y-2">
        {category.faqs.map((faq, i) => (
          <AccordionItem
            key={i}
            value={`${category.id}-${i}`}
            className="border border-border rounded-2xl px-5 sm:px-6 overflow-hidden data-[state=open]:border-primary/40"
          >
            <AccordionTrigger className="flex items-center gap-3 text-sm sm:text-base font-medium py-4 hover:no-underline hover:text-primary text-left [&>svg]:shrink-0 [&>svg]:text-primary">
              <HelpCircle className="w-4 h-4 text-primary shrink-0" />
              <span>{faq.question}</span>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground pb-5 leading-relaxed pl-7">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

// ── CTA Banner ───────────────────────────────────────────────────
function FAQCta() {
  return (
    <div className="rounded-2xl bg-primary/5 border border-primary/20 px-6 sm:px-12 py-10 sm:py-14 text-center space-y-5">
      <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight">
        Need more clarity?
      </h3>
      <p className="text-sm text-muted-foreground max-w-xl mx-auto">
        If your specific question is not covered here, our team can guide you
        through program selection and payment options.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button
          asChild
          className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
        >
          <a href="/contact">
            Contact Support <ArrowRight className="w-4 h-4" />
          </a>
        </Button>
        <Button
          asChild
          variant="outline"
          className="border-primary text-primary hover:bg-primary hover:text-white gap-2"
        >
          <a href="mailto:info@nexaacademy.co.ke">
            <Mail className="w-4 h-4" /> Talk to Admissions
          </a>
        </Button>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────
const FAQ = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [faqCategories, setFaqCategories] = useState([]);
  const [faqTabs, setFaqTabs] = useState([{ id: "all", label: "All Questions" }]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSeoData("faq");
    contentService.getFaqs().then(res => {
      if (res.success && res.faqs.length > 0) {
        const grouped = {};
        res.faqs.forEach(faq => {
          const cat = faq.category || 'general';
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push({ question: faq.question, answer: faq.answer });
        });
        const categories = Object.entries(grouped).map(([id, faqs]) => ({
          id,
          title: CATEGORY_META[id]?.title || id,
          description: CATEGORY_META[id]?.description || '',
          faqs,
        }));
        const tabs = [
          { id: "all", label: "All Questions" },
          ...categories.map(c => ({ id: c.id, label: TAB_LABELS[c.id] || c.title })),
        ];
        setFaqCategories(categories);
        setFaqTabs(tabs);
      }
      setLoading(false);
    });
  }, []);

  const visibleCategories = useMemo(
    () =>
      activeTab === "all"
        ? faqCategories
        : faqCategories.filter((c) => c.id === activeTab),
    [activeTab, faqCategories],
  );

  const totalCount = faqCategories.reduce((acc, c) => acc + c.faqs.length, 0);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 w-full">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 space-y-12 sm:space-y-16">
          {/* Hero */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="max-w-2xl">
                <h1 className="font-semibold tracking-tight">
                  How can we <span className="text-primary">help?</span>
                </h1>
                <p className="text-muted-foreground py-1">
                  Find answers to common questions about our programs, learning
                  model, pricing, and admission process.
                </p>
              </div>
              <Badge
                variant="outline"
                className="border-primary text-primary text-xs"
              >
                Knowledge Base
              </Badge>
            </div>
            {!loading && (
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/10 text-primary border-0 text-xs hover:bg-primary/20">
                  {totalCount} questions answered
                </Badge>
                <Badge className="bg-primary/10 text-primary border-0 text-xs hover:bg-primary/20">
                  {faqCategories.length} categories
                </Badge>
              </div>
            )}
          </div>

          <Separator />

          {/* Tab Filter */}
          <div className="overflow-x-auto pb-1">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="inline-flex h-auto flex-wrap gap-1.5 bg-transparent p-0">
                {faqTabs.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="rounded-xl border border-border text-sm px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* FAQ Categories */}
          <div className="space-y-12">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-14 rounded-2xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : visibleCategories.map((category) => (
              <FAQCategory key={category.id} category={category} />
            ))}
          </div>

          <Separator />

          {/* CTA */}
          <FAQCta />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FAQ;
