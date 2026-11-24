import { AlertCircle, Inbox, RefreshCw } from 'lucide-react';
import { Button } from './Button.jsx';

export function LoadingState({ message = 'Memuat data...' }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl border border-app-border bg-white p-8 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-surface-subtle border-t-brand-500" />
      <p className="mt-3 text-sm font-bold text-text-secondary">{message}</p>
    </div>
  );
}

export function EmptyState({ title = 'Belum ada data', description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-app-border bg-white p-8 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-subtle text-text-muted">
        <Inbox className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="mt-3 font-display text-lg font-extrabold text-navy-900">{title}</h3>
      {description ? <p className="mt-1 max-w-md text-sm text-text-secondary">{description}</p> : null}
      {actionLabel && onAction ? (
        <Button className="mt-4" variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function ErrorState({ title = 'Gagal memuat data', message, onRetry }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-6 text-center"
    >
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-red-500 shadow-sm">
        <AlertCircle className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="mt-3 font-display text-lg font-extrabold text-navy-900">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-red-700">{message || 'Terjadi gangguan sementara pada layanan.'}</p>
      {onRetry ? (
        <Button className="mt-4" variant="secondary" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Coba lagi
        </Button>
      ) : null}
    </div>
  );
}

export function ProgressBar({ value = 0, max = 100, tone = 'brand', label }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((value / max) * 100))) : 0;
  const fillMap = {
    brand: 'bg-brand-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500'
  };
  return (
    <div
      className="h-2.5 w-full overflow-hidden rounded-full bg-surface-subtle"
      role="progressbar"
      aria-label={label || 'Progres'}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full transition-all ${fillMap[tone] || fillMap.brand}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function StatCard({ label, value, suffix, hint, icon, iconTone = 'bg-brand-50 text-brand-700', progress }) {
  return (
    <article className="rounded-2xl border border-app-border bg-white p-4 shadow-card sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-xs font-extrabold text-text-secondary sm:text-sm">{label}</span>
        {icon ? <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${iconTone}`}>{icon}</span> : null}
      </div>
      <p className="font-display text-2xl font-extrabold tabular-nums text-navy-900">
        {value}{' '}
        {suffix ? <span className="text-sm font-bold text-text-muted">{suffix}</span> : null}
      </p>
      {progress !== undefined ? <div className="mt-3"><ProgressBar value={progress} label={label} /></div> : null}
      {hint ? <p className="mt-2 text-xs font-semibold text-text-secondary">{hint}</p> : null}
    </article>
  );
}

export function Tabs({ tabs = [], activeId, onChange, className = '' }) {
  return (
    <div
      role="tablist"
      className={`flex gap-1 overflow-x-auto border-b border-app-border px-1 ${className}`}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={`min-h-11 shrink-0 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              active
                ? 'border-brand-500 text-navy-900'
                : 'border-transparent text-text-secondary hover:text-navy-900'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function ToastBanner({ toast, onDismiss }) {
  if (!toast) return null;
  const toneCls =
    toast.tone === 'error'
      ? 'bg-red-700 text-white'
      : toast.tone === 'warning'
        ? 'bg-orange-700 text-white'
        : 'bg-navy-900 text-white';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-20 left-1/2 z-50 flex max-w-[92vw] -translate-x-1/2 items-center gap-3 rounded-xl px-4 py-3 text-sm font-extrabold shadow-xl lg:bottom-6 ${toneCls}`}
    >
      <span>{toast.message}</span>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Tutup notifikasi"
          className="rounded-lg px-2 py-0.5 text-xs opacity-80 hover:opacity-100"
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}
