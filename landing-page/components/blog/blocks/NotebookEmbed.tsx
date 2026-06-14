import type { NotebookEmbedData } from '@/types'

export function NotebookEmbed({ value }: { value: NotebookEmbedData }) {
  const height = value.height ?? 600

  return (
    <figure className="my-8">
      {value.title && (
        <div className="flex items-center gap-2 mb-2 text-xs font-medium text-muted-foreground">
          <span>📓</span>
          <span>{value.title}</span>
        </div>
      )}
      <div
        className="overflow-hidden rounded-xl border border-border bg-muted/30"
        style={{ height }}
      >
        <iframe
          src={value.embedUrl}
          title={value.title ?? 'Jupyter Notebook'}
          className="w-full h-full"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </figure>
  )
}
