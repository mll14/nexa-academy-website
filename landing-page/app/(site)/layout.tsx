import { sanityFetch } from '@/lib/sanity/client'
import { navigationQuery, footerQuery, siteSettingsQuery } from '@/lib/sanity/queries'
import { getAllSanityPrograms } from '@/lib/sanity/programs'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import dynamic from 'next/dynamic'
import type { Navigation, Footer as FooterType, SiteSettings } from '@/types'

const ChatWidget = dynamic(() => import('@/components/chatbot/ChatWidget').then(m => ({ default: m.ChatWidget })), { ssr: false })

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [navigation, footer, settings, allPrograms] = await Promise.all([
    sanityFetch<Navigation>({ query: navigationQuery, tags: ['navigation'], revalidate: 3600 }),
    sanityFetch<FooterType>({ query: footerQuery, tags: ['footer'], revalidate: 3600 }),
    sanityFetch<SiteSettings>({ query: siteSettingsQuery, tags: ['siteSettings'], revalidate: 3600 }),
    getAllSanityPrograms(),
  ])

  const programs = allPrograms.slice(0, 5)

  return (
    <div className="flex min-h-screen flex-col">
      <Header navigation={navigation} settings={settings} />
      <main className="flex-1">{children}</main>
      <Footer footer={footer} settings={settings} programs={programs} />
      <ChatWidget />
    </div>
  )
}
