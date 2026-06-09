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
                  className="px-4 py-2 bg-success text-success-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Aceptar
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
