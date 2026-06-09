'use client';

import { Athlete } from '@/lib/db';

interface AtletasTabProps {
  activeMembers: Athlete[];
  onManualPayment: (athlete: Athlete) => void;
  onExpel: (athlete: Athlete) => void;
}

function PaymentBadge({ status }: { status: string | null | undefined }) {
  const config: Record<string, { label: string; className: string }> = {
    Pagado: { label: 'Pagado', className: 'bg-success/20 text-success' },
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
    no_entregado: { label: 'No entregado', className: 'bg-muted text-muted-foreground' },
  };
  const entry = status ? config[status] : undefined;
  return (
    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${entry?.className || 'bg-muted text-muted-foreground'}`}>
      {entry?.label || status || 'Sin estado'}
    </span>
  );
}

export function AtletasTab({ activeMembers, onManualPayment, onExpel }: AtletasTabProps) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Atleta</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">DNI</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Cuota</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Apto</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {activeMembers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No hay atletas activos
                </td>
              </tr>
            ) : (
              activeMembers.map(athlete => (
                <tr key={athlete.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{athlete.name || "Sin nombre"}</p>
                    <p className="text-xs text-muted-foreground">{athlete.email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">{athlete.dni || "-"}</td>
                  <td className="px-4 py-3"><PaymentBadge status={athlete.payment_status} /></td>
                  <td className="px-4 py-3"><AptoBadge status={athlete.apto_medico_status} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      {athlete.payment_status !== "Pagado" && athlete.payment_status !== "Pendiente_Verificacion" && (
                        <button
                          onClick={() => onManualPayment(athlete)}
                          className="px-3 py-1 bg-success text-success-foreground rounded text-xs hover:opacity-90"
                        >
                          Pago manual
                        </button>
                      )}
                      <button
                        onClick={() => onExpel(athlete)}
                        className="px-3 py-1 bg-destructive text-destructive-foreground rounded text-xs hover:opacity-90"
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
    </div>
  );
}
