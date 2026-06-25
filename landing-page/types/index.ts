import type { PortableTextBlock } from '@portabletext/types'
export type { PortableTextBlock }

// ─── Sanity primitives ───────────────────────────────────────────────────────

export interface SanitySlug { current: string }

export interface SanityImageAsset {
  _ref: string
  _type: 'reference'
  url?: string
  metadata?: { lqip?: string; dimensions?: { width: number; height: number } }
}

export interface SanityImage {
  _type: 'image'
  asset: SanityImageAsset
  hotspot?: { x: number; y: number; width: number; height: number }
  crop?: { top: number; bottom: number; left: number; right: number }
  alt?: string
  caption?: string
}

// ─── Shared objects ──────────────────────────────────────────────────────────

export interface Link {
  label: string
  url: string
  openInNewTab?: boolean
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
}

export interface SEO {
  title?: string
  description?: string
  ogImage?: SanityImage
  noIndex?: boolean
}

export type BackgroundStyle = 'white' | 'light' | 'dark' | 'primary' | 'gradient'

export interface SectionBackground { style: BackgroundStyle }

// ─── Section base ─────────────────────────────────────────────────────────────

export interface SectionBase {
  _key: string
  _type: string
  sectionId?: string
  isHidden?: boolean
  background?: SectionBackground
}

// ─── Section types ────────────────────────────────────────────────────────────

export interface HeroSection extends SectionBase {
  _type: 'heroSection'
  badge?: string
  headline: string
  subheadline?: string
  primaryCta?: Link
  secondaryCta?: Link
  image?: SanityImage
  videoUrl?: string
  layout?: 'centered' | 'split' | 'fullWidth'
}

export interface StatItem {
  _key: string
  value: string
  label: string
  prefix?: string
  suffix?: string
  description?: string
  iconName?: string
}

export interface StatsSection extends SectionBase {
  _type: 'statsSection'
  sectionTitle?: string
  stats: StatItem[]
  layout?: 'row' | 'grid'
}

export type FeatureColor = 'primary-tint' | 'primary-solid' | 'secondary-tint' | 'secondary-solid' | 'neutral' | 'white'

export interface FeatureItem {
  _key: string
  iconName?: string
  title: string
  description: string
  color?: FeatureColor
}

export interface FeaturesSection extends SectionBase {
  _type: 'featuresSection'
  badge?: string
  sectionTitle: string
  sectionSubtitle?: string
  features: FeatureItem[]
  layout?: 'grid' | 'list' | 'alternating' | 'journey'
  columns?: 2 | 3 | 4
}

export interface TestimonialDoc {
  _id: string
  name: string
  role?: string
  company?: string
  quote: string
  rating?: number
  avatarUrl?: string
  avatar?: SanityImage
  programSlug?: string
}

export interface TestimonialsSection extends SectionBase {
  _type: 'testimonialsSection'
  badge?: string
  sectionTitle: string
  sectionSubtitle?: string
  testimonials: TestimonialDoc[]
  layout?: 'carousel' | 'grid' | 'masonry'
}

export interface FaqDoc {
  _id: string
  question: string
  answer: string
  category?: string
}

export interface FaqSection extends SectionBase {
  _type: 'faqSection'
  badge?: string
  sectionTitle: string
  sectionSubtitle?: string
  faqs?: FaqDoc[]
  inlineFaqs?: FaqDoc[]
  showCategories?: boolean
}

export interface CtaSection extends SectionBase {
  _type: 'ctaSection'
  headline: string
  subheadline?: string
  description?: string
  primaryCta?: Link
  secondaryCta?: Link
  layout?: 'centered' | 'split'
}

export interface PartnerDoc {
  _id: string
  name: string
  logo?: SanityImage
  website?: string
  type?: string
}

export interface PartnersSection extends SectionBase {
  _type: 'partnersSection'
  sectionTitle?: string
  sectionSubtitle?: string
  partners: PartnerDoc[]
  layout?: 'carousel' | 'grid'
}

export interface ProgramsSection extends SectionBase {
  _type: 'programsSection'
  badge?: string
  sectionTitle: string
  sectionSubtitle?: string
  layout?: 'cards' | 'list'
  ctaLabel?: string
  ctaUrl?: string
  ctaTitle?: string
  ctaDescription?: string
}

export interface PricingFeature {
  _key: string
  text: string
  included: boolean
}

export interface PricingPlan {
  _key: string
  name: string
  price: string
  period?: string
  description?: string
  features?: PricingFeature[]
  isPopular?: boolean
  cta?: Link
}

export interface PricingSection extends SectionBase {
  _type: 'pricingSection'
  badge?: string
  sectionTitle: string
  sectionSubtitle?: string
  plans: PricingPlan[]
}

export interface RichTextSection extends SectionBase {
  _type: 'richTextSection'
  content: PortableTextBlock[]
  width?: 'narrow' | 'default' | 'wide'
}

export interface BulletPoint { _key: string; text: string }

export interface ImageTextSection extends SectionBase {
  _type: 'imageTextSection'
  image?: SanityImage
  badge?: string
  headline: string
  body?: PortableTextBlock[]
  bulletPoints?: BulletPoint[]
  cta?: Link
  imagePosition?: 'left' | 'right'
}

export interface ContactSection extends SectionBase {
  _type: 'contactSection'
  sectionTitle?: string
  sectionSubtitle?: string
  showForm?: boolean
  email?: string
  phone?: string
  address?: string
  mapEmbedUrl?: string
}

export interface TeamMemberDoc {
  _id: string
  name: string
  role: string
  bio?: string
  photo?: SanityImage
  linkedinUrl?: string
  twitterUrl?: string
  department?: string
}

export interface TeamSection extends SectionBase {
  _type: 'teamSection'
  badge?: string
  sectionTitle: string
  sectionSubtitle?: string
  members: TeamMemberDoc[]
}

export interface VideoSection extends SectionBase {
  _type: 'videoSection'
  sectionTitle?: string
  videoUrl?: string
  thumbnail?: SanityImage
  caption?: string
}

export interface FinanceCalculatorSection extends SectionBase {
  _type: 'financeCalculatorSection'
  sectionTitle?: string
  sectionSubtitle?: string
}

export interface ApplicationSection extends SectionBase {
  _type: 'applicationSection'
  badge?: string
  headline?: string
  subheadline?: string
}

export interface LegalTab {
  _key: string
  label: string
  content: PortableTextBlock[]
}

export interface LegalSection extends SectionBase {
  _type: 'legalSection'
  pageTitle: string
  pageSubtitle?: string
  tabs: LegalTab[]
}

export interface GalleryPhoto {
  _key: string
  image: SanityImage
  caption?: string
}

export interface GallerySection extends SectionBase {
  _type: 'gallerySection'
  badge?: string
  headline?: string
  subheadline?: string
  photos?: GalleryPhoto[]
  layout?: 'grid' | 'masonry' | 'featured'
  columns?: 2 | 3 | 4
}

export interface AppointmentSidebarItem {
  _key: string
  title: string
  description?: string
}

export interface AppointmentFormSection extends SectionBase {
  _type: 'appointmentFormSection'
  badge?: string
  headline?: string
  subheadline?: string
  sidebarItems?: AppointmentSidebarItem[]
  nextSteps?: string[]
  officeAddress?: string
  officeMapUrl?: string
}

export type Section =
  | HeroSection | StatsSection | FeaturesSection | TestimonialsSection
  | FaqSection | CtaSection | PartnersSection | ProgramsSection
  | PricingSection | RichTextSection | ImageTextSection | ContactSection
  | TeamSection | VideoSection | FinanceCalculatorSection | ApplicationSection
  | LegalSection | GallerySection | AppointmentFormSection

// ─── Document types ───────────────────────────────────────────────────────────

export interface Page {
  _id: string
  _type: 'page'
  title: string
  slug: SanitySlug
  seo?: SEO
  sections?: Section[]
  publishedAt?: string
}

export interface HomePage {
  _id: string
  _type: 'homePage'
  title?: string
  seo?: SEO
  sections?: Section[]
}

// ─── Singletons ───────────────────────────────────────────────────────────────

export interface NavChildItem {
  _key: string
  label: string
  url: string
  description?: string
  openInNewTab?: boolean
}

export interface NavItem {
  _key: string
  label: string
  url?: string
  openInNewTab?: boolean
  children?: NavChildItem[]
}

export interface Navigation {
  _id?: string
  items?: NavItem[]
  ctaButton?: Link
  admissionsButton?: Link
}

export interface FooterLink {
  _key: string
  label: string
  url: string
  openInNewTab?: boolean
}

export interface FooterColumn {
  _key: string
  heading: string
  links?: FooterLink[]
}

export interface SocialLink {
  _key?: string
  platform: string
  url: string
}

export interface Footer {
  _id?: string
  tagline?: string
  copyrightText?: string
  columns?: FooterColumn[]
  socialLinks?: SocialLink[]
  bottomLinks?: FooterLink[]
}

export interface LabelValue { label: string; value: string }

export interface SiteSettings {
  _id?: string
  siteName?: string
  logo?: SanityImage
  logoText?: string
  favicon?: SanityImage
  contactEmail?: string
  contactPhone?: string
  address?: string
  locationUrl?: string
  mapEmbedUrl?: string
  responseTimes?: LabelValue[]
  whyReach?: string[]
  admissionsTimeline?: LabelValue[]
  whyNexa?: string[]
  nextSteps?: string[]
  defaultSeo?: SEO
  socialLinks?: SocialLink[]
  announcementBar?: {
    isActive: boolean
    text: string
    link?: Link
    style?: 'info' | 'warning' | 'success' | 'promo'
  }
}

// ─── Blog ─────────────────────────────────────────────────────────────────────

export interface BlogAuthor {
  name: string
  role?: string
  bio?: string
  photo?: SanityImage
  linkedinUrl?: string
  twitterUrl?: string
}

export interface BlogPostSummary {
  _id: string
  title: string
  slug: string
  category: string
  excerpt: string
  readingTime?: number
  publishedAt: string
  featured?: boolean
  coverImage?: SanityImage
}

// Body block types for the rich blog body
export interface CodeBlockData {
  _key: string
  _type: 'codeBlock'
  language?: string
  filename?: string
  code: string
}

export interface MathBlockData {
  _key: string
  _type: 'mathBlock'
  latex: string
  displayMode?: boolean
  caption?: string
}

export interface VideoEmbedData {
  _key: string
  _type: 'videoEmbed'
  url: string
  caption?: string
  startAt?: number
}

export interface DownloadableResourceData {
  _key: string
  _type: 'downloadableResource'
  title: string
  description?: string
  fileUrl?: string
  fileType?: string
}

export interface LearningObjectivesData {
  _key: string
  _type: 'learningObjectives'
  title?: string
  objectives: string[]
}

export interface InstructorNoteData {
  _key: string
  _type: 'instructorNote'
  type: 'info' | 'tip' | 'warning' | 'important' | 'instructor'
  title?: string
  content: string
}

export interface BlogCtaData {
  _key: string
  _type: 'blogCta'
  title: string
  description?: string
  buttonText: string
  buttonUrl: string
  style?: 'primary' | 'subtle' | 'dark'
}

export interface QuizOption {
  _key: string
  text: string
  isCorrect: boolean
  explanation?: string
}

export interface QuizBlockData {
  _key: string
  _type: 'quizBlock'
  question: string
  options: QuizOption[]
  explanation?: string
}

export interface NotebookEmbedData {
  _key: string
  _type: 'notebookEmbed'
  title?: string
  embedUrl: string
  height?: number
}

export type BlogBodyBlock =
  | PortableTextBlock
  | CodeBlockData
  | MathBlockData
  | VideoEmbedData
  | DownloadableResourceData
  | LearningObjectivesData
  | InstructorNoteData
  | BlogCtaData
  | QuizBlockData
  | NotebookEmbedData

export interface BlogPost {
  _id: string
  _type: 'blogPost'
  title: string
  slug: string
  category: string
  excerpt: string
  readingTime?: number
  publishedAt: string
  featured?: boolean
  coverImage?: SanityImage
  author?: BlogAuthor
  tags?: string[]
  body?: BlogBodyBlock[]
  relatedPosts?: BlogPostSummary[]
  seo?: SEO
}

// ─── API types (from Nexa Academy platform) ──────────────────────────────────

export interface ApiProgram {
  program_id: string
  slug: string
  name: string
  program_name?: string  // compat: live API still returns this until backend deploys
  price?: number | null
  original_price?: number | null
  status?: string
  coming_soon?: boolean
  sanity_id?: string
  created_at?: string
  updated_at?: string
}

// ─── Sanity program (editorial content) ──────────────────────────────────────

export interface SanityProgramTestimonial {
  _id: string
  name: string
  role?: string
  company?: string
  quote: string
  rating?: number
  avatar?: SanityImage
  avatarUrl?: string
}

export interface SanityProgram {
  _id: string
  name: string
  slug: string
  order?: number | null
  price?: number | null
  originalPrice?: number | null
  durationMonths?: number | null
  heroSubtitle?: string
  heroImage?: SanityImage
  heroIcon?: SanityImage
  syllabusUrl?: string
  overviewTitle?: string
  overviewSubtitle?: string
  overviewBody?: PortableTextBlock[]
  salaryRanges?: Array<{ stage: string; kenyaRange: string; globalRange: string }>
  faqItems?: Array<{ question: string; answer?: PortableTextBlock[] }>
  curriculumTitle?: string
  curriculumSubtitle?: string
  modules?: Array<{ title: string; description?: PortableTextBlock[]; isBonus?: boolean }>
  ctaTitle?: string
  ctaSubtitle?: string
  ctaButtonText?: string
  paymentNote?: string
  paymentPlans?: Array<{ title: string; description?: string; badge?: string }>
  includedItems?: string[]
  impactLabel?: string
  impactTitle?: string
  impactSubtitle?: string
  impactMetrics?: Array<{ value: string; label: string; description?: string }>
  testimonialsHidden?: boolean
  testimonialsTitle?: string
  testimonialsSubtitle?: string
  testimonials?: SanityProgramTestimonial[]
  differentiatorTitle?: string
  differentiators?: Array<{ number: string; title: string; body?: PortableTextBlock[] }>
  seo?: SEO
}

export type IntakeMode = 'full_time_hybrid' | 'full_time_remote' | 'part_time_hybrid' | 'part_time_remote'

export interface ApiIntake {
  id: string
  program: string | number
  start_date: string
  end_date?: string
  application_deadline?: string
  status: 'open' | 'closed' | 'draft'
  mode: IntakeMode
  seats_remaining?: number
}
