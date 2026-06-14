/**
 * Seed script — populates the Sanity dataset with all home page content
 * matching the existing client-nexa-academy site.
 *
 * Usage:
 *   SANITY_WRITE_TOKEN=<token> node scripts/seed.mjs
 *
 * Get a write token:
 *   sanity.io/manage → project qg0o7wrr → API → Tokens → Add API token
 *   Set permissions to "Editor" and copy the token.
 *
 * ⚠️  Safe to re-run — uses createOrReplace so nothing is duplicated.
 */

import { createClient } from '@sanity/client'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// Load .env.local without requiring dotenv as a dep
const __dir = dirname(fileURLToPath(import.meta.url))
try {
  const envFile = readFileSync(resolve(__dir, '../.env.local'), 'utf8')
  for (const line of envFile.split('\n')) {
    const [k, ...rest] = line.split('=')
    if (k && !k.startsWith('#') && !process.env[k.trim()]) {
      process.env[k.trim()] = rest.join('=').trim()
    }
  }
} catch { /* .env.local not found — rely on existing env */ }

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'qg0o7wrr'
const DATASET    = process.env.NEXT_PUBLIC_SANITY_DATASET    || 'production'
// Accept either a dedicated write token or the read token (if it has editor permissions)
const TOKEN      = process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_READ_TOKEN

if (!TOKEN) {
  console.error('\n❌  No Sanity token found.')
  console.error('   Add SANITY_WRITE_TOKEN to .env.local or ensure SANITY_API_READ_TOKEN is set.\n')
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset:   DATASET,
  apiVersion: '2024-01-01',
  token: TOKEN,
  useCdn: false,
})

console.log(`\n🌱  Seeding ${PROJECT_ID}/${DATASET}...\n`)

// ─── Helpers ─────────────────────────────────────────────────────────────────

const key = () => Math.random().toString(36).slice(2, 9)

function link(label, url, variant = 'primary', openInNewTab = false) {
  return { _type: 'link', label, url, variant, openInNewTab }
}

function bg(style) {
  return { _type: 'sectionBackground', style }
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

const testimonials = [
  {
    _id: 'testimonial-alice',
    _type: 'testimonial',
    name: 'Alice Kamau',
    role: 'Junior Full-Stack Developer, Safaricom',
    quote: 'Nexa Academy completely changed my career trajectory. Within 6 months of graduating I landed a role at Safaricom. The mentorship and project-based learning made all the difference.',
    rating: 5,
    isActive: true,
    sortOrder: 1,
    programSlug: 'full-stack',
  },
  {
    _id: 'testimonial-brian',
    _type: 'testimonial',
    name: 'Brian Otieno',
    role: 'Cloud Engineer, Kenya Airways',
    quote: 'I came in with zero cloud knowledge. The structured AWS curriculum and weekly mentor check-ins gave me the confidence to pass my certification and transition from IT support.',
    rating: 5,
    isActive: true,
    sortOrder: 2,
    programSlug: 'cloud',
  },
  {
    _id: 'testimonial-cynthia',
    _type: 'testimonial',
    name: 'Cynthia Wanjiku',
    role: 'Frontend Developer, Andela',
    quote: "The cohort model is what sets Nexa apart. You're not studying alone — you have a team, a mentor, and real deadlines. It mirrors exactly how a real dev team operates.",
    rating: 5,
    isActive: true,
    sortOrder: 3,
    programSlug: 'full-stack',
  },
  {
    _id: 'testimonial-david',
    _type: 'testimonial',
    name: 'David Mwangi',
    role: 'DevOps Engineer, Equity Bank',
    quote: 'Flexible payment plans meant I could enrol without waiting to save the full fee. The 2-instalment option worked perfectly for my budget. Best investment I have made.',
    rating: 5,
    isActive: true,
    sortOrder: 4,
    programSlug: 'cloud',
  },
  {
    _id: 'testimonial-esther',
    _type: 'testimonial',
    name: 'Esther Njeri',
    role: 'React Developer, Twiga Foods',
    quote: 'I tried three online platforms before Nexa. Nothing compared to having a dedicated mentor who reviewed my code every week and pushed me past my comfort zone.',
    rating: 5,
    isActive: true,
    sortOrder: 5,
    programSlug: 'full-stack',
  },
]

// ─── FAQs ─────────────────────────────────────────────────────────────────────

const faqs = [
  {
    _id: 'faq-admission',
    _type: 'faq',
    question: 'What are the admission requirements?',
    answer: 'No prior experience is required for beginner programs. For intermediate and advanced tracks, basic knowledge of programming fundamentals is recommended. All applicants go through a short onboarding assessment.',
    category: 'admissions',
    isActive: true,
    sortOrder: 1,
  },
  {
    _id: 'faq-payment',
    _type: 'faq',
    question: 'Do you offer flexible payment options?',
    answer: 'Yes. We offer installment-based payment plans for all programs. You can spread the cost over 3–6 months with zero interest. Reach out to our admissions team to discuss the best plan for you.',
    category: 'pricing',
    isActive: true,
    sortOrder: 2,
  },
  {
    _id: 'faq-support',
    _type: 'faq',
    question: 'What support is available during the program?',
    answer: 'Every student gets access to 1:1 mentorship sessions, a dedicated Slack community, weekly live Q&A calls, and a project reviewer for hands-on assignments.',
    category: 'bootcamp',
    isActive: true,
    sortOrder: 3,
  },
  {
    _id: 'faq-duration',
    _type: 'faq',
    question: 'How long are the programs?',
    answer: 'Full-Stack Development runs for 16 weeks. Cloud Computing runs for 12 weeks. Both are delivered in cohorts with fixed start dates so you can plan ahead.',
    category: 'bootcamp',
    isActive: true,
    sortOrder: 4,
  },
  {
    _id: 'faq-remote',
    _type: 'faq',
    question: 'Can I study remotely?',
    answer: 'Yes — all instruction is delivered online via live sessions and recorded content. You only need a laptop and a reliable internet connection. Students are based across Kenya and the wider East Africa region.',
    category: 'bootcamp',
    isActive: true,
    sortOrder: 5,
  },
  {
    _id: 'faq-certificate',
    _type: 'faq',
    question: 'What certification do I receive?',
    answer: 'You earn a Nexa Academy completion certificate, which is recognised by our hiring partners. Cloud Computing students are also prepared for the AWS Cloud Practitioner or Azure Fundamentals exams.',
    category: 'bootcamp',
    isActive: true,
    sortOrder: 6,
  },
]

// ─── Home page document ───────────────────────────────────────────────────────

const homePage = {
  _id: 'homePage',
  _type: 'homePage',
  title: 'Home Page',
  seo: {
    _type: 'seo',
    title: 'Nexa Academy — Launch Your Tech Career in Kenya',
    description: 'Certified Full-Stack Development and Cloud Computing programs, built for Kenya\'s job market. Join 300+ graduates earning in tech. Apply for the next cohort.',
    noIndex: false,
  },
  sections: [
    // ── 1. Hero ──────────────────────────────────────────────────────────────
    {
      _key: key(),
      _type: 'heroSection',
      isHidden: false,
      background: bg('white'),
      layout: 'split',
      headline: 'Master In-Demand Tech Skills with Industry Certification',
      subheadline: "Join Nexa Academy — Africa's premier tech school offering certified programs in Full-Stack Development and Cloud Computing. Learn from industry experts and launch your tech career.",
      primaryCta: link('Get Started', '/apply', 'primary'),
      secondaryCta: link('Browse Courses', '/programs', 'outline'),
    },

    // ── 2. Stats ─────────────────────────────────────────────────────────────
    {
      _key: key(),
      _type: 'statsSection',
      isHidden: false,
      background: bg('light'),
      layout: 'row',
      stats: [
        { _key: key(), value: '300', suffix: '+', label: 'Graduates', description: 'and growing every cohort' },
        { _key: key(), value: '4.9', suffix: '/5', label: 'Student Rating', description: 'average across all cohorts' },
        { _key: key(), value: '95', suffix: '%', label: 'Success Rate', description: 'land a tech role within 6 months' },
      ],
    },

    // ── 3. Features — Why Choose ─────────────────────────────────────────────
    {
      _key: key(),
      _type: 'featuresSection',
      isHidden: false,
      background: bg('white'),
      sectionTitle: 'Why Choose Nexa Academy',
      sectionSubtitle: "We're building a structured, mentor-led path from fundamentals to job-ready engineering skills.",
      layout: 'grid',
      columns: 3,
      features: [
        {
          _key: key(),
          iconName: 'GraduationCap',
          title: 'Industry-Certified Curriculum',
          description: 'Programs built with hiring partners — every module maps to a real job requirement.',
        },
        {
          _key: key(),
          iconName: 'Users',
          title: 'Mentor-Led Learning',
          description: 'Weekly 1:1 mentorship sessions, live Q&A calls, and a dedicated Slack community.',
        },
        {
          _key: key(),
          iconName: 'Briefcase',
          title: 'Career Outcomes',
          description: '95% of graduates land a tech role within 6 months — backed by our job-placement support.',
        },
      ],
    },

    // ── 4. Features — Learning Journey ───────────────────────────────────────
    {
      _key: key(),
      _type: 'featuresSection',
      isHidden: false,
      background: bg('light'),
      sectionTitle: 'Your Learning Journey',
      sectionSubtitle: 'Follow a practical, mentor-guided roadmap from beginner foundations to job-ready project delivery.',
      layout: 'list',
      columns: 4,
      features: [
        {
          _key: key(),
          iconName: 'BookOpen',
          title: 'Learn the Fundamentals',
          description: 'Build a solid foundation in programming logic, data structures, and core web technologies.',
        },
        {
          _key: key(),
          iconName: 'Code2',
          title: 'Build Real Projects',
          description: 'Apply your skills on hands-on capstone projects that go straight into your portfolio.',
        },
        {
          _key: key(),
          iconName: 'Users',
          title: 'Get Mentored',
          description: 'Weekly sessions with industry mentors who review your work and fast-track your growth.',
        },
        {
          _key: key(),
          iconName: 'Rocket',
          title: 'Land Your First Role',
          description: 'Graduate with a portfolio, a certificate, and direct introductions to our hiring partners.',
        },
      ],
    },

    // ── 5. Programs (API-driven) ──────────────────────────────────────────────
    {
      _key: key(),
      _type: 'programsSection',
      isHidden: false,
      background: bg('white'),
      badge: 'Our Courses',
      sectionTitle: 'Programs Built for the Job Market',
      layout: 'cards',
      ctaLabel: 'Apply Now',
    },

    // ── 6. Pricing ───────────────────────────────────────────────────────────
    {
      _key: key(),
      _type: 'pricingSection',
      isHidden: false,
      background: bg('light'),
      sectionTitle: 'Payment plans',
      sectionSubtitle: 'Pay upfront for the best rate, or spread the cost into 2 or 3 easy instalments.',
      plans: [
        {
          _key: key(),
          name: 'One-time payment',
          price: 'Pay once',
          description: 'Best if you prefer a single upfront payment and save on admin fees.',
          isPopular: true,
          cta: link('View calculator', '/programs?plan=one-time#finance-calculator', 'primary'),
          features: [
            { _key: key(), text: 'Full course fee paid upfront', included: true },
            { _key: key(), text: 'No instalment surcharge', included: true },
            { _key: key(), text: 'Priority enrollment processing', included: true },
          ],
        },
        {
          _key: key(),
          name: '2-instalment plan',
          price: 'Split into 2 payments',
          description: 'Pay half up front and the remainder before course start — flexible and popular.',
          isPopular: false,
          cta: link('View calculator', '/programs?plan=2-installments#finance-calculator', 'outline'),
          features: [
            { _key: key(), text: '10% surcharge on total fee', included: true },
            { _key: key(), text: '2 equal payments', included: true },
            { _key: key(), text: 'Suitable when you need time to budget', included: true },
          ],
        },
        {
          _key: key(),
          name: '3-instalment plan',
          price: 'Split into 3 payments',
          description: 'Spread the cost over three equal payments for maximum flexibility.',
          isPopular: false,
          cta: link('View calculator', '/programs?plan=3-installments#finance-calculator', 'outline'),
          features: [
            { _key: key(), text: '20% surcharge on total fee', included: true },
            { _key: key(), text: '3 equal payments', included: true },
            { _key: key(), text: 'Ideal for longer budget planning', included: true },
          ],
        },
      ],
    },

    // ── 7. Testimonials ──────────────────────────────────────────────────────
    {
      _key: key(),
      _type: 'testimonialsSection',
      isHidden: false,
      background: bg('light'),
      sectionTitle: 'Hear From Our Graduates',
      sectionSubtitle: 'Thousands of students have launched careers with Nexa Academy.',
      layout: 'grid',
      testimonials: testimonials.map(t => ({
        _key: key(),
        _type: 'reference',
        _ref: t._id,
      })),
    },

    // ── 8. FAQ ───────────────────────────────────────────────────────────────
    {
      _key: key(),
      _type: 'faqSection',
      isHidden: false,
      background: bg('white'),
      sectionTitle: 'Questions you might have',
      sectionSubtitle: 'Clear answers before you commit.',
      faqs: faqs.slice(0, 6).map(f => ({
        _key: key(),
        _type: 'reference',
        _ref: f._id,
      })),
    },

    // ── 9. CTA ───────────────────────────────────────────────────────────────
    {
      _key: key(),
      _type: 'ctaSection',
      isHidden: false,
      background: bg('primary'),
      headline: 'Ready To Become Job-Ready?',
      subheadline: 'Join a cohort built for outcomes and start your transition into high-impact tech roles.',
      primaryCta: link('Apply Now', 'https://admissions.nexaacademy.co.ke', 'primary', true),
    },
  ],
}

// ─── Navigation ───────────────────────────────────────────────────────────────

const navigation = {
  _id: 'navigation',
  _type: 'navigation',
  items: [
    { _key: key(), label: 'Programs', url: '/programs' },
    { _key: key(), label: 'FAQ', url: '/faq' },
    { _key: key(), label: 'Blog', url: '/blog' },
    { _key: key(), label: 'Contact', url: '/contact' },
  ],
  ctaButton: link('Apply Now', 'https://admissions.nexaacademy.co.ke', 'primary', true),
}

// ─── Footer ───────────────────────────────────────────────────────────────────

const footer = {
  _id: 'footer',
  _type: 'footer',
  tagline: "Kenya's premier coding bootcamp. Launch your tech career.",
  copyrightText: '© {year} Nexa Academy. All rights reserved.',
  columns: [
    {
      _key: key(),
      heading: 'Programs',
      links: [
        { _key: key(), _type: 'link', label: 'Full-Stack Development', url: '/programs/full-stack' },
        { _key: key(), _type: 'link', label: 'Cloud Computing', url: '/programs/cloud' },
      ],
    },
    {
      _key: key(),
      heading: 'Company',
      links: [
        { _key: key(), _type: 'link', label: 'About', url: '/about' },
        { _key: key(), _type: 'link', label: 'Blog', url: '/blog' },
        { _key: key(), _type: 'link', label: 'Careers', url: '/careers' },
        { _key: key(), _type: 'link', label: 'Contact', url: '/contact' },
      ],
    },
    {
      _key: key(),
      heading: 'Legal',
      links: [
        { _key: key(), _type: 'link', label: 'Privacy Policy', url: '/privacy' },
        { _key: key(), _type: 'link', label: 'Terms of Service', url: '/terms' },
      ],
    },
  ],
  socialLinks: [
    { _key: key(), platform: 'twitter',   url: 'https://twitter.com/nexaacademy' },
    { _key: key(), platform: 'linkedin',  url: 'https://linkedin.com/company/nexaacademy' },
    { _key: key(), platform: 'instagram', url: 'https://instagram.com/nexaacademy' },
    { _key: key(), platform: 'youtube',   url: 'https://youtube.com/@nexaacademy' },
  ],
  bottomLinks: [
    { _key: key(), _type: 'link', label: 'Privacy Policy', url: '/privacy' },
    { _key: key(), _type: 'link', label: 'Terms of Service', url: '/terms' },
  ],
}

// ─── Site settings ────────────────────────────────────────────────────────────

const siteSettings = {
  _id: 'siteSettings',
  _type: 'siteSettings',
  siteName: 'Nexa Academy',
  logoText: 'Nexa Academy',
  contactEmail: 'admissions@nexaacademy.co.ke',
  defaultSeo: {
    _type: 'seo',
    title: 'Nexa Academy — Launch Your Tech Career in Kenya',
    description: "Certified Full-Stack Development and Cloud Computing programs, built for Kenya's job market. Join 300+ graduates earning in tech. Apply for the next cohort.",
    noIndex: false,
  },
  socialLinks: [
    { _key: key(), platform: 'twitter',   url: 'https://twitter.com/nexaacademy' },
    { _key: key(), platform: 'linkedin',  url: 'https://linkedin.com/company/nexaacademy' },
    { _key: key(), platform: 'instagram', url: 'https://instagram.com/nexaacademy' },
  ],
}

// ─── Write all documents ──────────────────────────────────────────────────────

async function seed() {
  const tx = client.transaction()

  // Testimonials first (homePage references them)
  for (const t of testimonials) {
    tx.createOrReplace(t)
  }
  console.log(`  ✓  ${testimonials.length} testimonials`)

  // FAQs
  for (const f of faqs) {
    tx.createOrReplace(f)
  }
  console.log(`  ✓  ${faqs.length} FAQs`)

  // Singletons
  tx.createOrReplace(siteSettings)
  tx.createOrReplace(navigation)
  tx.createOrReplace(footer)
  tx.createOrReplace(homePage)
  console.log('  ✓  siteSettings, navigation, footer, homePage')

  await tx.commit({ visibility: 'sync' })
  console.log('\n✅  Seed complete. Open http://localhost:3001 to see the result.\n')
}

seed().catch((err) => {
  console.error('\n❌  Seed failed:', err.message)
  process.exit(1)
})
