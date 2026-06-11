'use client';

import { useState } from 'react';
import { Athlete } from '@/lib/db';
import { X, Eye } from 'lucide-react';

interface AptosTabProps {
  pendingAptos: Athlete[];
  onApprove: (athlete: Athlete) => void;
  onReject: (athlete: Athlete) => void;
}

export function AptosTab({ pendingAptos, onApprove, onReject }: AptosTabProps) {
  const [selectedCert, setSelectedCert] = useState<{ url: string; name: string } | null>(null);

  const handleOpenCert = (athlete: Athlete) => {
    if (!athlete.apto_medico_url) return;
    const url = `/api/storage/medical-certs?filename=${athlete.apto_medico_url}`;
    setSelectedCert({ url, name: athlete.name || 'Atleta' });
  };

  return (
    <div className="space-y-4">
      {pendingAptos.length === 0 ? (
        <div className="bg-card rounded-xl p-8 text-center border border-border">
          <p className="text-muted-foreground text-sm font-medium">No hay aptos médicos pendientes de revisión</p>
        </div>
      ) : (
        pendingAptos.map(athlete => (
          <div key={athlete.id} className="bg-card rounded-xl p-6 border border-border flex flex-col justify-between space-y-4 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="font-semibold text-foreground">{athlete.name || "Sin nombre"}</h3>
              </div>
              <div className="flex gap-2 items-center">
                {athlete.apto_medico_url && (
                  <button
                    onClick={() => handleOpenCert(athlete)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-muted/65 hover:bg-muted text-foreground text-xs font-semibold rounded-xl border border-border cursor-pointer transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    Ver Apto Médico
                  </button>
                )}
                <button
                  onClick={() => onApprove(athlete)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow-md hover:shadow-emerald-500/15 transition-all duration-200 cursor-pointer"
                >
                  Aprobar
                </button>
                <button
                  onClick={() => onReject(athlete)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow-md hover:shadow-rose-500/15 transition-all duration-200 cursor-pointer"
                >
                  Rechazar
                </button>
              </div>
            </div>
          </div>
        ))
      )}

      {/* Modal Visor de Apto Médico (sin descargar, emergente en la misma página) */}
      {selectedCert && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
          <div className="bg-card rounded-2xl border border-border max-w-2xl w-full h-[75vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Header del Visor */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
              <h3 className="font-bold text-foreground text-sm">Apto Médico de {selectedCert.name}</h3>
              <button
                onClick={() => setSelectedCert(null)}
                className="text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Contenido / Visor */}
            <div className="flex-1 bg-zinc-950 flex items-center justify-center p-4 overflow-auto relative">
              {selectedCert.url.toLowerCase().includes('pdf') ? (
                <iframe
                  src={selectedCert.url}
                  className="w-full h-full border-0 rounded-lg"
                  title="Apto Médico PDF"
                />
              ) : (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={selectedCert.url}
                    alt="Apto Médico"
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
