import React from 'react';
import { Check, X, Code, Hand, Infinity, Clock, Wrench } from 'lucide-react';

export type IndicatorType = 'method' | 'status';

type IndicatorValue =
  | 'Automático'
  | 'Semiautomático'
  | 'Manual'
  | 'Actualizado'
  | 'Desactualizado'
  | 'Permanente'
  | 'Pendiente de acción manual'
  | string
  | null
  | undefined;

interface StatusIndicatorProps {
  type: IndicatorType;
  value: IndicatorValue;
}

const INDICATOR_STYLES: Record<
  string,
  {
    icon: React.ReactNode;
    className: string;
  }
> = {
  Automático: {
    icon: <Code className="w-2 h-2 stroke-[3]" />,
    className:
      'bg-emerald-500/20 border-emerald-500/50 text-emerald-400',
  },
  Semiautomático: {
    icon: <Wrench className="w-2 h-2 stroke-[3]" />,
    className:
      'bg-amber-500/20 border-amber-500/50 text-amber-400',
  },
  Manual: {
    icon: <Hand className="w-2 h-2 stroke-[3]" />,
    className:
      'bg-purple-500/20 border-purple-500/50 text-purple-400',
  },
  Actualizado: {
    icon: <Check className="w-2 h-2 stroke-[3]" />,
    className:
      'bg-emerald-500/20 border-emerald-500/50 text-emerald-400',
  },
  Desactualizado: {
    icon: <X className="w-2 h-2 stroke-[3]" />,
    className:
      'bg-rose-500/20 border-rose-500/50 text-rose-400',
  },
  Permanente: {
    icon: <Infinity className="w-2 h-2 stroke-[3]" />,
    className:
      'bg-sky-500/20 border-sky-500/50 text-sky-400',
  },
  Provisional: {
    icon: <Clock className="w-2 h-2 stroke-[3]" />,
    className:
      'bg-purple-500/20 border-purple-500/50 text-purple-400',
  },
  'Pendiente de acción manual': {
    icon: <span className="text-[9px] font-bold">!</span>,
    className:
      'bg-amber-500/20 border-amber-500/50 text-amber-400',
  },
};

const IconIndicator: React.FC<StatusIndicatorProps> = ({
  type,
  value,
}) => {
  const isMethod = type === 'method';

  const tooltipPrefix = isMethod
    ? 'Método de actualización'
    : 'Estado';

  const tooltipValue = value ?? 'No definido / Nulo';
  const tooltip = `${tooltipPrefix}: ${tooltipValue}`;

  const config = value ? INDICATOR_STYLES[value] : undefined;

  // Preserve the original method badge fallback: Manual.
  const effectiveConfig =
    config ??
    (isMethod
      ? INDICATOR_STYLES['Manual']
      : undefined);

  const icon = effectiveConfig?.icon ?? '-';

  const className = effectiveConfig?.className ??
    'bg-slate-800 border-slate-700 text-slate-500';

  const sizeClass = isMethod
    ? 'w-4 h-4 text-[10px]'
    : 'w-3.5 h-3.5 text-[9px] font-bold';

  return (
    <span
      className={`${sizeClass} rounded-full border flex items-center justify-center ${className} cursor-help`}
      title={tooltip}
      aria-label={tooltip}
      role="img"
    >
      {icon}
    </span>
  );
};

export default IconIndicator;