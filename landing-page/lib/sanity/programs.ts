import { groq } from 'next-sanity'
import { sanityFetch } from './client'
import type { SanityProgram } from '@/types'

const programFragment = groq`
  _id,
  name,
  "slug": slug.current,
  order,
  price,
  originalPrice,
  durationMonths,
  heroSubtitle,
  heroImage { ..., asset-> },
  heroIcon { ..., asset-> },
  syllabusUrl,
  overviewTitle,
  overviewSubtitle,
  overviewBody,
  salaryRanges[] { stage, kenyaRange, globalRange },
  faqItems[] { question, answer[] { ..., markDefs[] { ..., _type == "link" => { href, openInNewTab } } } },
  curriculumTitle,
  curriculumSubtitle,
  modules[] { title, description[] { ..., markDefs[] { ..., _type == "link" => { href, openInNewTab } } }, isBonus },
  ctaTitle,
  ctaSubtitle,
  ctaButtonText,
  paymentNote,
  paymentPlans[] { title, description, badge },
  includedItems,
  impactLabel,
  impactTitle,
  impactSubtitle,
  impactMetrics[] { value, label, description },
  testimonialsHidden,
  testimonialsTitle,
  testimonialsSubtitle,
  testimonials[]-> { _id, name, role, company, quote, rating, avatar { ..., asset-> }, avatarUrl },
  differentiatorTitle,
  differentiators[] { number, title, body[] { ..., markDefs[] { ... } } },
  seo { title, description, ogImage, noIndex }
`

export async function getSanityProgram(slug: string): Promise<SanityProgram | null> {
  return sanityFetch<SanityProgram | null>({
    query: groq`*[_type == "program" && slug.current == $slug][0] { ${programFragment} }`,
    params: { slug },
    tags: [`program:${slug}`],
  })
}

export async function getAllSanityPrograms(): Promise<SanityProgram[]> {
  const result = await sanityFetch<SanityProgram[]>({
    query: groq`*[_type == "program"] | order(order asc, name asc) { ${programFragment} }`,
    tags: ['programs'],
  })
  return result ?? []
}
