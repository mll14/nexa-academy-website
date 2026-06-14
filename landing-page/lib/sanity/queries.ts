import { groq } from 'next-sanity'

// Reusable fragments
const seoFragment = groq`seo { title, description, ogImage { ..., asset-> }, noIndex }`
const linkFragment = groq`{ label, url, openInNewTab, variant }`
const imageFragment = groq`{ ..., asset-> }`
const sectionBaseFragment = groq`sectionId, isHidden, background`

// Section fragments
const heroSectionFragment = groq`
  _type, _key, ${sectionBaseFragment},
  badge, headline, subheadline,
  primaryCta ${linkFragment}, secondaryCta ${linkFragment},
  image ${imageFragment}, videoUrl, layout
`

const statsSectionFragment = groq`
  _type, _key, ${sectionBaseFragment},
  sectionTitle,
  stats[] { value, prefix, suffix, label, description, iconName },
  layout
`

const featuresSectionFragment = groq`
  _type, _key, ${sectionBaseFragment},
  badge, sectionTitle, sectionSubtitle,
  features[] { iconName, title, description, color },
  layout, columns
`

const testimonialsSectionFragment = groq`
  _type, _key, ${sectionBaseFragment},
  badge, sectionTitle, sectionSubtitle,
  testimonials[]->{ _id, name, role, company, quote, rating, avatar ${imageFragment}, avatarUrl, programSlug },
  layout
`

const faqSectionFragment = groq`
  _type, _key, ${sectionBaseFragment},
  badge, sectionTitle,
  faqs[]->{ _id, question, answer, category },
  inlineFaqs[] { question, answer },
  showCategories
`

const ctaSectionFragment = groq`
  _type, _key, ${sectionBaseFragment},
  headline, subheadline, description,
  primaryCta ${linkFragment}, secondaryCta ${linkFragment},
  layout
`

const partnersSectionFragment = groq`
  _type, _key, ${sectionBaseFragment},
  sectionTitle,
  partners[]->{ _id, name, logo ${imageFragment}, website, type },
  layout
`

const programsSectionFragment = groq`
  _type, _key, ${sectionBaseFragment},
  badge, sectionTitle, sectionSubtitle, layout, ctaLabel, ctaUrl,
  ctaTitle, ctaDescription
`

const pricingSectionFragment = groq`
  _type, _key, ${sectionBaseFragment},
  badge, sectionTitle, sectionSubtitle,
  plans[] {
    name, price, period, description,
    features[] { text, included },
    isPopular,
    cta ${linkFragment}
  }
`

const richTextSectionFragment = groq`
  _type, _key, ${sectionBaseFragment},
  content[] { ..., _type == "image" => { ..., asset-> } },
  width
`

const imageTextSectionFragment = groq`
  _type, _key, ${sectionBaseFragment},
  image ${imageFragment}, badge, headline,
  body[] { ..., _type == "image" => { ..., asset-> } },
  bulletPoints[] { text },
  cta ${linkFragment}, imagePosition
`

const contactSectionFragment = groq`
  _type, _key, ${sectionBaseFragment},
  sectionTitle, showForm, email, phone, address, mapEmbedUrl
`

const teamSectionFragment = groq`
  _type, _key, ${sectionBaseFragment},
  badge, sectionTitle,
  members[]->{ _id, name, role, bio, photo ${imageFragment}, linkedinUrl, twitterUrl, department }
`

const videoSectionFragment = groq`
  _type, _key, ${sectionBaseFragment},
  sectionTitle, videoUrl, thumbnail ${imageFragment}, caption
`

const financeCalculatorSectionFragment = groq`
  _type, _key, ${sectionBaseFragment},
  sectionTitle, sectionSubtitle
`

const applicationSectionFragment = groq`
  _type, _key, ${sectionBaseFragment},
  badge, headline, subheadline
`

const legalSectionFragment = groq`
  _type, _key, ${sectionBaseFragment},
  pageTitle, pageSubtitle,
  tabs[] { _key, label, "content": coalesce(content[]{ ..., _type == "image" => { ..., asset-> } }, content) }
`

const allSectionsFragment = groq`
  sections[] {
    _type == "heroSection" => { ${heroSectionFragment} },
    _type == "statsSection" => { ${statsSectionFragment} },
    _type == "featuresSection" => { ${featuresSectionFragment} },
    _type == "testimonialsSection" => { ${testimonialsSectionFragment} },
    _type == "faqSection" => { ${faqSectionFragment} },
    _type == "ctaSection" => { ${ctaSectionFragment} },
    _type == "partnersSection" => { ${partnersSectionFragment} },
    _type == "programsSection" => { ${programsSectionFragment} },
    _type == "pricingSection" => { ${pricingSectionFragment} },
    _type == "richTextSection" => { ${richTextSectionFragment} },
    _type == "imageTextSection" => { ${imageTextSectionFragment} },
    _type == "contactSection" => { ${contactSectionFragment} },
    _type == "teamSection" => { ${teamSectionFragment} },
    _type == "videoSection" => { ${videoSectionFragment} },
    _type == "financeCalculatorSection" => { ${financeCalculatorSectionFragment} },
    _type == "applicationSection" => { ${applicationSectionFragment} },
    _type == "legalSection" => { ${legalSectionFragment} },
  }
`

// Top-level queries
export const homePageQuery = groq`
  *[_type == "homePage"][0] {
    ${seoFragment},
    ${allSectionsFragment}
  }
`

export const pageBySlugQuery = groq`
  *[_type == "page" && slug.current == $slug][0] {
    title, publishedAt,
    ${seoFragment},
    ${allSectionsFragment}
  }
`

export const allPageSlugsQuery = groq`
  *[_type == "page" && defined(slug.current)] { "slug": slug.current }
`

export const navigationQuery = groq`
  *[_type == "navigation"][0] {
    items[] {
      label, url, openInNewTab,
      children[] { label, url, description, openInNewTab }
    },
    ctaButton ${linkFragment},
    admissionsButton ${linkFragment}
  }
`

export const footerQuery = groq`
  *[_type == "footer"][0] {
    tagline, copyrightText,
    columns[] {
      heading,
      links[] ${linkFragment}
    },
    bottomLinks[] ${linkFragment},
    socialLinks[] { platform, url }
  }
`

export const allFaqsQuery = groq`
  *[_type == "faq"] | order(category asc, _createdAt asc) {
    _id, question, answer, category
  }
`

// ── Blog ──────────────────────────────────────────────────────────────────────

export const allBlogPostsQuery = groq`
  *[_type == "blogPost" && defined(publishedAt)] | order(featured desc, publishedAt desc) {
    _id, title,
    "slug": slug.current,
    category, excerpt, readingTime, publishedAt, featured, tags,
    "coverImage": coverImage { ..., asset-> },
    "author": author-> { name, role, "photo": photo { ..., asset-> } }
  }
`

export const blogPostBySlugQuery = groq`
  *[_type == "blogPost" && slug.current == $slug][0] {
    _id, title,
    "slug": slug.current,
    category, excerpt, readingTime, publishedAt, featured, tags,
    "coverImage": coverImage { ..., asset-> },
    "author": author-> {
      name, role, bio, linkedinUrl, twitterUrl,
      "photo": photo { ..., asset-> }
    },
    body[] {
      ...,
      _type == "image" => { ..., asset-> },
      _type == "downloadableResource" => {
        ...,
        "fileUrl": file.asset->url
      }
    },
    "relatedPosts": relatedPosts[]-> {
      _id, title,
      "slug": slug.current,
      category, excerpt, readingTime, publishedAt,
      "coverImage": coverImage { ..., asset-> }
    },
    ${seoFragment}
  }
`

export const allBlogSlugsQuery = groq`
  *[_type == "blogPost" && defined(slug.current)] { "slug": slug.current }
`

export const siteSettingsQuery = groq`
  *[_type == "siteSettings"][0] {
    siteName,
    logo ${imageFragment},
    logoText,
    contactEmail, contactPhone, address, locationUrl, mapEmbedUrl,
    responseTimes[] { label, value },
    whyReach,
    admissionsTimeline[] { label, value },
    whyNexa,
    nextSteps,
    favicon { ..., asset-> },
    defaultSeo { title, description, ogImage { ..., asset-> }, noIndex },
    socialLinks[] { platform, url },
    announcementBar { isActive, text, link ${linkFragment}, style }
  }
`
