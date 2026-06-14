import type { Metadata } from 'next'
import { Nunito, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { sanityFetch } from '@/lib/sanity/client'
import { siteSettingsQuery } from '@/lib/sanity/queries'
import type { SiteSettings } from '@/types'

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  display: 'swap',
})

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
})

export async function generateMetadata(): Promise<Metadata> {
  const settings = await sanityFetch<SiteSettings>({
    query: siteSettingsQuery,
    tags: ['siteSettings'],
    revalidate: 3600,
  })

  const siteName = settings?.siteName ?? 'Nexa Academy'
  const description =
    settings?.defaultSeo?.description ??
    "Kenya's premier coding bootcamp. Launch your tech career with Nexa Academy."
  const faviconUrl = settings?.favicon?.asset?.url

  let ogImageUrl: string | undefined
  const ogImage = settings?.defaultSeo?.ogImage
  if (ogImage?.asset) {
    try {
      const { urlFor } = await import('@/lib/sanity/image')
      ogImageUrl = urlFor(ogImage).width(1200).height(630).url()
    } catch { /* noop */ }
  }

  return {
    title: { default: siteName, template: `%s | ${siteName}` },
    description,
    openGraph: {
      siteName,
      description,
      type: 'website',
      ...(ogImageUrl && { images: [{ url: ogImageUrl, width: 1200, height: 630 }] }),
    },
    twitter: {
      card: 'summary_large_image',
      description,
      ...(ogImageUrl && { images: [ogImageUrl] }),
    },
    ...(faviconUrl && {
      icons: {
        icon: faviconUrl,
        shortcut: faviconUrl,
        apple: faviconUrl,
      },
    }),
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${nunito.variable} ${plusJakarta.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
