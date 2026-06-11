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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-sm hover:shadow-md hover:shadow-emerald-500/15 transition-all duration-200 cursor-pointer"
                >
                  Aprobar
                </button>
                <button
                  onClick={() => onReject(athlete)}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-bold shadow-sm hover:shadow-md hover:shadow-rose-500/15 transition-all duration-200 cursor-pointer"
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
