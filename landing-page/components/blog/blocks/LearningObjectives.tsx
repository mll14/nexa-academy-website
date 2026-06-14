import type { LearningObjectivesData } from '@/types'

export function LearningObjectives({ value }: { value: LearningObjectivesData }) {
  return (
    <div className="my-8 rounded-xl border border-primary/20 bg-primary/5 p-6">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-wide mb-4">
        <span className="text-base">🎯</span>
        {value.title ?? "What You'll Learn"}
      </h3>
      <ul className="space-y-2.5">
        {value.objectives.map((obj, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center">
              <svg className="w-3 h-3 text-primary" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="text-[0.9375rem] text-foreground leading-relaxed">{obj}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
