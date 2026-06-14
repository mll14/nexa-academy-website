'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { QuizBlockData } from '@/types'

export function QuizBlock({ value }: { value: QuizBlockData }) {
  const [selected, setSelected] = useState<string | null>(null)
  const answered = selected !== null
  const correct = value.options.find((o) => o._key === selected)?.isCorrect ?? false

  return (
    <div className="my-8 rounded-xl border border-border bg-card p-6">
      <p className="flex items-start gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
        <span>❓</span> Knowledge Check
      </p>
      <p className="text-[1rem] font-medium text-foreground mb-5 leading-snug">{value.question}</p>

      <div className="space-y-2.5">
        {value.options.map((opt) => {
          const isSelected = selected === opt._key
          const isCorrect = opt.isCorrect
          return (
            <button
              key={opt._key}
              type="button"
              disabled={answered}
              onClick={() => setSelected(opt._key)}
              className={cn(
                'w-full text-left px-4 py-3 rounded-lg border text-sm transition-all',
                !answered && 'hover:border-primary/50 hover:bg-primary/5 border-border bg-background cursor-pointer',
                answered && !isSelected && !isCorrect && 'border-border bg-background text-muted-foreground opacity-60 cursor-default',
                answered && isSelected && !isCorrect && 'border-destructive/50 bg-destructive/8 text-foreground cursor-default',
                answered && isCorrect && 'border-emerald-400/50 bg-emerald-50 text-foreground dark:bg-emerald-950/30 cursor-default',
              )}
            >
              <div className="flex items-start gap-3">
                <span className={cn(
                  'mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border-2 transition-colors',
                  !answered && 'border-muted-foreground/30',
                  answered && isCorrect && 'border-emerald-500 bg-emerald-500',
                  answered && isSelected && !isCorrect && 'border-destructive bg-destructive',
                  answered && !isSelected && !isCorrect && 'border-muted-foreground/20',
                )} />
                <span>{opt.text}</span>
              </div>
              {answered && isSelected && opt.explanation && (
                <p className="mt-2 ml-7 text-xs text-muted-foreground">{opt.explanation}</p>
              )}
            </button>
          )
        })}
      </div>

      {answered && (
        <div className={cn(
          'mt-5 rounded-lg px-4 py-3 text-sm',
          correct ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-destructive/8 text-destructive',
        )}>
          <span className="font-semibold">{correct ? '✅ Correct!' : '❌ Not quite.'}</span>
          {value.explanation && <span className="ml-2">{value.explanation}</span>}
        </div>
      )}
    </div>
  )
}
