'use client';

import { useState, useMemo, useEffect } from 'react';
import { Athlete } from '@/lib/db';
import { Pagination } from '@/components/ui/pagination';
import Image from 'next/image';
import { User } from 'lucide-react';

interface SolicitudesTabProps {
  pendingSolicitudes: Athlete[];
  onAccept: (athlete: Athlete) => void;
  onReject: (athlete: Athlete) => void;
}

const PAGE_SIZE = 12

export function SolicitudesTab({ pendingSolicitudes, onAccept, onReject }: SolicitudesTabProps) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(pendingSolicitudes.length / PAGE_SIZE))
  const paginated = useMemo(
    () => pendingSolicitudes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [pendingSolicitudes, page],
  )

  useEffect(() => {
    if (page > totalPages) setPage(1)
  }, [pendingSolicitudes.length, page, totalPages])

  return (
    <div className="space-y-4">
      {pendingSolicitudes.length === 0 ? (
        <div className="bg-card rounded-xl p-12 text-center border border-border">
          <p className="text-muted-foreground text-sm">No hay solicitudes pendientes</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {paginated.map(athlete => (
              <div key={athlete.id} className="bg-card rounded-xl p-5 border border-border flex flex-col items-center text-center justify-between">
                {/* Foto del atleta e información básica */}
                <div className="flex flex-col items-center space-y-3 w-full">
                  <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-border bg-muted flex items-center justify-center">
                    {athlete.avatar_url ? (
                      <Image
                        src={athlete.avatar_url}
                        alt={athlete.name || "Avatar"}
                        fill
                        sizes="56px"
                        className="object-cover"
                        unoptimized={athlete.avatar_url.includes("googleusercontent.com")}
                      />
                    ) : (
                      <User className="w-7 h-7 text-muted-foreground" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-semibold text-foreground text-sm leading-tight">
                      {athlete.name || "Sin nombre"}
                    </h3>
                    <p className="text-[11px] text-muted-foreground break-all px-2">
                      {athlete.email}
                    </p>
                    {athlete.dni && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-[10px] font-semibold">
                        DNI: {athlete.dni}
                      </span>
                    )}
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex gap-2 w-full mt-4">
                  <button
                    onClick={() => onReject(athlete)}
                    className="flex-1 py-1.5 px-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Rechazar
                  </button>
                  <button
                    onClick={() => onAccept(athlete)}
                    className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Aceptar
                  </button>
                </div>
              </div>
            ))}
          </div>
          {pendingSolicitudes.length > PAGE_SIZE && (
            <div className="flex justify-center pt-2">
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={pendingSolicitudes.length}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
