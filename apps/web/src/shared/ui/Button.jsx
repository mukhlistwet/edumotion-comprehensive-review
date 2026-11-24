import { Loader2 } from 'lucide-react';

const VARIANT_CLASSES = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600 focus-visible:ring-brand-100 border border-transparent shadow-sm',
  secondary: 'bg-white text-navy-900 border border-app-border hover:bg-surface-muted focus-visible:ring-blue-100',
  outline: 'bg-transparent text-brand-700 border-2 border-brand-500 hover:bg-brand-50 focus-visible:ring-brand-100',
  ghost: 'bg-transparent text-text-secondary hover:bg-surface-subtle hover:text-navy-900 border border-transparent focus-visible:ring-blue-100',
  danger: 'bg-red-500 text-white hover:bg-red-700 border border-transparent focus-visible:ring-red-100',
  reward: 'bg-yellow-400 text-navy-900 hover:bg-orange-500 hover:text-white border border-transparent focus-visible:ring-yellow-50'
};

const SIZE_CLASSES = {
  sm: 'min-h-9 px-3 py-1.5 text-xs rounded-[10px]',
  md: 'min-h-11 px-4 py-2.5 text-[15px] rounded-xl',
  lg: 'min-h-[52px] px-5 py-3 text-base rounded-xl',
  xl: 'min-h-14 px-6 py-3.5 text-lg rounded-2xl'
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  className = '',
  ...props
}) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 font-extrabold transition focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary} ${SIZE_CLASSES[size] || SIZE_CLASSES.md} ${className}`}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
