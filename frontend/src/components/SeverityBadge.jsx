import React from 'react';
import { AlertCircle, AlertTriangle, Clock, CheckCircle2, ShieldAlert } from 'lucide-react';

export const SEVERITY_CONFIG = {
  1: {
    label: 'Level 1: Critical',
    shortLabel: 'L1 Critical',
    color: 'bg-red-50 text-red-700 border-red-200 ring-red-500/20',
    dot: 'bg-red-600',
    icon: ShieldAlert,
    desc: 'Immediate life threat (resuscitation)',
  },
  2: {
    label: 'Level 2: High',
    shortLabel: 'L2 High',
    color: 'bg-orange-50 text-orange-700 border-orange-200 ring-orange-500/20',
    dot: 'bg-orange-500',
    icon: AlertCircle,
    desc: 'Emergent condition, high risk',
  },
  3: {
    label: 'Level 3: Moderate',
    shortLabel: 'L3 Moderate',
    color: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20',
    dot: 'bg-amber-500',
    icon: AlertTriangle,
    desc: 'Urgent, multiple resources needed',
  },
  4: {
    label: 'Level 4: Low',
    shortLabel: 'L4 Low',
    color: 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/20',
    dot: 'bg-blue-500',
    icon: Clock,
    desc: 'Less urgent, stable vitals',
  },
  5: {
    label: 'Level 5: Minor',
    shortLabel: 'L5 Minor',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20',
    dot: 'bg-emerald-500',
    icon: CheckCircle2,
    desc: 'Non-urgent, routine examination',
  },
};

export const SeverityBadge = ({ severity, hasAged = false, originalSeverity = null, size = 'md' }) => {
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG[3];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3 py-1.5 gap-2 font-semibold',
  }[size] || 'text-xs px-2.5 py-1 gap-1.5';

  return (
    <div className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex items-center rounded-full border shadow-xs ${config.color} ${sizeClasses}`}
        title={config.desc}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`} />
        <span>{size === 'sm' ? config.shortLabel : config.label}</span>
      </span>

      {hasAged && originalSeverity && originalSeverity !== severity && (
        <span
          className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 rounded-md shadow-xs"
          title={`Priority aged from original Level ${originalSeverity} due to prolonged wait`}
        >
          ▲ Aged +{originalSeverity - severity}
        </span>
      )}
    </div>
  );
};
