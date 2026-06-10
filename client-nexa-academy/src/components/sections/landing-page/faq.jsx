import { useState, useEffect } from "react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Link } from "react-router-dom";
import contentService from "@/services/contentService";

const STATIC_FAQS = [
  {
    question: "What are the admission requirements?",
    answer:
      "No prior experience is required for beginner programs. For intermediate and advanced tracks, basic knowledge of programming fundamentals is recommended. All applicants go through a short onboarding assessment.",
  },
  {
    question: "Do you offer flexible payment options?",
    answer:
      "Yes. We offer installment-based payment plans for all programs. You can spread the cost over 3–6 months with zero interest. Reach out to our admissions team to discuss the best plan for you.",
  },
  {
    question: "What support is available during the Program?",
    answer:
      "Every student gets access to 1:1 mentorship sessions, a dedicated Slack community, weekly live Q&A calls, and a project reviewer for hands-on assignments.",
  },
];

export function FAQSection() {
  const [faqs, setFaqs] = useState([]);

  useEffect(() => {
    contentService.getHomepageFaqs().then((res) => {
      if (res.success && res.faqs.length > 0) {
        setFaqs(res.faqs);
      } else {
        setFaqs(STATIC_FAQS);
      }
    });
  }, []);

  const displayFaqs = faqs.length > 0 ? faqs : STATIC_FAQS;

  return (
    <section className="w-full py-16 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 space-y-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-semibold">Questions you might have</h2>
          <p className="text-muted-foreground text-sm">
            Clear answers before you commit.
          </p>
        </div>

        {/* FAQ Panel (shadcn-style Accordion) */}
        <div className="rounded-2xl px-3 border bg-background">
          <Accordion type="single" collapsible className="divide-y">
            {displayFaqs.map((faq, i) => (
              <AccordionItem key={faq.id || i} value={`faq-${i}`}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>
                  <div className="min-h-40 pb-4 text-sm text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
        <div className="flex justify-center">
          <Link
            to="/faq"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary text-white hover:bg-primary/90 px-6 py-3 text-lg font-semibold transition-colors"
          >
            See More Questions? Visit FAQ
          </Link>
        </div>
      </div>
    </section>
  );
}
