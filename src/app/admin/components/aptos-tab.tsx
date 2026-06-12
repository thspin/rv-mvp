'use client';

import { useState } from 'react';
import { Athlete } from '@/lib/db';
import { X, Eye, AlertTriangle, Clock, ShieldAlert } from 'lucide-react';

interface AptosTabProps {
  pendingAptos: Athlete[];
  upcomingAptos: Athlete[];
  expiredAptos: Athlete[];
  onApprove: (athlete: Athlete) => void;
  onReject: (athlete: Athlete) => void;
}

function getDaysLeft(vencimiento: string | undefined): number | null {
  if (!vencimiento) return null
  return Math.ceil((new Date(vencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export function AptosTab({ pendingAptos, upcomingAptos, expiredAptos, onApprove, onReject }: AptosTabProps) {
  const [selectedCert, setSelectedCert] = useState<{ url: string; name: string } | null>(null);
  const [activeSection, setActiveSection] = useState<'pendientes' | 'porvencer' | 'vencidos'>('pendientes');

  const handleOpenCert = (athlete: Athlete) => {
    if (!athlete.apto_medico_url) return;
    const url = `/api/storage/medical-certs?filename=${athlete.apto_medico_url}`;
    setSelectedCert({ url, name: athlete.name || 'Atleta' });
  };

  const tabs = [
    { id: 'pendientes' as const, label: 'Pendientes', count: pendingAptos.length, icon: Clock, color: 'text-blue-600' },
    { id: 'porvencer' as const, label: 'Por Vencer', count: upcomingAptos.length, icon: AlertTriangle, color: 'text-amber-600' },
    { id: 'vencidos' as const, label: 'Vencidos', count: expiredAptos.length, icon: ShieldAlert, color: 'text-red-600' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-border">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                activeSection === tab.id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`w-4 h-4 ${tab.color}`} />
              {tab.label}
              {tab.count > 0 && (
                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                  activeSection === tab.id
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeSection === 'pendientes' && (
        <div className="space-y-3">
          {pendingAptos.length === 0 ? (
            <div className="bg-card rounded-xl p-8 text-center border border-border">
              <p className="text-muted-foreground text-sm font-medium">No hay aptos medicos pendientes de revision</p>
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
                        Ver Apto Medico
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
        </div>
      )}

      {activeSection === 'porvencer' && (
        <div className="space-y-3">
          {upcomingAptos.length === 0 ? (
            <div className="bg-card rounded-xl p-8 text-center border border-border">
              <p className="text-muted-foreground text-sm font-medium">No hay aptos medicos proximos a vencer</p>
            </div>
          ) : (
            upcomingAptos.map(athlete => {
              const daysLeft = getDaysLeft(athlete.apto_medico_vencimiento)
              const isCritical = daysLeft !== null && daysLeft <= 7
              return (
                <div key={athlete.id} className={`bg-card rounded-xl p-6 border shadow-sm ${
                  isCritical ? 'border-red-200 bg-red-50/30' : 'border-amber-200 bg-amber-50/30'
                }`}>
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isCritical ? 'bg-red-100' : 'bg-amber-100'
                      }`}>
                        <AlertTriangle className={`w-5 h-5 ${isCritical ? 'text-red-600' : 'text-amber-600'}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{athlete.name || "Sin nombre"}</h3>
                        <p className={`text-xs font-medium ${isCritical ? 'text-red-600' : 'text-amber-600'}`}>
                          Vence en {daysLeft} dias ({athlete.apto_medico_vencimiento ? new Date(athlete.apto_medico_vencimiento).toLocaleDateString('es-AR') : ''})
                        </p>
                      </div>
                    </div>
                    {athlete.apto_medico_url && (
                      <button
                        onClick={() => handleOpenCert(athlete)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-muted text-foreground text-xs font-semibold rounded-xl border border-border cursor-pointer transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        Ver certificado
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {activeSection === 'vencidos' && (
        <div className="space-y-3">
          {expiredAptos.length === 0 ? (
            <div className="bg-card rounded-xl p-8 text-center border border-border">
              <p className="text-muted-foreground text-sm font-medium">No hay aptos medicos vencidos</p>
            </div>
          ) : (
            expiredAptos.map(athlete => (
              <div key={athlete.id} className="bg-card rounded-xl p-6 border border-red-200 bg-red-50/30 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                      <ShieldAlert className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{athlete.name || "Sin nombre"}</h3>
                      <p className="text-xs font-medium text-red-600">
                        Vencio el {athlete.apto_medico_vencimiento ? new Date(athlete.apto_medico_vencimiento).toLocaleDateString('es-AR') : ''}
                      </p>
                    </div>
                  </div>
                  {athlete.apto_medico_url && (
                    <button
                      onClick={() => handleOpenCert(athlete)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-muted text-foreground text-xs font-semibold rounded-xl border border-border cursor-pointer transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      Ver certificado anterior
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {selectedCert && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
          <div className="bg-card rounded-2xl border border-border max-w-2xl w-full h-[75vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
              <h3 className="font-bold text-foreground text-sm">Apto Medico de {selectedCert.name}</h3>
              <button
                onClick={() => setSelectedCert(null)}
                className="text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 bg-zinc-950 flex items-center justify-center p-4 overflow-auto relative">
              {selectedCert.url.toLowerCase().includes('pdf') ? (
                <iframe
                  src={selectedCert.url}
                  className="w-full h-full border-0 rounded-lg"
                  title="Apto Medico PDF"
                />
              ) : (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={selectedCert.url}
                    alt="Apto Medico"
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
