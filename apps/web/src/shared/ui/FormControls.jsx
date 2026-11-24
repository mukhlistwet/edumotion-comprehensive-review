export function FormField({ id, label, helperText, error, required = false, children, className = '' }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label ? (
        <label htmlFor={id} className="block text-xs font-extrabold text-navy-900">
          {label}
          {required ? <span className="ml-1 text-red-500" aria-hidden="true">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p id={id ? `${id}-error` : undefined} role="alert" className="text-xs font-bold text-red-700">
          {error}
        </p>
      ) : helperText ? (
        <p id={id ? `${id}-help` : undefined} className="text-xs text-text-muted">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

const INPUT_BASE =
  'w-full min-h-11 rounded-[10px] border bg-white px-3.5 py-2.5 text-sm font-semibold text-navy-900 placeholder:text-text-muted transition focus:outline-none focus:ring-4';

export function Input({ id, error, className = '', ...props }) {
  return (
    <input
      id={id}
      aria-invalid={Boolean(error) || undefined}
      aria-describedby={error && id ? `${id}-error` : undefined}
      className={`${INPUT_BASE} ${
        error
          ? 'border-red-500 focus:border-red-500 focus:ring-red-100'
          : 'border-app-border focus:border-blue-500 focus:ring-blue-100'
      } ${className}`}
      {...props}
    />
  );
}

export function Select({ id, error, className = '', children, ...props }) {
  return (
    <select
      id={id}
      aria-invalid={Boolean(error) || undefined}
      aria-describedby={error && id ? `${id}-error` : undefined}
      className={`${INPUT_BASE} ${
        error
          ? 'border-red-500 focus:border-red-500 focus:ring-red-100'
          : 'border-app-border focus:border-blue-500 focus:ring-blue-100'
      } ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ id, error, className = '', rows = 3, ...props }) {
  return (
    <textarea
      id={id}
      rows={rows}
      aria-invalid={Boolean(error) || undefined}
      aria-describedby={error && id ? `${id}-error` : undefined}
      className={`w-full rounded-[10px] border bg-white px-3.5 py-2.5 text-sm font-semibold text-navy-900 placeholder:text-text-muted transition focus:outline-none focus:ring-4 ${
        error
          ? 'border-red-500 focus:border-red-500 focus:ring-red-100'
          : 'border-app-border focus:border-blue-500 focus:ring-blue-100'
      } ${className}`}
      {...props}
    />
  );
}
