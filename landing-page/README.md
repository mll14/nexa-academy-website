# Nexa Academy — Landing Page

Standalone Next.js 15 + Sanity CMS marketing site for [nexaacademy.co.ke](https://nexaacademy.co.ke).

---

## Quick start

```bash
cd landing-page
cp .env.local.example .env.local   # already done — values below
npm install
npm run dev
```

App → **http://localhost:3001** (or 3000 if free)  
Studio → **http://localhost:3001/studio**

---

## Environment variables (`.env.local`)

```env
NEXT_PUBLIC_SANITY_PROJECT_ID=qg0o7wrr
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_READ_TOKEN=            # optional — only needed for draft preview
SANITY_WEBHOOK_SECRET=            # generate with: openssl rand -hex 32
NEXT_PUBLIC_API_BASE_URL=https://api.nexaacademy.co.ke
NEXT_PUBLIC_ADMISSIONS_URL=https://admissions.nexaacademy.co.ke
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> The app shares the **`production`** Sanity dataset with `client-nexa-academy`.  
> To keep content isolated, create a `landing` dataset at sanity.io/manage and change `NEXT_PUBLIC_SANITY_DATASET=landing`.

---

## First-time Studio setup

1. Open **http://localhost:3001/studio** (takes ~30 s to compile on first load).
2. Log in with your Sanity account — same one used for the existing CMS.
3. The sidebar has:
   - **Home Page** — the singleton that drives the `/` route
   - **Pages** — any additional slug-based pages
   - **Content Library** — Testimonials, FAQs, Partners, Team Members
   - **Settings** → Site Settings, Navigation, Footer

---

## Rebuilding the home page sections

Open **Studio → Home Page**, then click **Add item** inside the *Page Sections* array.  
Add sections in this order to match the existing site exactly.

---

### 1. Hero

**Section type:** `Hero`

| Field | Value |
|---|---|
| Layout | `split` |
| Headline | `Master In-Demand Tech Skills with Industry Certification` |
| Subheadline | `Join Nexa Academy — Africa's premier tech school offering certified programs in Full-Stack Development and Cloud Computing. Learn from industry experts and launch your tech career.` |
| Primary CTA → Label | `Get Started` |
| Primary CTA → URL | `/apply` |
| Primary CTA → Variant | `primary` |
| Secondary CTA → Label | `Browse Courses` |
| Secondary CTA → URL | `/programs` |
| Secondary CTA → Variant | `outline` |
| Image | Upload `/public/hero-img.jpg` from client-nexa-academy |
| Background | `white` |

---

### 2. Stats

**Section type:** `Stats`

| Field | Value |
|---|---|
| Layout | `row` |
| Background | `light` |

Add 3 stats:

| Value | Suffix | Label |
|---|---|---|
| `300` | `+` | `Graduates` |
| `4.9` | `/5` | `Student Rating` |
| `95` | `%` | `Success Rate` |

---

### 3. Features — "Why Choose Nexa Academy"

**Section type:** `Features`

| Field | Value |
|---|---|
| Badge | *(leave blank)* |
| Title | `Why Choose Nexa Academy` |
| Subtitle | `We're building a structured, mentor-led path from fundamentals to job-ready engineering skills.` |
| Layout | `grid` |
| Columns | `3` |
| Background | `white` |

Add 3 features:

| Icon | Title | Description |
|---|---|---|
| `GraduationCap` | `Industry-Certified Curriculum` | `Programs built with hiring partners — every module maps to a real job requirement.` |
| `Users` | `Mentor-Led Learning` | `Weekly 1:1 mentorship sessions, live Q&A calls, and a dedicated Slack community.` |
| `Briefcase` | `Career Outcomes` | `95% of graduates land a tech role within 6 months — backed by our job-placement support.` |

> Icon names are Lucide icons (PascalCase). Find more at lucide.dev.

---

### 4. Features — "Your Learning Journey"

**Section type:** `Features`

| Field | Value |
|---|---|
| Title | `Your Learning Journey` |
| Subtitle | `Follow a practical, mentor-guided roadmap from beginner foundations to job-ready project delivery.` |
| Layout | `list` |
| Background | `light` |

Add 4 steps:

| Icon | Title | Description |
|---|---|---|
| `BookOpen` | `Learn the Fundamentals` | `Build a solid foundation in programming logic, data structures, and core web technologies.` |
| `Code2` | `Build Real Projects` | `Apply your skills on hands-on capstone projects that go straight into your portfolio.` |
| `Users` | `Get Mentored` | `Weekly sessions with industry mentors who review your work and fast-track your growth.` |
| `Rocket` | `Land Your First Role` | `Graduate with a portfolio, a certificate, and direct introductions to our hiring partners.` |

---

### 5. Programs

**Section type:** `Programs (API)`

| Field | Value |
|---|---|
| Badge | `Our Courses` |
| Title | `Programs Built for the Job Market` |
| Layout | `cards` |
| CTA button label | `Apply Now` |
| Background | `white` |

> Program cards are pulled live from `api.nexaacademy.co.ke` — no manual data entry needed.

---

### 6. Pricing

**Section type:** `Pricing`

| Field | Value |
|---|---|
| Title | `Payment plans` |
| Subtitle | `Pay upfront for the best rate, or spread the cost into 2 or 3 easy instalments.` |
| Background | `light` |

Add 3 plans:

**Plan 1**
| Field | Value |
|---|---|
| Name | `One-time payment` |
| Price | `Pay once` |
| Description | `Best if you prefer a single upfront payment and save on admin fees.` |
| Is Popular | ✓ (checked) |
| CTA Label | `View calculator` |
| CTA URL | `/programs?plan=one-time#finance-calculator` |

Features (all included ✓):
- `Full course fee paid upfront`
- `No instalment surcharge`
- `Priority enrollment processing`

**Plan 2**
| Field | Value |
|---|---|
| Name | `2-instalment plan` |
| Price | `Split into 2 payments` |
| Description | `Pay half up front and the remainder before course start — flexible and popular.` |
| Is Popular | ☐ (unchecked) |
| CTA Label | `View calculator` |
| CTA URL | `/programs?plan=2-installments#finance-calculator` |

Features (all included ✓):
- `10% surcharge on total fee`
- `2 equal payments`
- `Suitable when you need time to budget`

**Plan 3**
| Field | Value |
|---|---|
| Name | `3-instalment plan` |
| Price | `Split into 3 payments` |
| Description | `Spread the cost over three equal payments for maximum flexibility.` |
| Is Popular | ☐ (unchecked) |
| CTA Label | `View calculator` |
| CTA URL | `/programs?plan=3-installments#finance-calculator` |

Features (all included ✓):
- `20% surcharge on total fee`
- `3 equal payments`
- `Ideal for longer budget planning`

---

### 7. Testimonials

**Section type:** `Testimonials`

| Field | Value |
|---|---|
| Title | `Hear From Our Graduates` |
| Subtitle | `Thousands of students have launched careers with Nexa Academy.` |
| Layout | `grid` |
| Background | `light` |

First, create each testimonial in **Studio → Content Library → Testimonials**, then reference them here.

To add testimonials from the existing CMS, run this one-time query in **Studio → Vision**:
```groq
*[_type == "testimonial"]{ name, role, quote, rating }
```
Then recreate each record in the new dataset.

---

### 8. FAQ

**Section type:** `FAQ`

| Field | Value |
|---|---|
| Title | `Questions you might have` |
| Subtitle | `Clear answers before you commit.` |
| Background | `white` |

Add these inline FAQs directly in the section (no need for library entries):

| Question | Answer |
|---|---|
| `What are the admission requirements?` | `No prior experience is required for beginner programs. For intermediate and advanced tracks, basic knowledge of programming fundamentals is recommended. All applicants go through a short onboarding assessment.` |
| `Do you offer flexible payment options?` | `Yes. We offer installment-based payment plans for all programs. You can spread the cost over 3–6 months with zero interest. Reach out to our admissions team to discuss the best plan for you.` |
| `What support is available during the Program?` | `Every student gets access to 1:1 mentorship sessions, a dedicated Slack community, weekly live Q&A calls, and a project reviewer for hands-on assignments.` |

---

### 9. CTA

**Section type:** `Call to Action`

| Field | Value |
|---|---|
| Headline | `Ready To Become Job-Ready?` |
| Subheadline | `Join a cohort built for outcomes and start your transition into high-impact tech roles.` |
| Primary CTA → Label | `Apply Now` |
| Primary CTA → URL | `https://admissions.nexaacademy.co.ke` |
| Primary CTA → Variant | `primary` |
| Layout | `centered` |
| Background | `primary` |

---

## Navigation & Footer

### Navigation (Studio → Settings → Navigation)

| Label | URL |
|---|---|
| `Programs` | `/programs` |
| `FAQ` | `/faq` |
| `Blog` | `/blog` |
| `Contact` | `/contact` |

CTA button: Label `Apply Now`, URL `https://admissions.nexaacademy.co.ke`, Variant `primary`

### Footer (Studio → Settings → Footer)

| Field | Value |
|---|---|
| Tagline | `Kenya's premier coding bootcamp. Launch your tech career.` |
| Copyright | `© {year} Nexa Academy. All rights reserved.` |

**Column 1 — Programs**
- Full-Stack Development → `/programs/full-stack`
- Cloud Computing → `/programs/cloud`

**Column 2 — Company**
- About → `/about`
- Blog → `/blog`
- Careers → `/careers`
- Contact → `/contact`

**Column 3 — Legal**
- Privacy Policy → `/privacy`
- Terms of Service → `/terms`

### Site Settings (Studio → Settings → Site Settings)

| Field | Value |
|---|---|
| Site Name | `Nexa Academy` |
| Logo Text | `Nexa Academy` |
| Contact Email | `admissions@nexaacademy.co.ke` |
| Default SEO Title | `Nexa Academy — Kenya's Premier Coding Bootcamp` |
| Default SEO Description | `Learn Full-Stack Development and Cloud Computing with industry experts. Join 300+ graduates who launched tech careers with Nexa Academy.` |

---

## ISR / Cache revalidation

Content changes in Studio publish instantly in dev. In production, Sanity triggers a webhook to `/api/revalidate` to flush the Next.js cache.

Set up the webhook in **sanity.io/manage → your project → API → Webhooks**:
- URL: `https://nexaacademy.co.ke/api/revalidate`
- Trigger on: Create, Update, Delete
- Header: `x-sanity-webhook-secret: <your SANITY_WEBHOOK_SECRET value>`

---

## Project structure

```
landing-page/
├── app/
│   ├── (site)/          # Public routes — wrapped in Header + Footer
│   │   ├── page.tsx     # Home (renders homePage singleton sections)
│   │   └── [slug]/      # Dynamic CMS pages
│   ├── studio/          # Embedded Sanity Studio at /studio
│   └── api/revalidate/  # ISR webhook handler
├── components/
│   ├── layout/          # Header, Footer, MobileNav
│   ├── sections/        # One component per section type + SectionRenderer
│   ├── shared/          # SanityImage, PortableTextRenderer
│   └── ui/              # Button, Badge, Container
├── lib/
│   ├── sanity/          # client.ts, queries.ts, image.ts
│   └── api/             # programs.ts, intakes.ts  (Nexa platform API)
├── sanity/
│   └── schemas/         # All Sanity schema definitions
│       ├── sections/    # 14 section types
│       ├── documents/   # page, testimonial, faq, partner, teamMember, …
│       ├── singletons/  # homePage, navigation, footer, siteSettings
│       └── objects/     # link, seo, blockContent, sectionBackground
├── types/index.ts       # TypeScript types for all Sanity + API data
└── sanity.config.ts     # Studio configuration
```
