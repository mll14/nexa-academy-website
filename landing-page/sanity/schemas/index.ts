// Shared objects
import { linkSchema } from './objects/shared/link'
import { seoSchema } from './objects/shared/seo'
import { blockContentSchema } from './objects/shared/blockContent'
import { sectionBackgroundSchema } from './objects/shared/sectionBackground'

// Blog content blocks
import { codeBlockSchema } from './objects/blog/codeBlock'
import { mathBlockSchema } from './objects/blog/mathBlock'
import { videoEmbedSchema } from './objects/blog/videoEmbed'
import { downloadableResourceSchema } from './objects/blog/downloadableResource'
import { learningObjectivesSchema } from './objects/blog/learningObjectives'
import { instructorNoteSchema } from './objects/blog/instructorNote'
import { blogCtaSchema } from './objects/blog/blogCta'
import { quizBlockSchema } from './objects/blog/quizBlock'
import { notebookEmbedSchema } from './objects/blog/notebookEmbed'
import { blogBodySchema } from './objects/blog/blogBody'

// Section types
import { heroSectionSchema } from './sections/heroSection'
import { statsSectionSchema } from './sections/statsSection'
import { featuresSectionSchema } from './sections/featuresSection'
import { testimonialsSectionSchema } from './sections/testimonialsSection'
import { faqSectionSchema } from './sections/faqSection'
import { ctaSectionSchema } from './sections/ctaSection'
import { partnersSectionSchema } from './sections/partnersSection'
import { programsSectionSchema } from './sections/programsSection'
import { pricingSectionSchema } from './sections/pricingSection'
import { richTextSectionSchema } from './sections/richTextSection'
import { imageTextSectionSchema } from './sections/imageTextSection'
import { contactSectionSchema } from './sections/contactSection'
import { teamSectionSchema } from './sections/teamSection'
import { videoSectionSchema } from './sections/videoSection'
import { financeCalculatorSectionSchema } from './sections/financeCalculatorSection'
import { applicationSectionSchema } from './sections/applicationSection'
import { legalSectionSchema } from './sections/legalSection'

// Documents
import { programSchema } from './documents/program'
import { pageSchema } from './documents/page'
import { testimonialSchema } from './documents/testimonial'
import { faqSchema } from './documents/faq'
import { partnerSchema } from './documents/partner'
import { teamMemberSchema } from './documents/teamMember'
import { blogPostSchema } from './documents/blogPost'
import { eventSchema } from './documents/event'
import { careerSchema } from './documents/career'

// Singletons
import { siteSettingsSchema } from './singletons/siteSettings'
import { navigationSchema } from './singletons/navigation'
import { footerSchema } from './singletons/footer'
import { homePageSchema } from './singletons/homePage'
import { appointmentsPageSchema } from './singletons/appointmentsPage'

export const schemas = [
  // Shared objects
  linkSchema,
  seoSchema,
  blockContentSchema,
  sectionBackgroundSchema,

  // Blog blocks
  codeBlockSchema,
  mathBlockSchema,
  videoEmbedSchema,
  downloadableResourceSchema,
  learningObjectivesSchema,
  instructorNoteSchema,
  blogCtaSchema,
  quizBlockSchema,
  notebookEmbedSchema,
  blogBodySchema,

  // Sections
  heroSectionSchema,
  statsSectionSchema,
  featuresSectionSchema,
  testimonialsSectionSchema,
  faqSectionSchema,
  ctaSectionSchema,
  partnersSectionSchema,
  programsSectionSchema,
  pricingSectionSchema,
  richTextSectionSchema,
  imageTextSectionSchema,
  contactSectionSchema,
  teamSectionSchema,
  videoSectionSchema,
  financeCalculatorSectionSchema,
  applicationSectionSchema,
  legalSectionSchema,

  // Documents
  programSchema,
  pageSchema,
  testimonialSchema,
  faqSchema,
  partnerSchema,
  teamMemberSchema,
  blogPostSchema,
  eventSchema,
  careerSchema,

  // Singletons
  siteSettingsSchema,
  navigationSchema,
  footerSchema,
  homePageSchema,
  appointmentsPageSchema,
]

export const singletonTypes = new Set([
  'siteSettings',
  'navigation',
  'footer',
  'homePage',
  'appointmentsPage',
])
