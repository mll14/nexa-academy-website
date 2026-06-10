/**
 * Horizontal tab bar with underline-style active indicator.
 * Active tab: primary-colored text + bottom border.
 * Inactive: muted gray, no border.
 *
 * Props:
 *   tabs   — [{value, label, count?}]
 *   active — current tab value string
 *   onChange — (value) => void
 */
export function UnderlineTabs({ tabs, active, onChange }) {
  return (
    <div className="border-b border-border">
      <div className="flex overflow-x-auto scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={`
              flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap
              border-b-2 -mb-px transition-all duration-150
              ${active === tab.value
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }
            `}
          >
            {tab.label}
            {tab.count != null && (
              <span className={`
                inline-flex items-center justify-center min-w-[18px] h-[18px] px-1
                text-[10px] font-semibold rounded-full
                ${active === tab.value
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"
                }
              `}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
