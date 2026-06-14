import { SectionWrapper } from './SectionWrapper'
import { SectionHeader } from './SectionHeader'
import { SanityImage } from '@/components/shared/SanityImage'
import type { TeamSection as TeamSectionType } from '@/types'

export function TeamSection({ section }: { section: TeamSectionType }) {
  return (
    <SectionWrapper section={section}>
      <SectionHeader title={section.sectionTitle} />
      <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {section.members?.map((member) => (
          <div key={member._id} className="text-center">
            <div className="relative mx-auto h-32 w-32 overflow-hidden rounded-full bg-muted mb-4">
              {member.photo?.asset && (
                <SanityImage image={member.photo} fill className="object-cover" sizes="128px" />
              )}
            </div>
            <h3 className="font-semibold text-foreground">{member.name}</h3>
            <p className="text-sm text-muted-foreground">{member.role}</p>
            {(member.linkedinUrl || member.twitterUrl) && (
              <div className="mt-2 flex justify-center gap-3">
                {member.linkedinUrl && (
                  <a href={member.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    in
                  </a>
                )}
                {member.twitterUrl && (
                  <a href={member.twitterUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    𝕏
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </SectionWrapper>
  )
}
