import {
  AlertTriangle,
  Award,
  Check,
  CheckCircle2,
  Info,
  Lock,
  PlayCircle,
  Sparkles,
  XCircle
} from 'lucide-react';

const STATUS_STYLE_MAP = {
  success: {
    cls: 'bg-success-50 text-success-600 border-green-200',
    Icon: CheckCircle2
  },
  error: {
    cls: 'bg-red-50 text-red-700 border-red-200',
    Icon: XCircle
  },
  warning: {
    cls: 'bg-orange-50 text-orange-700 border-orange-200',
    Icon: AlertTriangle
  },
  info: {
    cls: 'bg-blue-50 text-blue-700 border-blue-200',
    Icon: Info
  },
  ai: {
    cls: 'bg-purple-50 text-purple-700 border-purple-200',
    Icon: Sparkles
  },
  locked: {
    cls: 'bg-surface-subtle text-text-secondary border-app-border',
    Icon: Lock
  },
  completed: {
    cls: 'bg-brand-50 text-brand-700 border-green-200',
    Icon: Check
  },
  in_progress: {
    cls: 'bg-blue-50 text-blue-700 border-blue-200',
    Icon: PlayCircle
  },
  mastered: {
    cls: 'bg-purple-50 text-purple-700 border-purple-200',
    Icon: Award
  },
  neutral: {
    cls: 'bg-surface-subtle text-navy-700 border-app-border',
    Icon: null
  }
};

export function Badge({ tone = 'neutral', children, showIcon = true, className = '' }) {
  const conf = STATUS_STYLE_MAP[tone] || STATUS_STYLE_MAP.neutral;
  const Icon = conf.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-extrabold ${conf.cls} ${className}`}
    >
      {showIcon && Icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
      <span>{children}</span>
    </span>
  );
}
