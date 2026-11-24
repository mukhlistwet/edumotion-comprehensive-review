export function Card({ children, className = '', padding = 'p-5', ...props }) {
  return (
    <div
      className={`rounded-2xl border border-app-border bg-surface shadow-card ${padding} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function SectionHeader({ eyebrow, title, subtitle, action, className = '' }) {
  return (
    <div className={`flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between ${className}`}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-xs font-extrabold uppercase tracking-wider text-brand-700">{eyebrow}</p>
        ) : null}
        <h2 className="font-display text-xl font-extrabold text-navy-900 sm:text-2xl">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-text-secondary">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
