import { FormulaBlock } from './FormulaBlock.jsx';
import { Input } from './FormControls.jsx';

const MATH_KEYS = [
  { label: 'x', insert: 'x' },
  { label: 'y', insert: 'y' },
  { label: '+', insert: '+' },
  { label: '−', insert: '-' },
  { label: '×', insert: '*' },
  { label: '÷', insert: '/' },
  { label: '^', insert: '^' },
  { label: '√()', insert: 'sqrt()' },
  { label: '( )', insert: '()' },
  { label: '=', insert: '=' }
];

export function MathInput({
  id,
  value = '',
  onChange,
  disabled = false,
  placeholder = 'Contoh: x+6',
  label = 'Ekspresi Matematika'
}) {
  const appendSymbol = (sym) => {
    if (disabled) return;
    onChange(`${value || ''}${sym}`);
  };

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={id} className="mb-1.5 block text-xs font-extrabold text-navy-900">
          {label}
        </label>
        <Input
          id={id}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tombol simbol matematika">
        {MATH_KEYS.map((k) => (
          <button
            key={k.label}
            type="button"
            disabled={disabled}
            onClick={() => appendSymbol(k.insert)}
            className="min-h-11 min-w-11 rounded-xl border border-app-border bg-white px-3 text-sm font-extrabold text-navy-900 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:opacity-50"
          >
            {k.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-app-border bg-surface-muted p-3">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted">Pratinjau Notasi</p>
        <div className="mt-1 min-h-8 text-lg font-bold text-navy-900">
          {value ? <FormulaBlock blockLatex={value} /> : <span className="text-sm text-text-muted">Belum ada ekspresi</span>}
        </div>
      </div>
    </div>
  );
}
