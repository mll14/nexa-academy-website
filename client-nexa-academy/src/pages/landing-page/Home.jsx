import { useEffect } from "react";
import {
  setSeoData,
  injectJsonLd,
  generateOrganizationSchema,
} from "../../utils/seoUtils";
import { Header } from "@/components/sections/landing-page/header";
import { Hero } from "@/components/sections/landing-page/Hero";
import { WhyChooseSection } from "@/components/sections/landing-page/WhyChoose";
import { TestimonialsSection } from "@/components/sections/landing-page/Testimonials";
import { ProgramsSection } from "@/components/sections/landing-page/Programs";
import { PricingPlansSection } from "@/components/sections/landing-page/Pricing";
import { Footer } from "@/components/sections/landing-page/Footer";
import { CTASection } from "@/components/sections/landing-page/CtaSection";
import { FAQSection } from "@/components/sections/landing-page/faq";

const Home = () => {
  useEffect(() => {
    setSeoData("home");
    injectJsonLd(generateOrganizationSchema());
  }, []);

  return (
    <div className="w-full">
      <Header />
      <div>
        {/* <img
        src="/circle-scatter-haikei.svg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover opacity-15 pointer-events-none select-none"
      /> */}
        <Hero />
        <WhyChooseSection />
      </div>
      <ProgramsSection />
      <PricingPlansSection />
      <TestimonialsSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Home;
