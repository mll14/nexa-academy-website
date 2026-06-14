import type { DownloadableResourceData } from '@/types'

export function DownloadableResource({ value }: { value: DownloadableResourceData }) {
  return (
    <div className="my-6 flex items-start gap-4 rounded-xl border border-border bg-muted/40 p-5">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
          <path d="M10 3v10m0 0l-3-3m3 3l3-3M4 15h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{value.title}</p>
        {value.description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{value.description}</p>
        )}
        {value.fileType && (
          <span className="mt-1.5 inline-block text-[10px] font-mono font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded uppercase tracking-wider">
            {value.fileType}
          </span>
        )}
      </div>
      {value.fileUrl && (
        <a
          href={value.fileUrl}
          download
          rel="noopener noreferrer"
          className="flex-shrink-0 text-xs font-semibold text-primary hover:opacity-75 transition-opacity"
        >
          Download ↓
        </a>
      )}
    </div>
  )
}
