import { useState, useEffect } from "react";
import { setSeoData } from "../../utils/seoUtils";
import contentService from "@/services/contentService";
import { Header } from "@/components/sections/landing-page/header";
import { Footer } from "@/components/sections/landing-page/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FileText } from "lucide-react";
const Terms = () => {
  const [termsSections, setTermsSections] = useState([]);

  useEffect(() => {
    setSeoData("terms");
    contentService.getLegalDocument('terms').then(res => {
      if (res.success) setTermsSections(res.sections);
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 w-full">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 space-y-10">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="max-w-2xl">
                <h1 className="font-semibold tracking-tight">
                  Terms &amp; <span className="text-primary">Conditions</span>
                </h1>
                <p className="text-muted-foreground py-1">
                  Please read these terms carefully before enrolling in any Nexa
                  Academy program.
                </p>
              </div>
              <Badge
                variant="outline"
                className="border-primary text-primary text-xs"
              >
                Legal
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Badge className="bg-primary/10 text-primary border-0 text-xs hover:bg-primary/20">
                Last updated: April 1, 2026
              </Badge>
            </div>
          </div>

          <Separator />

          <Accordion type="multiple" className="space-y-3">
            {termsSections.map((s) => (
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

          <Separator />

          <div className="rounded-2xl bg-primary/5 border border-primary/20 px-6 sm:px-10 py-8 text-center space-y-3">
            <FileText className="w-8 h-8 text-primary mx-auto" />
            <h3 className="font-semibold text-base sm:text-lg">
              Questions about these terms?
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Want to contact us?{" "}
              <Button asChild variant={"link"} className="">
                <a href="mailto:info@nexaacademy.co.ke">here</a>
              </Button>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Terms;
