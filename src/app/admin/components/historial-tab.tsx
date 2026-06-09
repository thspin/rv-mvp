'use client';

import { Payment } from '@/lib/db';

interface HistorialTabProps {
  payments: Payment[];
}

export function HistorialTab({ payments }: HistorialTabProps) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Fecha</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Atleta</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Monto</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Metodo</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {payments.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No hay pagos registrados
                </td>
              </tr>
            ) : (
              payments.map(payment => (
                <tr key={payment.id}>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {new Date(payment.created_at).toLocaleDateString("es-AR")}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">{payment.athlete_name}</td>
                  <td className="px-4 py-3 text-sm text-foreground">${payment.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{payment.method}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      payment.status === "aprobado" 
                        ? "bg-success/20 text-success" 
                        : "bg-destructive/20 text-destructive"
                    }`}>
                      {payment.status}
                    </span>
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
