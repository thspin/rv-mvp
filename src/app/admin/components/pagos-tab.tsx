'use client';

import { Athlete } from '@/lib/db';

interface PagosTabProps {
  pendingPagos: Athlete[];
  onApprove: (athlete: Athlete) => void;
  onReject: (athlete: Athlete) => void;
}

export function PagosTab({ pendingPagos, onApprove, onReject }: PagosTabProps) {
  return (
    <div className="space-y-4">
      {pendingPagos.length === 0 ? (
        <div className="bg-card rounded-xl p-8 text-center border border-border">
          <p className="text-muted-foreground">No hay comprobantes de pago pendientes de revision</p>
        </div>
      ) : (
        pendingPagos.map(athlete => (
          <div key={athlete.id} className="bg-card rounded-xl p-6 border border-border">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="font-semibold text-foreground">{athlete.name || "Sin nombre"}</h3>
                <p className="text-sm text-muted-foreground">{athlete.email}</p>
                <p className="text-sm text-muted-foreground">Metodo: {athlete.payment_method || "No especificado"}</p>
                {athlete.payment_receipt_url && (
                  <a href={`/api/storage/receipts?filename=${athlete.payment_receipt_url}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                    Ver comprobante
                  </a>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onApprove(athlete)}
                  className="px-4 py-2 bg-success text-success-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Aprobar
                </button>
                <button
                  onClick={() => onReject(athlete)}
                  className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Rechazar
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
