'use client';

import { Athlete } from '@/lib/db';
import Image from 'next/image';
import { User } from 'lucide-react';

interface SolicitudesTabProps {
  pendingSolicitudes: Athlete[];
  onAccept: (athlete: Athlete) => void;
  onReject: (athlete: Athlete) => void;
}

export function SolicitudesTab({ pendingSolicitudes, onAccept, onReject }: SolicitudesTabProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {pendingSolicitudes.length === 0 ? (
        <div className="col-span-full bg-card rounded-[24px] p-12 text-center border border-border">
          <p className="text-muted-foreground text-sm">No hay solicitudes pendientes</p>
        </div>
      ) : (
        pendingSolicitudes.map(athlete => (
          <div key={athlete.id} className="bg-card rounded-[24px] p-6 border border-border flex flex-col items-center text-center justify-between shadow-sm hover:shadow-md transition-shadow duration-200">
            {/* Foto del atleta e información básica */}
            <div className="flex flex-col items-center space-y-4 w-full">
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-border bg-muted flex items-center justify-center">
                {athlete.avatar_url ? (
                  <Image
                    src={athlete.avatar_url}
                    alt={athlete.name || "Avatar"}
                    fill
                    sizes="64px"
                    className="object-cover"
                    unoptimized={athlete.avatar_url.includes("googleusercontent.com")}
                  />
                ) : (
                  <User className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              
              <div className="space-y-1">
                <h3 className="font-bold text-foreground text-base leading-tight">
                  {athlete.name || "Sin nombre"}
                </h3>
                <p className="text-xs text-muted-foreground break-all px-2">
                  {athlete.email}
                </p>
                {athlete.dni && (
                  <span className="inline-block mt-1 px-2.5 py-0.5 bg-muted text-muted-foreground rounded-full text-[11px] font-semibold">
                    DNI: {athlete.dni}
                  </span>
                )}
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-2.5 w-full mt-6">
              <button
                onClick={() => onReject(athlete)}
                className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm hover:shadow-md hover:shadow-rose-500/15 transition-all duration-200 cursor-pointer"
              >
                Rechazar
              </button>
              <button
                onClick={() => onAccept(athlete)}
                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm hover:shadow-md hover:shadow-emerald-500/15 transition-all duration-200 cursor-pointer"
              >
                Aceptar
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
