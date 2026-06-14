import { SectionWrapper } from './SectionWrapper'
import { SectionHeader } from './SectionHeader'
import type { ContactSection as ContactSectionType } from '@/types'

export function ContactSection({ section }: { section: ContactSectionType }) {
  return (
    <SectionWrapper section={section}>
      <div className="max-w-4xl mx-auto">
        <SectionHeader title={section.sectionTitle} />
        <div className={section.showForm ? 'grid md:grid-cols-2 gap-12' : 'flex justify-center'}>
          <div className="space-y-6">
            {section.email && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Email</div>
                <a href={`mailto:${section.email}`} className="mt-1 block text-lg text-primary hover:underline">
                  {section.email}
                </a>
              </div>
            )}
            {section.phone && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Phone</div>
                <a href={`tel:${section.phone}`} className="mt-1 block text-lg text-foreground hover:text-primary">
                  {section.phone}
                </a>
              </div>
            )}
            {section.address && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Address</div>
                <address className="mt-1 not-italic text-foreground/80 whitespace-pre-line">{section.address}</address>
              </div>
            )}
          </div>
          {section.showForm && (
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Name</label>
                  <input type="text" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                  <input type="email" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Message</label>
                <textarea rows={5} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
              <button type="submit" className="w-full rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors">
                Send Message
              </button>
            </form>
          )}
        </div>
        {section.mapEmbedUrl && (
          <div className="mt-10 overflow-hidden rounded-2xl aspect-video">
            <iframe src={section.mapEmbedUrl} className="w-full h-full border-0" allowFullScreen loading="lazy" title="Map" />
          </div>
        )}
      </div>
    </SectionWrapper>
  )
}
