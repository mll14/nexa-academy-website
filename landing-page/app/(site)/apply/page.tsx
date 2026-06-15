export const runtime = 'edge'

import { Suspense } from 'react'
import type { Metadata } from 'next'
import { ApplicationPageClient } from './ApplicationPageClient'
import { RecaptchaProvider } from '@/components/application/RecaptchaProvider'
import { sanityFetch } from '@/lib/sanity/client'
import { siteSettingsQuery } from '@/lib/sanity/queries'
import { buildMetadata } from '@/lib/seo'
import type { SiteSettings } from '@/types'

export async function generateMetadata(): Promise<Metadata> {
  const s = await sanityFetch<SiteSettings>({ query: siteSettingsQuery, tags: ['siteSettings'] })
  return buildMetadata(
    null,
    { title: 'Apply', description: 'Apply for a Nexa Academy program and start your tech journey today.' },
    s?.siteName,
    s?.defaultSeo?.ogImage,
  )
}

export default async function ApplyPage() {
  const s = await sanityFetch<SiteSettings>({ query: siteSettingsQuery, tags: ['siteSettings'] })

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground gap-2">
        <span className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        Loading application…
      </div>
    }>
      <RecaptchaProvider>
        <ApplicationPageClient
          admissionsTimeline={s?.admissionsTimeline}
          whyNexa={s?.whyNexa}
          nextSteps={s?.nextSteps}
        />
      </RecaptchaProvider>
    </Suspense>
  )
}
