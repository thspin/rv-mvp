'use client';

import { Athlete } from '@/lib/db';

interface AptosTabProps {
  pendingAptos: Athlete[];
  onApprove: (athlete: Athlete) => void;
  onReject: (athlete: Athlete) => void;
}

export function AptosTab({ pendingAptos, onApprove, onReject }: AptosTabProps) {
  return (
    <div className="space-y-4">
      {pendingAptos.length === 0 ? (
        <div className="bg-card rounded-xl p-8 text-center border border-border">
          <p className="text-muted-foreground">No hay aptos medicos pendientes de revision</p>
        </div>
      ) : (
        pendingAptos.map(athlete => (
          <div key={athlete.id} className="bg-card rounded-xl p-6 border border-border">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="font-semibold text-foreground">{athlete.name || "Sin nombre"}</h3>
                <p className="text-sm text-muted-foreground">{athlete.email}</p>
                {athlete.apto_medico_url && (
                  <a href={`/api/storage/medical-certs?filename=${athlete.apto_medico_url}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                    Ver documento
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
