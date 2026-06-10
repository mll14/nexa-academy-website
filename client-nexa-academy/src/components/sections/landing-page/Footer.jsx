import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { programs } from "@/data/programs";
import { Send, Mail, Phone, MapPin } from "lucide-react";
import {
  FaFacebookF,
  FaTwitter,
  FaLinkedinIn,
  FaInstagram,
  FaGithub,
} from "react-icons/fa";
import contentService from "@/services/contentService";

const defaultQuickLinks = [
  { label: "Home", href: "/" },
  { label: "Programs", href: "/programs" },
  { label: "Apply Now", href: "/apply" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact Us", href: "/contact" },
];

const iconMap = {
  facebook: FaFacebookF,
  twitter: FaTwitter,
  linkedin: FaLinkedinIn,
  instagram: FaInstagram,
  github: FaGithub,
};

const defaultSocials = [
  { icon: FaFacebookF, href: "#", label: "Facebook" },
  { icon: FaTwitter, href: "#", label: "Twitter" },
  { icon: FaLinkedinIn, href: "#", label: "LinkedIn" },
  { icon: FaInstagram, href: "#", label: "Instagram" },
  { icon: FaGithub, href: "#", label: "GitHub" },
];

export function Footer() {
  const [email, setEmail] = useState("");
  const [footerData, setFooterData] = useState(null);

  useEffect(() => {
    contentService.getFooter().then(({ data }) => {
      if (data && (data.columns?.length || data.social_links?.length || data.copyright_text)) {
        setFooterData(data);
      }
    });
  }, []);

  // newsletter subscription state
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState(""); // 'success' | 'error'

  const handleSubscribe = async (e) => {
    e.preventDefault();

    // basic validation
    if (!email || !email.includes("@")) {
      setStatusType("error");
      setStatusMessage("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setStatusMessage("");
    setStatusType("");

    try {
      const { default: newsletterService } =
        await import("../../../services/newsletterService");

      const res = await newsletterService.subscribe(email);

      if (res && res.success) {
        setStatusType("success");
        setStatusMessage(res.message || "Subscribed successfully.");
        setEmail("");
        // clear success message after a short delay
        setTimeout(() => {
          setStatusMessage("");
          setStatusType("");
        }, 5000);
      } else {
        setStatusType("error");
        setStatusMessage(res.error || res.message || "Subscription failed.");
      }
    } catch (err) {
      setStatusType("error");
      setStatusMessage(err?.message || "Subscription failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer
      className="w-full"
      style={{
        background: "linear-gradient(135deg, #0d1b2a 0%, #1a2a3a 100%)",
      }}
    >
      {/* Main Footer */}
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
          {/* Brand */}
          <div className="space-y-5 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <img
                src="/nexa-academy-small-logo.png"
                alt="Nexa Academy"
                className="w-10 h-10 rounded-md object-contain bg-white"
              />
              <Link to="/" className="text-lg font-semibold text-white ml-2">
                Nexa Academy
              </Link>
            </div>

            <p className="text-sm text-white/60 leading-relaxed max-w-xs">
              Empowering the next generation of African tech talent through
              industry-relevant education and certification.
            </p>

            <div className="flex items-center gap-2.5">
              {(footerData?.social_links?.length
                ? footerData.social_links.map((s) => ({
                    icon: iconMap[s.platform] || FaGithub,
                    href: s.url,
                    label: s.platform,
                  }))
                : defaultSocials
              ).map(({ icon, href, label }) => {
                const SocialIcon = icon;
                return (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    className="w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center text-white/50 hover:text-primary hover:border-primary transition-colors"
                  >
                    <SocialIcon className="w-3.5 h-3.5" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-5">
            <h4 className="text-xs font-bold tracking-widest text-white/50 uppercase">
              Quick Links
            </h4>
            <ul className="space-y-3">
              {(footerData?.columns?.[0]?.links?.length
                ? footerData.columns[0].links.map((l) => ({ label: l.label, href: l.url }))
                : defaultQuickLinks
              ).map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-white/70 hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Our Programs */}
          <div className="space-y-5">
            <h4 className="text-xs font-bold tracking-widest text-white/50 uppercase">
              Our Programs
            </h4>
            <ul className="space-y-3">
              {programs.map((p) => (
                <li key={p.slug}>
                  <Link
                    to={`/programs/${p.slug}`}
                    className="text-sm text-white/70 hover:text-primary transition-colors"
                  >
                    {p.title ? p.title.replace(" (Coming Soon)", "") : p.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact + Newsletter */}
          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-xs font-bold tracking-widest text-white/50 uppercase">
                Contact Us
              </h4>
              <ul className="space-y-3">
                {[
                  { icon: Mail, text: "info@nexaacademy.co.ke" },
                  { icon: Phone, text: "+254713067311" },
                  { icon: MapPin, text: "10th Floor, JKUAT Towers, CBD Nairobi" },
                ].map(({ icon, text }) => {
                  const IconComponent = icon;
                  return (
                    <li key={text} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                        <IconComponent className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="text-sm text-white/70">{text}</span>
                    </li>
                  );
                })}
              </ul>
              <Link
                to="/contact"
                className="inline-block text-sm font-semibold text-primary hover:underline"
              >
                Send us a message
              </Link>
            </div>

            {/* Newsletter */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-white">
                Subscribe to Newsletter
              </p>
              <form onSubmit={handleSubscribe} className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email"
                  required
                  disabled={loading}
                  className="w-full rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 px-4 py-2.5 pr-12 outline-none focus:border-primary transition-colors disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-md bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-60"
                  aria-busy={loading}
                >
                  <Send className="w-3.5 h-3.5 text-white" />
                </button>
              </form>

              {statusMessage ? (
                <p
                  className={`text-xs mt-2 ${
                    statusType === "success"
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }`}
                >
                  {statusMessage}
                </p>
              ) : (
                <p className="text-xs text-white/40">
                  Get updates on new Programs and tech news
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-center gap-3 text-xs text-white">
          <p className="text-sm text-white capitalize">
            {footerData?.copyright_text || '© 2026 Nexa Academy'}
          </p>
          <span className="text-white/20">|</span>
          <p className="text-xs text-white capitalize">all rights reserved</p>
          <span className="text-white/20">|</span>

          <div className="flex items-center gap-4">
            <Link
              to="/privacy"
              className="hover:text-primary transition-colors"
            >
              Privacy Policy
            </Link>
            <span className="text-white/20">|</span>
            <Link to="/terms" className="hover:text-primary transition-colors">
              Terms &amp; Conditions
            </Link>
            <span className="text-white/20">|</span>
            <Link
              to="/student-login"
              className="hover:text-primary transition-colors"
            >
              Student Login
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
