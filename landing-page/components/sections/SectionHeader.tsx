interface SectionHeaderProps {
  title?: string | null
  subtitle?: string | null
  className?: string
}

export function SectionHeader({ title, subtitle, className }: SectionHeaderProps) {
  if (!title) return null
  return (
    <div className={`text-center space-y-4 max-w-2xl mx-auto mb-12 ${className ?? ''}`}>
      <div>
        <h2 className="font-semibold tracking-tight">{title}</h2>
        <div className="w-16 h-0.5 bg-primary mx-auto mt-2" />
      </div>
      {subtitle && (
        <p className="text-muted-foreground">{subtitle}</p>
      )}
    </div>
  )
}
