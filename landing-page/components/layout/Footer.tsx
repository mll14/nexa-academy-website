import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";
import {
  FaFacebookF,
  FaTwitter,
  FaLinkedinIn,
  FaInstagram,
  FaYoutube,
  FaGithub,
  FaTiktok,
} from "react-icons/fa";
import { SanityImage } from "@/components/shared/SanityImage";
import { NewsletterForm } from "./NewsletterForm";
import type { Footer as FooterType, SiteSettings, SanityProgram } from "@/types";

const socialIconMap: Record<string, React.ElementType> = {
  facebook: FaFacebookF,
  twitter: FaTwitter,
  linkedin: FaLinkedinIn,
  instagram: FaInstagram,
  youtube: FaYoutube,
  github: FaGithub,
  tiktok: FaTiktok,
};

interface FooterProps {
  footer: FooterType | null;
  settings: SiteSettings | null;
  programs?: SanityProgram[];
}

export function Footer({ footer, settings, programs }: FooterProps) {
  const year = new Date().getFullYear();
  const copyright =
    footer?.copyrightText?.replace("{year}", String(year)) ??
    `© ${year} Nexa Academy`;

  const socials = footer?.socialLinks?.length
    ? footer.socialLinks
    : (settings?.socialLinks ?? []);

  return (
    <footer
      className="w-full"
      style={{
        background: "linear-gradient(135deg, #0d1b2a 0%, #1a2a3a 100%)",
      }}
    >
      {/* Main grid */}
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-16 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8 w-full">
          {/* ── Brand column ── */}
          <div className="space-y-5 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              {settings?.logo?.asset ? (
                <SanityImage
                  image={settings.logo}
                  alt={settings.siteName ?? "Nexa Academy"}
                  width={40}
                  height={40}
                  className="w-10 h-10 object-contain rounded-md bg-white p-0.5"
                />
              ) : (
                <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center text-white font-bold text-sm">
                  N
                </div>
              )}
              <span className="text-lg font-semibold text-white">
                {settings?.siteName ?? "Nexa Academy"}
              </span>
            </div>

            <p className="text-sm text-white/60 leading-relaxed max-w-xs">
              {footer?.tagline ??
                "Empowering the next generation of African tech talent through industry-relevant education and certification."}
            </p>

            {socials.length > 0 && (
              <div className="flex items-center gap-2.5">
                {socials.map((s, i) => {
                  const Icon = socialIconMap[s.platform];
                  return (
                    <a
                      key={i}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.platform}
                      className="w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center text-white/50 hover:text-primary hover:border-primary transition-colors"
                    >
                      {Icon ? (
                        <Icon className="w-3.5 h-3.5" />
                      ) : (
                        <span className="text-[10px] font-bold">
                          {s.platform.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Link columns from Sanity ── */}
          {footer?.columns?.slice(0, 1).map((col, i) => (
            <div key={i} className="space-y-5">
              <h4 className="text-xs font-bold tracking-widest text-white/50 uppercase">
                {col.heading}
              </h4>
              <ul className="space-y-3">
                {col.links?.map((link, j) => (
                  <li key={j}>
                    <Link
                      href={link.url}
                      target={link.openInNewTab ? "_blank" : undefined}
                      className="text-sm text-white/70 hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* ── Our Programs column ── */}
          {programs && programs.length > 0 && (
            <div className="space-y-5">
              <h4 className="text-xs font-bold tracking-widest text-white/50 uppercase">
                Our Programs
              </h4>
              <ul className="space-y-3">
                {programs.map((p) => (
                  <li key={p._id}>
                    <Link
                      href={`/programs/${p.slug}`}
                      className="text-sm text-white/70 hover:text-primary transition-colors"
                    >
                      {p.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Contact + Newsletter column ── */}
          <div className="space-y-6">
            {(settings?.contactEmail ||
              settings?.contactPhone ||
              settings?.address) && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold tracking-widest text-white/50 uppercase">
                  Contact Us
                </h4>
                <ul className="space-y-3">
                  {settings?.contactEmail && (
                    <li className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                        <Mail className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="text-sm text-white/70">
                        {settings.contactEmail}
                      </span>
                    </li>
                  )}
                  {settings?.contactPhone && (
                    <li className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                        <Phone className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="text-sm text-white/70">
                        {settings.contactPhone}
                      </span>
                    </li>
                  )}
                  {settings?.address && (
                    <li className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="text-sm text-white/70">
                        {settings.address}
                      </span>
                    </li>
                  )}
                </ul>
                <Link
                  href="/contact"
                  className="inline-block text-sm font-semibold text-primary hover:underline"
                >
                  Send us a message
                </Link>
              </div>
            )}

            <NewsletterForm />
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="border-t border-white/10">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-16 py-5 flex flex-col sm:flex-row items-center justify-center gap-3 text-xs text-white">
          <p className="text-sm text-white">{copyright}</p>
          <span className="text-white/20 hidden sm:inline">|</span>
          <p className="text-xs text-white/60">All rights reserved</p>
          <span className="text-white/20 hidden sm:inline">|</span>
          <div className="flex items-center gap-4">
            {footer?.bottomLinks?.length ? (
              footer.bottomLinks.map((link, i) => (
                <Link
                  key={i}
                  href={link.url}
                  target={link.openInNewTab ? "_blank" : undefined}
                  className="hover:text-primary transition-colors"
                >
                  {link.label}
                </Link>
              ))
            ) : (
              <>
                <Link
                  href="/privacy"
                  className="hover:text-primary transition-colors"
                >
                  Privacy Policy
                </Link>
                <span className="text-white/20">|</span>
                <Link
                  href="/terms"
                  className="hover:text-primary transition-colors"
                >
                  Terms &amp; Conditions
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
