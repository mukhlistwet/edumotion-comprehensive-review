export function DataTable({ columns = [], rows = [], keyField = 'id', emptyMessage = 'Tidak ada data.' }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-app-border bg-white p-6 text-center text-sm font-semibold text-text-secondary">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div>
      {/* Mobile stacked cards (< md) */}
      <div className="space-y-3 md:hidden">
        {rows.map((row, idx) => (
          <article key={row[keyField] || idx} className="rounded-2xl border border-app-border bg-white p-4 shadow-card space-y-2">
            {columns.map((col) => (
              <div key={col.key} className="flex items-start justify-between gap-3 text-sm">
                <span className="text-xs font-extrabold text-text-muted">{col.label}</span>
                <div className="text-right font-semibold text-navy-900">
                  {col.render ? col.render(row) : row[col.key]}
                </div>
              </div>
            ))}
          </article>
        ))}
      </div>

      {/* Tablet & desktop table (>= md) */}
      <div className="hidden overflow-x-auto rounded-2xl border border-app-border bg-white shadow-card md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-app-border bg-surface-muted text-xs font-extrabold uppercase tracking-wider text-text-muted">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={`px-4 py-3 ${col.align === 'right' ? 'text-right' : ''}`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {rows.map((row, idx) => (
              <tr key={row[keyField] || idx} className="hover:bg-surface-muted/60">
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3.5 ${col.align === 'right' ? 'text-right tabular-nums' : ''}`}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
