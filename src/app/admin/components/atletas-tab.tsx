'use client';

import { Athlete } from '@/lib/db';
import { Pagination } from '@/components/ui/pagination';

interface AtletasTabProps {
  activeMembers: Athlete[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onExpel: (athlete: Athlete) => void;
}

function PaymentBadge({ status }: { status: string | null | undefined }) {
  const config: Record<string, { label: string; className: string }> = {
    Pagado: { label: 'Al día', className: 'bg-success/20 text-success' },
    Pendiente_Pago: { label: 'Pendiente', className: 'bg-warning/20 text-warning' },
    Pendiente_Verificacion: { label: 'En revision', className: 'bg-primary/20 text-primary' },
    Vencido: { label: 'Vencido', className: 'bg-destructive/20 text-destructive' },
  };
  const entry = status ? config[status] : undefined;
  return (
    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${entry?.className || 'bg-muted text-muted-foreground'}`}>
      {entry?.label || status || 'Sin estado'}
    </span>
  );
}

function AptoBadge({ status }: { status: string | null | undefined }) {
  const config: Record<string, { label: string; className: string }> = {
    vigente: { label: 'Vigente', className: 'bg-success/20 text-success' },
    pendiente_verificacion: { label: 'En revision', className: 'bg-primary/20 text-primary' },
    rechazado: { label: 'Rechazado', className: 'bg-destructive/20 text-destructive' },
    vencido: { label: 'Vencido', className: 'bg-destructive/20 text-destructive' },
    no_entregado: { label: 'No entregado', className: 'bg-muted text-muted-foreground' },
  };
  const entry = status ? config[status] : undefined;
  return (
    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${entry?.className || 'bg-muted text-muted-foreground'}`}>
      {entry?.label || status || 'Sin estado'}
    </span>
  );
}

export function AtletasTab({ activeMembers, page, pageSize, total, onPageChange, onExpel }: AtletasTabProps) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-center text-sm font-medium text-foreground">Atleta</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-foreground">Teléfono</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-foreground">Suscripción</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-foreground">Apto</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {activeMembers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
                  No hay atletas activos
                </td>
              </tr>
            ) : (
              activeMembers.map(athlete => (
                <tr key={athlete.id}>
                  <td className="px-4 py-3 text-sm text-center">
                    <p className="font-medium text-foreground">{athlete.name || "Sin nombre"}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-foreground">{athlete.phone || "-"}</td>
                  <td className="px-4 py-3 text-sm text-center"><PaymentBadge status={athlete.payment_status} /></td>
                  <td className="px-4 py-3 text-sm text-center"><AptoBadge status={athlete.apto_medico_status} /></td>
                  <td className="px-4 py-3 text-sm text-center">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => onExpel(athlete)}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-200 cursor-pointer"
                      >
                        Dar de baja
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-border px-4">
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
}
