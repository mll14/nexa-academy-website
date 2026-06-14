import katex from 'katex'
import type { MathBlockData } from '@/types'

export function MathBlock({ value }: { value: MathBlockData }) {
  let html = ''
  try {
    html = katex.renderToString(value.latex, {
      displayMode: value.displayMode ?? true,
      throwOnError: false,
      output: 'html',
    })
  } catch {
    return (
      <div className="my-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive font-mono">
        Invalid LaTeX: {value.latex}
      </div>
    )
  }

  return (
    <figure className="my-8 overflow-x-auto">
      {/* Safe: katex.renderToString() only outputs math-specific markup (spans/SVG),
          never arbitrary HTML. Source is trusted Sanity author content. */}
      <div
        className="flex justify-center py-4"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {value.caption && (
        <figcaption className="mt-2 text-center text-xs text-muted-foreground italic">
          {value.caption}
        </figcaption>
      )}
    </figure>
  )
}
