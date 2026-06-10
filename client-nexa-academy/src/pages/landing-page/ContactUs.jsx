import { useEffect } from "react";
import { setSeoData } from "../../utils/seoUtils";

import { Header } from "@/components/sections/landing-page/header";
import { Footer } from "@/components/sections/landing-page/Footer";
import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";

import { Separator } from "@/components/ui/separator";
import { Mail, Phone, Clock, MapPin, ExternalLink } from "lucide-react";

import ContactForm from "@/components/contact/ContactForm";
import ContactSidebar from "@/components/contact/ContactSidebar";

// ── Static data ──────────────────────────────────────────────────
const contactLinks = [
  {
    label: "Email Us",
    value: "info@nexaacademy.co.ke",
    href: "mailto:info@nexaacademy.co.ke",
    icon: Mail,
  },
  {
    label: "Call Us",
    value: "+254713067311",
    href: "tel: +254713067311",
    icon: Phone,
  },
  {
    label: "Location",
    value: "10th Floor, JKUAT Towers, CBD — Opp. Jamia Mosque",
    href: "https://maps.app.goo.gl/ythn37VzoNNi3jRA7",
    icon: MapPin,
    external: true,
  },
];

// ── Main Page ────────────────────────────────────────────────────
const ContactUs = () => {
  useEffect(() => {
    setSeoData("contact");
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 w-full">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 space-y-12 sm:space-y-16">
          {/* Hero */}
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="font-semibold tracking-tight">
              Start Your <span className="text-primary">Tech Journey</span>
            </h1>
            <div className="w-16 h-0.5 bg-primary mx-auto" />
            <p className="text-muted-foreground py-1">
              Fill out the form below to apply for your chosen program.
            </p>
          </div>

          {/* Contact quick links */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {contactLinks.map(
              ({ label, value, href, icon: Icon, external }) => (
                <a
                  key={label}
                  href={href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-background p-4 hover:border-primary transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    {Icon ? <Icon className="w-4 h-4 text-primary" /> : null}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                      {label}
                    </p>
                    <p className="text-sm font-semibold mt-0.5">{value}</p>
                  </div>
                </a>
              ),
            )}
          </div>

          <Separator />

          {/* Form + Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 lg:sticky lg:top-24">
              <ContactSidebar />
            </div>
            <div className="lg:col-span-7">
              <ContactForm />
            </div>
          </div>

          <Separator />

          {/* Map Section */}
          <div className="space-y-5">
            <div className="space-y-1">
              <Badge
                variant="outline"
                className="border-primary text-primary text-xs"
              >
                Visit Our Office
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-semibold">
                10th Floor, JKUAT Towers, Nairobi CBD
              </h2>
              <p className="text-sm text-muted-foreground">
                Opposite Jamia Mosque, Nairobi City Centre. We welcome visitors
                during office hours.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
              >
                <a
                  href="https://maps.app.goo.gl/ythn37VzoNNi3jRA7"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open in Maps <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-primary text-primary hover:bg-primary hover:text-white gap-2"
              >
                <a
                  href="https://maps.app.goo.gl/ythn37VzoNNi3jRA7"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on Google Maps <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </Button>
            </div>

            <div className="rounded-2xl overflow-hidden border border-border">
              <iframe
                title="Nexa Academy Office Location"
                src="https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d3988.8160025351544!2d36.818476275755984!3d-1.2843189356256064!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zMcKwMTcnMDIuNiJTIDM2wrA0OScxNS41IkU!5e0!3m2!1sen!2ske!4v1777660539958!5m2!1sen!2ske"
                width="100%"
                height="380"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ContactUs;
