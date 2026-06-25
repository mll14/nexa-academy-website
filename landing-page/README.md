# Nexa Academy — Landing Page

> Public-facing marketing and application site. Built with Next.js 15 (App Router), React 19, Tailwind CSS, and Sanity CMS.

**Live:** [nexaacademy.co.ke](https://nexaacademy.co.ke)

---

## Overview

The landing page is the public entry point for Nexa Academy. It covers:

- Program listings and detailed program pages (curriculum, pricing, intakes, testimonials)
- Multi-step application form with ReCaptcha, draft-saving, and fee preview
- Blog with rich content blocks (code, video, quiz, downloadable resources, math)
- Appointment booking for orientation calls
- FAQ, contact, and legal pages
- AI-powered admissions chatbot (Gemini RAG)

Content is managed entirely through Sanity CMS — no code deploys needed for copy, program info, team bios, blog posts, or section visibility.

---

## Tech Stack

| Library | Purpose |
|---|---|
| [Next.js 15](https://nextjs.org) | App Router, React Server Components, Edge Runtime |
| [React 19](https://react.dev) | UI framework |
| [Tailwind CSS v3](https://tailwindcss.com) | Utility-first styling |
| [Sanity v3](https://sanity.io) | Headless CMS — content, images, structured data |
| [next-sanity](https://github.com/sanity-io/next-sanity) | Sanity client with ISR tag-based revalidation |
| [@portabletext/react](https://github.com/portabletext/react-portabletext) | Rich-text rendering |
| [react-google-recaptcha-v3](https://github.com/t49tran/react-google-recaptcha-v3) | ReCaptcha v3 on application form |
| [react-phone-number-input](https://gitlab.com/catamphetamine/react-phone-number-input) | International phone field |
| [react-hot-toast](https://react-hot-toast.com) | Toast notifications |
| [lucide-react](https://lucide.dev) | Icons |

---

## Project Structure

```
landing-page/
├── app/
│   ├── layout.tsx              # Root layout (fonts, metadata)
│   ├── icon.tsx                # Programmatic favicon
│   ├── robots.ts               # robots.txt generation
│   ├── sitemap.ts              # XML sitemap generation
│   └── (site)/
│       ├── layout.tsx          # Site shell — Header, Footer, ChatWidget
│       ├── error.tsx           # Route-level error boundary
│       ├── page.tsx            # Homepage (Section-renderer driven)
│       ├── apply/              # Multi-step application form
│       ├── appointments/       # Appointment booking
│       ├── blog/               # Blog listing + [slug] post pages
│       ├── contact/            # Contact form
│       ├── faq/                # FAQ accordion
│       ├── programs/           # Program listing + [slug] detail pages
│       └── legal/              # Terms & privacy
├── components/
│   ├── layout/                 # Header, Footer, MobileNav, AnnouncementBar, NewsletterForm
│   ├── sections/               # CMS-driven section components + SectionRenderer
│   ├── blog/                   # Blog body, cards, TableOfContents, filter
│   ├── chatbot/                # ChatWidget (AI admissions assistant)
│   ├── application/            # Form field primitives, ReCaptcha provider, SuccessScreen
│   ├── programs/               # FinanceCalculator
│   ├── contact/                # ContactForm, ContactSidebar
│   ├── shared/                 # PortableTextRenderer, MarkdownRenderer, SanityImage,
│   │                           # SectionErrorBoundary
│   └── ui/                     # Primitives (Button, Card, Input, Tabs, Accordion…)
├── lib/
│   ├── sanity/                 # client (React.cache deduplication), queries, image helpers
│   ├── api/                    # REST clients — programs, intakes, applications
│   └── seo.ts                  # buildMetadata + JSON-LD helpers
├── sanity/                     # Sanity schema definitions
├── types/                      # Shared TypeScript interfaces
└── next.config.ts
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- A [Sanity](https://sanity.io) project (free tier works)
- Running `server-nexa-website` API (or point at the live API)

### Installation

```bash
npm install
```

### Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```env
# Sanity
NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_READ_TOKEN=your-read-token

# API
NEXT_PUBLIC_API_BASE_URL=https://api.nexaacademy.co.ke

# Site
NEXT_PUBLIC_SITE_URL=https://nexaacademy.co.ke

# ReCaptcha
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-site-key
```

### Development

```bash
npm run dev     # http://localhost:3000
```

### Sanity Studio

The Sanity Studio is deployed separately at [nexaacademy.sanity.studio](https://nexaacademy.sanity.studio). To run it locally:

```bash
npx sanity dev
```

### Build & Type Check

```bash
npm run build
npx tsc --noEmit
```

---

## Content Management

All page content is managed in Sanity. CMS-driven pages use a **Section Renderer** pattern — each page is an ordered list of typed sections (`heroSection`, `programsSection`, `faqSection`, etc.) that `SectionRenderer` maps to React components. To add, reorder, or hide a section, edit the document in Sanity Studio — no code change required.

### Adding a New Section Type

1. Define the schema in `sanity/schemas/`
2. Create the component in `components/sections/`
3. Register it in `components/sections/SectionRenderer.tsx`
4. Add the TypeScript type in `types/index.ts`

---

## Performance Notes

- **Edge Runtime** on all dynamic routes (`export const runtime = 'edge'`)
- **`React.cache`** wraps `sanityFetch` — identical CMS queries within a single request (e.g. `generateMetadata` + page component) are deduplicated to one network call
- **`next/dynamic`** for heavy sections — VideoSection, GallerySection, FinanceCalculatorSection, AppointmentFormSection, and ApplicationSection load only when present on the page
- **`optimizePackageImports: ['lucide-react']`** in `next.config.ts`
- **`SectionErrorBoundary`** per section — a broken CMS section is silently skipped in production; labeled in dev mode

---

## Deployment

Deployed to **Cloudflare Pages** via Git integration.

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Build output | `.next` |
| Node version | 20 |

Set all environment variables in the Cloudflare Pages project dashboard.

### ISR Revalidation

Content updates in Sanity trigger tag-based revalidation via Sanity webhooks → Next.js `revalidateTag`. Each document type carries a tag (`homePage`, `program:slug`, `siteSettings`, etc.) so only affected pages are purged.
