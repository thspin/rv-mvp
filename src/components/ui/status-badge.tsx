import { cn } from '@/lib/utils';

type StatusVariant = 'payment' | 'medical' | 'document';

interface StatusBadgeProps {
  status: string | null | undefined;
  variant: StatusVariant;
  className?: string;
  labelOverrides?: Partial<Record<string, string>>;
}

const paymentConfig: Record<string, { label: string; className: string }> = {
  Pagado:                  { label: 'Pagado',     className: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  Pendiente_Pago:          { label: 'Pendiente',  className: 'bg-amber-50 border-amber-200 text-amber-700' },
  Pendiente_Verificacion:  { label: 'Revisión',   className: 'bg-blue-50 border-blue-200 text-blue-700' },
  Vencido:                 { label: 'Vencido',    className: 'bg-red-50 border-red-200 text-red-700' },
};

const medicalConfig: Record<string, { label: string; className: string }> = {
  vigente:                 { label: 'Vigente',   className: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  pendiente_verificacion:  { label: 'Revisión',  className: 'bg-blue-50 border-blue-200 text-blue-700' },
  rechazado:               { label: 'Rechazado', className: 'bg-red-50 border-red-200 text-red-700' },
  no_entregado:            { label: 'Falta',     className: 'bg-amber-50 border-amber-200 text-amber-700' },
};

const documentConfig: Record<string, { label: string; className: string }> = {
  vigente:                 { label: 'Aprobada',           className: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  pendiente_verificacion:  { label: 'En revisión',        className: 'bg-blue-50 border-blue-200 text-blue-700' },
  rechazado:               { label: 'Rechazada',          className: 'bg-red-50 border-red-200 text-red-700' },
  no_entregado:            { label: 'Falta documentación', className: 'bg-slate-100 border-slate-200 text-slate-500' },
};

const configs = { payment: paymentConfig, medical: medicalConfig, document: documentConfig };

function applyOverrides(
  config: Record<string, { label: string; className: string }>,
  overrides?: Partial<Record<string, string>>
): Record<string, { label: string; className: string }> {
  if (!overrides) return config;
  const result = { ...config };
  for (const [key, label] of Object.entries(overrides)) {
    if (result[key] && label) result[key] = { ...result[key], label };
  }
  return result;
}

export function StatusBadge({ status, variant, className, labelOverrides }: StatusBadgeProps) {
  const baseConfig = configs[variant];
  const config = applyOverrides(baseConfig, labelOverrides);
  const entry = status ? config[status] : undefined;

  if (!entry) {
    if (variant === 'document') {
      const fallback = config['no_entregado'];
      return (
        <span className={cn(
          'inline-flex px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border',
          fallback.className,
          className
        )}>
          {fallback.label}
        </span>
      );
    }
    return null;
  }

  return (
    <span className={cn(
      'inline-flex px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border',
      entry.className,
      className
    )}>
      {entry.label}
    </span>
  );
}
