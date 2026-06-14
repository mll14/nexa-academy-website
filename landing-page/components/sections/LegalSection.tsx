'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { SectionWrapper } from './SectionWrapper'
import { MarkdownRenderer } from '@/components/shared/MarkdownRenderer'
import type { LegalSection as LegalSectionType } from '@/types'

export default function LegalSection({ section }: { section: LegalSectionType }) {
  const [activeTab, setActiveTab] = useState(section.tabs?.[0]?._key ?? '')
  const activeContent = section.tabs?.find((t) => t._key === activeTab)

  return (
    <SectionWrapper section={section}>
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            {section.pageTitle}
          </h1>
          {section.pageSubtitle && (
            <p className="text-sm text-muted-foreground leading-relaxed border-l-4 border-primary pl-4">
              {section.pageSubtitle}
            </p>
          )}
        </div>

        {/* Tab bar */}
        <div className="border-b border-border">
          <div className="flex gap-0 overflow-x-auto">
            {section.tabs?.map((tab) => {
              const isActive = tab._key === activeTab
              return (
                <button
                  key={tab._key}
                  type="button"
                  onClick={() => setActiveTab(tab._key)}
                  className={cn(
                    'relative shrink-0 px-6 py-3 text-sm font-medium transition-colors',
                    'after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:transition-colors',
                    isActive
                      ? 'text-primary after:bg-primary'
                      : 'text-muted-foreground hover:text-foreground after:bg-transparent',
                  )}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        {activeContent?.content && (
          <MarkdownRenderer value={activeContent.content} className="pt-2" />
        )}

      </div>
    </SectionWrapper>
  )
}
