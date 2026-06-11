'use client';

import { Athlete } from '@/lib/db';

interface SolicitudesTabProps {
  pendingSolicitudes: Athlete[];
  onAccept: (athlete: Athlete) => void;
  onReject: (athlete: Athlete) => void;
}

export function SolicitudesTab({ pendingSolicitudes, onAccept, onReject }: SolicitudesTabProps) {
  return (
    <div className="space-y-4">
      {pendingSolicitudes.length === 0 ? (
        <div className="bg-card rounded-xl p-8 text-center border border-border">
          <p className="text-muted-foreground">No hay solicitudes pendientes</p>
        </div>
      ) : (
        pendingSolicitudes.map(athlete => (
          <div key={athlete.id} className="bg-card rounded-xl p-6 border border-border">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="font-semibold text-foreground">{athlete.name || "Sin nombre"}</h3>
                <p className="text-sm text-muted-foreground">{athlete.email}</p>
                {athlete.dni && <p className="text-sm text-muted-foreground">DNI: {athlete.dni}</p>}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onAccept(athlete)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-sm hover:shadow-md hover:shadow-emerald-500/15 transition-all duration-200 cursor-pointer"
                >
                  Aceptar
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
