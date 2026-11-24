import { useEffect } from 'react';
import { X } from 'lucide-react';

export function Modal({ open, onClose, title, subtitle, children, footer, maxWidth = 'max-w-lg' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/55 p-0 backdrop-blur-[1px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Dialog'}
    >
      <div
        className={`max-h-[90dvh] w-full ${maxWidth} flex flex-col overflow-hidden rounded-t-3xl border border-app-border bg-white shadow-2xl sm:rounded-2xl`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-app-border px-5 py-4">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-extrabold text-navy-900">{title}</h3>
            {subtitle ? <p className="mt-0.5 text-xs text-text-secondary">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-text-secondary hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-app-border bg-surface-muted px-5 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, children, side = 'left' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label={title || 'Panel navigasi'}>
      <div className="fixed inset-0 bg-navy-900/50" onClick={onClose} aria-hidden="true" />
      <aside
        className={`relative z-10 flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-2xl ${
          side === 'right' ? 'ml-auto border-l' : 'mr-auto border-r'
        } border-app-border`}
      >
        <div className="flex items-center justify-between border-b border-app-border px-4 py-3.5">
          <span className="font-display text-base font-extrabold text-navy-900">{title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel"
            className="grid h-11 w-11 place-items-center rounded-xl text-text-secondary hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </div>
  );
}
