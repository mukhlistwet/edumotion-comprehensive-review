import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Pause, Play, RotateCcw } from 'lucide-react';
import { QUESTION_TYPE_LABELS } from '@edumotion/domain';
import { Badge, Button, FormulaBlock, Input, MathInput, Select, Textarea } from '../../shared/index.js';

function SingleChoiceRenderer({ question, value, onChange, disabled }) {
  const options = question.interaction?.options || [];
  return (
    <div className="space-y-2.5" role="radiogroup" aria-label="Pilihan jawaban tunggal">
      {options.map((opt, idx) => {
        const selected = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(opt.id)}
            className={`flex min-h-12 w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 ${
              selected
                ? 'border-blue-500 bg-blue-50'
                : 'border-app-border bg-white hover:border-slate-300'
            } disabled:cursor-not-allowed`}
          >
            <span
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-black ${
                selected ? 'bg-blue-500 text-white' : 'bg-surface-subtle text-text-secondary'
              }`}
            >
              {String.fromCharCode(65 + idx)}
            </span>
            <span className="text-sm font-bold text-navy-900">
              <FormulaBlock content={opt.label} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function MultipleSelectRenderer({ question, value, onChange, disabled }) {
  const options = question.interaction?.options || [];
  const selectedIds = Array.isArray(value) ? value : [];

  const toggle = (id) => {
    if (disabled) return;
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    onChange(next);
  };

  return (
    <div className="space-y-2.5" role="group" aria-label="Pilihan jawaban jamak">
      <p className="text-xs font-extrabold text-blue-700">Pilih semua jawaban yang benar:</p>
      {options.map((opt) => {
        const checked = selectedIds.includes(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            role="checkbox"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => toggle(opt.id)}
            className={`flex min-h-12 w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 ${
              checked
                ? 'border-blue-500 bg-blue-50'
                : 'border-app-border bg-white hover:border-slate-300'
            } disabled:cursor-not-allowed`}
          >
            <span
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-black ${
                checked ? 'bg-blue-500 text-white' : 'bg-surface-subtle text-text-secondary'
              }`}
            >
              {checked ? '✓' : '□'}
            </span>
            <span className="text-sm font-bold text-navy-900">
              <FormulaBlock content={opt.label} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function TrueFalseRenderer({ question, value, onChange, disabled }) {
  const trueLabel = question.interaction?.trueLabel || 'Benar';
  const falseLabel = question.interaction?.falseLabel || 'Salah';
  const choices = [
    { val: true, code: 'B', label: trueLabel },
    { val: false, code: 'S', label: falseLabel }
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Benar atau salah">
      {choices.map((c) => {
        const selected = value === c.val;
        return (
          <button
            key={c.code}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(c.val)}
            className={`flex min-h-14 items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 ${
              selected ? 'border-blue-500 bg-blue-50' : 'border-app-border bg-white hover:border-slate-300'
            }`}
          >
            <span
              className={`grid h-9 w-9 place-items-center rounded-xl text-sm font-black ${
                selected ? 'bg-blue-500 text-white' : 'bg-surface-subtle text-text-secondary'
              }`}
            >
              {c.code}
            </span>
            <span className="text-sm font-extrabold text-navy-900">{c.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function NumericRenderer({ question, value, onChange, disabled }) {
  const unit = question.interaction?.unit || '';
  const decimalRule = question.interaction?.decimalRule || '';
  const numVal = typeof value === 'object' && value !== null ? value.value ?? '' : value ?? '';
  return (
    <div className="space-y-2">
      <label htmlFor={`num-${question.questionId}`} className="block text-xs font-extrabold text-navy-900">
        Masukkan nilai angka {decimalRule ? `(${decimalRule})` : ''}
      </label>
      <div className="flex items-center gap-2">
        <Input
          id={`num-${question.questionId}`}
          type="text"
          inputMode="decimal"
          disabled={disabled}
          value={numVal}
          placeholder={question.interaction?.placeholder || 'Masukkan angka...'}
          onChange={(e) => onChange(e.target.value)}
        />
        {unit ? (
          <span className="grid min-h-11 shrink-0 place-items-center rounded-[10px] border border-app-border bg-surface-subtle px-4 text-sm font-black text-navy-900">
            {unit}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ShortTextRenderer({ question, value, onChange, disabled }) {
  return (
    <div className="space-y-2">
      <label htmlFor={`txt-${question.questionId}`} className="block text-xs font-extrabold text-navy-900">
        Jawaban Singkat
      </label>
      <Input
        id={`txt-${question.questionId}`}
        disabled={disabled}
        value={value ?? ''}
        placeholder={question.interaction?.placeholder || 'Ketik jawabanmu...'}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function FillBlankRenderer({ question, value, onChange, disabled }) {
  const template = question.interaction?.templateText || '';
  const blanks = question.interaction?.blanks || [];
  const currentMap = typeof value === 'object' && value !== null ? value : {};

  const parts = template.split(/(\[[a-zA-Z0-9_]+\])/g);
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-app-border bg-surface-muted p-4 text-base font-bold leading-relaxed text-navy-900">
        {parts.map((part, idx) => {
          const match = /^\[([a-zA-Z0-9_]+)\]$/.exec(part);
          if (!match) return <span key={idx}>{part}</span>;
          const blankId = match[1];
          const blankDef = blanks.find((b) => b.id === blankId);
          return (
            <input
              key={idx}
              type="text"
              disabled={disabled}
              aria-label={blankDef?.label || blankId}
              value={currentMap[blankId] ?? ''}
              onChange={(e) => onChange({ ...currentMap, [blankId]: e.target.value })}
              placeholder="..."
              className="mx-1.5 inline-block min-h-10 w-24 rounded-lg border-2 border-blue-500 bg-white px-2.5 py-1 text-center text-sm font-black text-navy-900 focus:outline-none focus:ring-4 focus:ring-blue-100"
            />
          );
        })}
      </div>
    </div>
  );
}

function MatchingRenderer({ question, value, onChange, disabled }) {
  const leftItems = question.interaction?.leftItems || [];
  const rightItems = question.interaction?.rightItems || [];
  const pairs = typeof value === 'object' && value !== null ? value : {};

  return (
    <div className="space-y-3">
      {leftItems.map((left) => (
        <div key={left.id} className="grid items-center gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-app-border bg-surface-muted px-3.5 py-3 text-sm font-extrabold text-navy-900">
            {left.label}
          </div>
          <Select
            aria-label={`Pasangan untuk ${left.label}`}
            disabled={disabled}
            value={pairs[left.id] || ''}
            onChange={(e) => onChange({ ...pairs, [left.id]: e.target.value })}
          >
            <option value="">-- Pilih pasangan --</option>
            {rightItems.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </Select>
        </div>
      ))}
    </div>
  );
}

function OrderingRenderer({ question, value, onChange, disabled }) {
  const rawItems = question.interaction?.items;
  const items = useMemo(() => (Array.isArray(rawItems) ? rawItems : []), [rawItems]);
  const orderIds =
    Array.isArray(value) && value.length === items.length
      ? value
      : items.map((it) => it.id);

  const moveItem = (index, delta) => {
    if (disabled) return;
    const target = index + delta;
    if (target < 0 || target >= orderIds.length) return;
    const next = [...orderIds];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  useEffect(() => {
    if (!Array.isArray(value) && items.length > 0) {
      onChange(items.map((it) => it.id));
    }
  }, [items, onChange, value]);

  return (
    <div className="space-y-2.5" aria-label="Susun urutan langkah">
      {orderIds.map((id, idx) => {
        const item = items.find((it) => it.id === id);
        if (!item) return null;
        return (
          <div
            key={id}
            className="flex items-center gap-2 rounded-2xl border border-app-border bg-white p-3"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-purple-50 text-xs font-black text-purple-700">
              {idx + 1}
            </span>
            <span className="min-w-0 flex-1 text-sm font-bold text-navy-900">{item.label}</span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={disabled || idx === 0}
                onClick={() => moveItem(idx, -1)}
                aria-label={`Naikkan ${item.label}`}
                className="grid h-11 w-11 place-items-center rounded-xl border border-app-border hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:opacity-40"
              >
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                disabled={disabled || idx === orderIds.length - 1}
                onClick={() => moveItem(idx, 1)}
                aria-label={`Turunkan ${item.label}`}
                className="grid h-11 w-11 place-items-center rounded-xl border border-app-border hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:opacity-40"
              >
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DragDropRenderer({ question, value, onChange, disabled }) {
  const items = question.interaction?.draggableItems || [];
  const zones = question.interaction?.dropZones || [];
  const placements = typeof value === 'object' && value !== null ? value : {};
  const [selectedItemId, setSelectedItemId] = useState(null);

  const assignToZone = (itemId, zoneId) => {
    if (disabled || !itemId) return;
    onChange({ ...placements, [itemId]: zoneId });
    setSelectedItemId(null);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-app-border bg-surface-muted p-3.5">
        <p className="mb-2 text-xs font-extrabold text-text-secondary">
          1. Pilih kartu item (atau seret ke zona target):
        </p>
        <div className="flex flex-wrap gap-2">
          {items.map((it) => {
            const isPicked = selectedItemId === it.id;
            const assignedZone = zones.find((z) => z.id === placements[it.id]);
            return (
              <button
                key={it.id}
                type="button"
                draggable={!disabled}
                onDragStart={(e) => e.dataTransfer?.setData('text/plain', it.id)}
                disabled={disabled}
                onClick={() => setSelectedItemId(isPicked ? null : it.id)}
                className={`min-h-11 rounded-xl border-2 px-3.5 py-2 text-sm font-black transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 ${
                  isPicked
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : assignedZone
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-app-border bg-white text-navy-900'
                }`}
              >
                {it.label}
                {assignedZone ? <span className="ml-1.5 text-[11px]">→ {assignedZone.label}</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {zones.map((zone) => {
          const placedItems = items.filter((it) => placements[it.id] === zone.id);
          return (
            <div
              key={zone.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const draggedId = e.dataTransfer?.getData('text/plain');
                assignToZone(draggedId || selectedItemId, zone.id);
              }}
              className="rounded-2xl border-2 border-dashed border-app-border bg-white p-3.5 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold uppercase text-navy-900">{zone.label}</span>
                {selectedItemId && !disabled ? (
                  <Button size="sm" variant="outline" onClick={() => assignToZone(selectedItemId, zone.id)}>
                    Letakkan
                  </Button>
                ) : null}
              </div>
              <div className="min-h-10 space-y-1">
                {placedItems.length === 0 ? (
                  <p className="text-xs text-text-muted">Zona kosong</p>
                ) : (
                  placedItems.map((pi) => (
                    <Badge key={pi.id} tone="completed">
                      {pi.label}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Keyboard / screen-reader explicit dropdown fallback */}
      <div className="grid gap-2 border-t border-app-border pt-3 sm:grid-cols-3">
        {items.map((it) => (
          <div key={it.id}>
            <label htmlFor={`dd-${it.id}`} className="mb-1 block text-[11px] font-extrabold text-text-muted">
              Zona untuk {it.label}
            </label>
            <Select
              id={`dd-${it.id}`}
              disabled={disabled}
              value={placements[it.id] || ''}
              onChange={(e) => assignToZone(it.id, e.target.value)}
            >
              <option value="">-- Pilih zona --</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.label}
                </option>
              ))}
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}

function GraphPlotRenderer({ question, value, onChange, disabled }) {
  const bounds = question.interaction?.bounds || { minX: -5, maxX: 5, minY: -5, maxY: 5 };
  const point = value && typeof value.x === 'number' && typeof value.y === 'number' ? value : { x: 0, y: 0 };
  const hasPlot = Boolean(value && typeof value.x === 'number' && typeof value.y === 'number');

  const width = 320;
  const height = 240;
  const spanX = bounds.maxX - bounds.minX;
  const spanY = bounds.maxY - bounds.minY;
  const toSvgX = (x) => ((x - bounds.minX) / spanX) * (width - 40) + 20;
  const toSvgY = (y) => ((bounds.maxY - y) / spanY) * (height - 40) + 20;

  const handleSvgClick = (e) => {
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * width;
    const py = ((e.clientY - rect.top) / rect.height) * height;
    const gx = Math.round(((px - 20) / (width - 40)) * spanX + bounds.minX);
    const gy = Math.round(bounds.maxY - ((py - 20) / (height - 40)) * spanY);
    const clampedX = Math.max(bounds.minX, Math.min(bounds.maxX, gx));
    const clampedY = Math.max(bounds.minY, Math.min(bounds.maxY, gy));
    onChange({ x: clampedX, y: clampedY });
  };

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
      <div className="rounded-2xl border border-app-border bg-white p-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Bidang koordinat Kartesius dari x ${bounds.minX} sampai ${bounds.maxX} dan y ${bounds.minY} sampai ${bounds.maxY}`}
          onClick={handleSvgClick}
          className="w-full max-h-64 cursor-crosshair select-none"
        >
          {/* Grid lines */}
          {Array.from({ length: spanX + 1 }, (_, i) => bounds.minX + i).map((gx) => (
            <line
              key={`vx-${gx}`}
              x1={toSvgX(gx)}
              y1={20}
              x2={toSvgX(gx)}
              y2={height - 20}
              stroke={gx === 0 ? '#344563' : '#E2E8F0'}
              strokeWidth={gx === 0 ? 2 : 1}
            />
          ))}
          {Array.from({ length: spanY + 1 }, (_, i) => bounds.minY + i).map((gy) => (
            <line
              key={`hy-${gy}`}
              x1={20}
              y1={toSvgY(gy)}
              x2={width - 20}
              y2={toSvgY(gy)}
              stroke={gy === 0 ? '#344563' : '#E2E8F0'}
              strokeWidth={gy === 0 ? 2 : 1}
            />
          ))}
          <text x={width - 14} y={toSvgY(0) + 4} fontSize="11" fontWeight="bold" fill="#344563">x</text>
          <text x={toSvgX(0) + 6} y={18} fontSize="11" fontWeight="bold" fill="#344563">y</text>
          {hasPlot ? (
            <g>
              <circle cx={toSvgX(point.x)} cy={toSvgY(point.y)} r="7" fill="#58CC02" stroke="#FFFFFF" strokeWidth="3" />
              <text x={toSvgX(point.x) + 10} y={toSvgY(point.y) - 6} fontSize="11" fontWeight="bold" fill="#172B4D">
                ({point.x}, {point.y})
              </text>
            </g>
          ) : null}
        </svg>
      </div>

      {/* Keyboard / mobile numeric coordinate controls */}
      <div className="rounded-2xl border border-app-border bg-surface-muted p-4 space-y-3">
        <p className="text-xs font-extrabold text-navy-900">Koordinat Terpilih (Keyboard / Touch)</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor={`gx-${question.questionId}`} className="block text-[11px] font-bold text-text-muted">
              Sumbu X
            </label>
            <Input
              id={`gx-${question.questionId}`}
              type="number"
              min={bounds.minX}
              max={bounds.maxX}
              disabled={disabled}
              value={hasPlot ? point.x : ''}
              onChange={(e) => onChange({ x: Number(e.target.value || 0), y: point.y })}
            />
          </div>
          <div>
            <label htmlFor={`gy-${question.questionId}`} className="block text-[11px] font-bold text-text-muted">
              Sumbu Y
            </label>
            <Input
              id={`gy-${question.questionId}`}
              type="number"
              min={bounds.minY}
              max={bounds.maxY}
              disabled={disabled}
              value={hasPlot ? point.y : ''}
              onChange={(e) => onChange({ x: point.x, y: Number(e.target.value || 0) })}
            />
          </div>
        </div>
        <p className="text-xs font-bold text-blue-700">
          Titik aktif: {hasPlot ? `(${point.x}, ${point.y})` : 'Belum dipilih'}
        </p>
      </div>
    </div>
  );
}

function FormulaInputRenderer({ question, value, onChange, disabled }) {
  return (
    <div className="space-y-3">
      {question.interaction?.expressionDisplay ? (
        <div className="rounded-2xl border border-app-border bg-surface-muted p-4 text-center text-2xl font-black">
          <FormulaBlock blockLatex={question.interaction.expressionDisplay} />
        </div>
      ) : null}
      <MathInput
        id={`formula-${question.questionId}`}
        value={value ?? ''}
        onChange={onChange}
        disabled={disabled}
        placeholder={question.interaction?.placeholder || 'Contoh: x+6'}
      />
    </div>
  );
}

function DiagramLabelRenderer({ question, value, onChange, disabled }) {
  const regions = question.interaction?.regions || [];
  const labels = question.interaction?.labelBank || [];
  const mapping = typeof value === 'object' && value !== null ? value : {};

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-app-border bg-surface-muted p-4 flex items-center justify-center">
        <svg viewBox="0 0 300 190" className="w-full max-w-xs" role="img" aria-label="Diagram segitiga siku-siku dengan penanda R1, R2, R3">
          <path d="M55 150 L255 150 L55 35 Z" fill="#1CB0F6" fillOpacity="0.14" stroke="#1CB0F6" strokeWidth="3" />
          <rect x="55" y="132" width="18" height="18" fill="none" stroke="#172B4D" strokeWidth="2" />
          {regions.map((r) => (
            <g key={r.id} transform={`translate(${r.x}, ${r.y})`}>
              <circle r="15" fill={mapping[r.id] ? '#58CC02' : '#172B4D'} stroke="#FFFFFF" strokeWidth="2" />
              <text y="4" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="bold">
                {r.code}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="space-y-3">
        {regions.map((r) => (
          <div key={r.id}>
            <label htmlFor={`diag-${r.id}`} className="mb-1 block text-xs font-extrabold text-navy-900">
              Label untuk Titik {r.code}
            </label>
            <Select
              id={`diag-${r.id}`}
              disabled={disabled}
              value={mapping[r.id] || ''}
              onChange={(e) => onChange({ ...mapping, [r.id]: e.target.value })}
            >
              <option value="">-- Pilih label bagian --</option>
              {labels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}

function SimulationRenderer({ question, value, onChange, disabled }) {
  const params = question.interaction?.parameters || [
    { id: 'mass', label: 'Massa (m)', unit: 'kg', min: 1, max: 10, step: 1, defaultValue: 2 },
    { id: 'force', label: 'Gaya (F)', unit: 'N', min: 2, max: 50, step: 2, defaultValue: 10 }
  ];
  const [paramState, setParamState] = useState(() => {
    const init = {};
    for (const p of params) init[p.id] = p.defaultValue ?? p.min;
    return init;
  });
  const [running, setRunning] = useState(false);
  const [blockOffset, setBlockOffset] = useState(0);

  const mass = Number(paramState.mass || 2);
  const force = Number(paramState.force || 10);
  const acceleration = Number((force / mass).toFixed(2));

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => {
      setBlockOffset((prev) => (prev + Math.min(18, Math.max(3, acceleration * 2))) % 180);
    }, 120);
    return () => clearInterval(id);
  }, [running, acceleration]);

  const observation = typeof value === 'object' && value !== null ? value.observation ?? '' : value ?? '';

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-app-border bg-surface-muted p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-text-muted">Laboratorium 2D Interaktif</p>
            <div className="text-sm font-extrabold text-navy-900">
              Status: {running ? 'Simulasi Berjalan' : 'Siaga / Dijeda'}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant={running ? 'secondary' : 'primary'} onClick={() => setRunning((r) => !r)}>
              {running ? <Pause className="h-3.5 w-3.5" aria-hidden="true" /> : <Play className="h-3.5 w-3.5" aria-hidden="true" />}
              {running ? 'Pause' : 'Play'}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setRunning(false);
                setBlockOffset(0);
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Reset
            </Button>
          </div>
        </div>

        {/* Visual track */}
        <div className="relative flex h-24 items-center overflow-hidden rounded-xl border border-app-border bg-white px-4">
          <div
            className="grid h-14 w-16 place-items-center rounded-xl bg-blue-500 text-xs font-black text-white shadow"
            style={{ transform: `translateX(${blockOffset}px)` }}
          >
            {mass} kg
          </div>
          <div className="ml-4 text-xs font-extrabold text-orange-700">
            → F = {force} N
          </div>
          <div className="ml-auto text-right">
            <p className="text-[11px] font-bold text-text-muted">Percepatan Terukur</p>
            <p className="font-display text-xl font-black tabular-nums text-navy-900">
              {acceleration} {question.interaction?.unit || 'm/s²'}
            </p>
          </div>
        </div>

        {/* Sliders + accessible direct numeric inputs */}
        <div className="grid gap-3 sm:grid-cols-2">
          {params.map((p) => (
            <div key={p.id} className="rounded-xl border border-app-border bg-white p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-extrabold">
                <label htmlFor={`sim-range-${p.id}`}>{p.label}</label>
                <span className="tabular-nums text-blue-700">
                  {paramState[p.id]} {p.unit}
                </span>
              </div>
              <input
                id={`sim-range-${p.id}`}
                type="range"
                min={p.min}
                max={p.max}
                step={p.step || 1}
                value={paramState[p.id]}
                onChange={(e) => setParamState((prev) => ({ ...prev, [p.id]: Number(e.target.value) }))}
                className="w-full accent-brand-500"
              />
              <Input
                type="number"
                aria-label={`Nilai angka ${p.label}`}
                min={p.min}
                max={p.max}
                value={paramState[p.id]}
                onChange={(e) =>
                  setParamState((prev) => ({
                    ...prev,
                    [p.id]: Math.max(p.min, Math.min(p.max, Number(e.target.value || p.min)))
                  }))
                }
                className="!min-h-9 !text-xs"
              />
            </div>
          ))}
        </div>

        {question.interaction?.formulaLatex ? (
          <div className="rounded-xl bg-white p-2 text-sm">
            <FormulaBlock blockLatex={question.interaction.formulaLatex} />
          </div>
        ) : null}
      </div>

      <div>
        <label htmlFor={`sim-obs-${question.questionId}`} className="mb-1.5 block text-xs font-extrabold text-navy-900">
          Masukkan Hasil Observasi Percepatan ({question.interaction?.unit || 'm/s²'})
        </label>
        <Input
          id={`sim-obs-${question.questionId}`}
          type="text"
          inputMode="decimal"
          disabled={disabled}
          value={observation}
          placeholder="Contoh: 5"
          onChange={(e) => onChange({ observation: e.target.value, parameters: paramState })}
        />
      </div>
    </div>
  );
}

function WorkedSolutionRenderer({ question, value, onChange, disabled }) {
  const text = typeof value === 'object' && value !== null ? value.text ?? '' : value ?? '';
  const words = String(text).trim().split(/\s+/).filter(Boolean).length;
  const minWords = Number(question.interaction?.minWords ?? 4);
  return (
    <div className="space-y-2">
      <label htmlFor={`work-${question.questionId}`} className="block text-xs font-extrabold text-navy-900">
        Langkah Penyelesaian & Penalaran
      </label>
      <Textarea
        id={`work-${question.questionId}`}
        rows={5}
        disabled={disabled}
        value={text}
        placeholder={question.interaction?.placeholder || 'Tuliskan langkah pengerjaan dan alasan setiap operasi...'}
        onChange={(e) => onChange({ text: e.target.value })}
      />
      <div className="flex justify-between text-xs font-bold text-text-muted">
        <span>Minimal {minWords} kata</span>
        <span>{words} kata tertulis</span>
      </div>
    </div>
  );
}

export const QUESTION_RENDERER_MAP = {
  single_choice: SingleChoiceRenderer,
  multiple_select: MultipleSelectRenderer,
  true_false: TrueFalseRenderer,
  numeric: NumericRenderer,
  short_text: ShortTextRenderer,
  fill_blank: FillBlankRenderer,
  matching: MatchingRenderer,
  ordering: OrderingRenderer,
  drag_drop: DragDropRenderer,
  graph_plot: GraphPlotRenderer,
  formula_input: FormulaInputRenderer,
  diagram_label: DiagramLabelRenderer,
  simulation: SimulationRenderer,
  worked_solution: WorkedSolutionRenderer
};

export function QuestionRenderer({ question, value, onChange, disabled = false }) {
  const normalizedType = question?.type === 'essay' ? 'worked_solution' : question?.type;
  const Control = QUESTION_RENDERER_MAP[normalizedType] || SingleChoiceRenderer;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge tone="info">{QUESTION_TYPE_LABELS[normalizedType] || normalizedType}</Badge>
        {question.delivery?.responsePolicy?.difficulty ? (
          <Badge tone="neutral">Level: {question.delivery.responsePolicy.difficulty}</Badge>
        ) : null}
      </div>

      <h2 className="font-display text-lg font-extrabold leading-snug text-navy-900 sm:text-xl">
        <FormulaBlock content={question.content?.stem || ''} />
      </h2>

      {question.content?.instruction ? (
        <p className="text-sm font-semibold text-text-secondary">{question.content.instruction}</p>
      ) : null}

      <Control question={question} value={value} onChange={onChange} disabled={disabled} />
    </div>
  );
}
