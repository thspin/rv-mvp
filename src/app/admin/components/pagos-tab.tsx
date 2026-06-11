'use client';

import { useState } from 'react';
import { Athlete } from '@/lib/db';
import { X, Check, XCircle, Eye, ShieldAlert, CreditCard } from 'lucide-react';

interface PagosTabProps {
  pendingPagos: Athlete[];
  onApprove: (athlete: Athlete, amount: number, method: string) => void;
  onReject: (athlete: Athlete, reason: string) => void;
  onCondone: (athlete: Athlete) => void;
}

export function PagosTab({ pendingPagos, onApprove, onReject, onCondone }: PagosTabProps) {
  const [selectedReceipt, setSelectedReceipt] = useState<{ url: string; name: string } | null>(null);
  const [rejectingAthlete, setRejectingAthlete] = useState<Athlete | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  
  // State for Option A: Approval Modal
  const [approvingAthlete, setApprovingAthlete] = useState<Athlete | null>(null);
  const [method, setMethod] = useState<'Transferencia' | 'Efectivo' | 'Condonar'>('Transferencia');
  const [amount, setAmount] = useState<number>(17000);
  const [visibleCount, setVisibleCount] = useState<number>(6);

  const handleOpenReceipt = (athlete: Athlete) => {
    if (!athlete.payment_receipt_url) return;
    const url = `/api/storage/receipts?filename=${athlete.payment_receipt_url}`;
    setSelectedReceipt({ url, name: athlete.name || 'Atleta' });
  };

  const handleConfirmReject = () => {
    if (!rejectingAthlete || !rejectReason.trim()) return;
    onReject(rejectingAthlete, rejectReason);
    setRejectingAthlete(null);
    setRejectReason('');
  };

  const handleOpenApproveModal = (athlete: Athlete) => {
    setApprovingAthlete(athlete);
    // Default to Transferencia if they uploaded a receipt, otherwise Efectivo
    const defaultMethod = athlete.payment_status === 'Pendiente_Verificacion' ? 'Transferencia' : 'Efectivo';
    setMethod(defaultMethod);
    setAmount(17000);
  };

  const handleConfirmApprove = () => {
    if (!approvingAthlete) return;
    if (method === 'Condonar') {
      onCondone(approvingAthlete);
    } else {
      onApprove(approvingAthlete, amount, method);
    }
    setApprovingAthlete(null);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">Control y Validación de Pagos</h2>
      <p className="text-xs text-muted-foreground -mt-4">
        Lista de atletas con deudas pendientes. Puedes validar transferencias, registrar pagos en efectivo o condonar la cuota.
      </p>

      {pendingPagos.length === 0 ? (
        <div className="bg-card rounded-xl p-12 text-center border border-border">
          <p className="text-muted-foreground text-sm font-medium">No hay deudas ni pagos pendientes de validación</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingPagos.slice(0, visibleCount).map((athlete) => {
              const hasReceipt = !!athlete.payment_receipt_url;
              const isVerifying = athlete.payment_status === 'Pendiente_Verificacion';

              return (
                <div
                  key={athlete.id}
                  className="bg-card rounded-2xl p-5 border border-border flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  {/* Info del atleta */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <h3 className="font-bold text-foreground text-base leading-tight">
                        {athlete.name || 'Sin nombre'}
                      </h3>
                    </div>

                    {/* Badges de Mora & Estado */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {athlete.mora_months && athlete.mora_months > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-50 dark:bg-red-950/20 text-[#990000] dark:text-red-400 text-[10px] font-extrabold uppercase tracking-wider rounded-full border border-red-200 dark:border-red-900/50">
                          <ShieldAlert className="w-3 h-3" />
                          Mora: {athlete.mora_months} {athlete.mora_months === 1 ? 'mes' : 'meses'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-[10px] font-extrabold uppercase tracking-wider rounded-full border border-amber-200 dark:border-amber-900/50">
                          Sin Mora
                        </span>
                      )}

                      <span
                        className={`inline-flex px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full border ${
                          isVerifying
                            ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/50'
                            : 'bg-zinc-50 dark:bg-zinc-950/20 text-zinc-650 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800'
                        }`}
                      >
                        {isVerifying ? 'Transferencia Subida' : 'Pendiente de Pago'}
                      </span>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="pt-2 border-t border-border flex flex-wrap gap-2 items-center justify-between">
                    <div>
                      {hasReceipt && isVerifying ? (
                        <button
                          onClick={() => handleOpenReceipt(athlete)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted/60 hover:bg-muted text-foreground text-xs font-semibold rounded-lg border border-border cursor-pointer transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Ver Comprobante
                        </button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic flex items-center gap-1">
                          <CreditCard className="w-3.5 h-3.5 text-muted-foreground/60" />
                          Sin comprobante subido
                        </span>
                      )}
                    </div>

                    <div className="flex gap-1.5">
                      {isVerifying && (
                        <button
                          onClick={() => setRejectingAthlete(athlete)}
                          className="p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl cursor-pointer transition-all flex items-center justify-center"
                          title="Rechazar Comprobante"
                        >
                          <XCircle className="w-4.5 h-4.5" />
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenApproveModal(athlete)}
                        className="inline-flex items-center gap-1 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Aprobar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {pendingPagos.length > visibleCount && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setVisibleCount((prev) => prev + 6)}
                className="px-5 py-2.5 bg-card hover:bg-muted text-foreground border border-border rounded-xl text-xs font-bold transition-all duration-200 hover:scale-[1.02] hover:shadow-sm active:scale-[0.98] cursor-pointer shadow-sm"
              >
                Ver más atletas
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal Visor de Comprobantes (sin descargar, emergente en la misma página) */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
          <div className="bg-card rounded-2xl border border-border max-w-2xl w-full h-[75vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Header del Visor */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
              <h3 className="font-bold text-foreground text-sm">Comprobante de {selectedReceipt.name}</h3>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Contenido / Visor */}
            <div className="flex-1 bg-zinc-950 flex items-center justify-center p-4 overflow-auto relative">
              {selectedReceipt.url.toLowerCase().includes('pdf') ? (
                <iframe
                  src={selectedReceipt.url}
                  className="w-full h-full border-0 rounded-lg"
                  title="Comprobante PDF"
                />
              ) : (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={selectedReceipt.url}
                    alt="Comprobante de Pago"
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Simplificado de Aprobación/Procesamiento (Opción A) */}
      {approvingAthlete && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
          <div className="bg-card rounded-2xl border border-border max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-foreground">Aprobar Pago</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Atleta: {approvingAthlete.name}</p>
            </div>

            {/* Selector de Método de Pago */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Medio de Pago</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'Transferencia', label: 'Transf.', activeColor: 'bg-indigo-650 dark:bg-indigo-600 text-white border-indigo-750' },
                  { value: 'Efectivo', label: 'Efectivo', activeColor: 'bg-emerald-650 dark:bg-emerald-600 text-white border-emerald-750' },
                  { value: 'Condonar', label: 'Condonar', activeColor: 'bg-amber-600 dark:bg-amber-500 text-white border-amber-700' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setMethod(opt.value as any);
                      if (opt.value === 'Condonar') {
                        setAmount(0);
                      } else if (amount === 0) {
                        setAmount(17000);
                      }
                    }}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-extrabold transition-all text-center cursor-pointer ${
                      method === opt.value
                        ? `${opt.activeColor} ring-2 ring-primary/20 border-transparent shadow-sm`
                        : 'border-border text-muted-foreground bg-transparent hover:bg-muted'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Importe a Abonar */}
            {method !== 'Condonar' ? (
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Monto (ARS)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full pl-7 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary font-bold"
                  />
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 font-semibold leading-relaxed shadow-sm">
                <strong className="text-zinc-950 dark:text-white block mb-0.5 font-bold">Condonación de cuota:</strong>
                Se registrará la deuda de este mes como condonada ($0) y el atleta quedará al día de forma inmediata sin generar mora.
              </div>
            )}

            {/* Acciones */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setApprovingAthlete(null)}
                className="flex-1 py-2.5 bg-muted text-foreground text-xs font-bold rounded-xl hover:opacity-90 transition-opacity cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmApprove}
                className="flex-1 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-500 transition-colors cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para motivo de rechazo */}
      {rejectingAthlete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
          <div className="bg-card rounded-xl p-6 w-full max-w-md border border-border shadow-2xl">
            <h3 className="text-lg font-semibold text-foreground mb-4">Rechazar comprobante de pago</h3>
            <p className="text-xs text-muted-foreground mb-4">Atleta: {rejectingAthlete.name}</p>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-foreground mb-1">Motivo del rechazo</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                rows={3}
                placeholder="Ingresa el motivo del rechazo para informar al atleta..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setRejectingAthlete(null); setRejectReason(''); }}
                className="flex-1 py-2 bg-muted text-foreground rounded-xl font-medium text-xs hover:opacity-90 transition-opacity cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmReject}
                className="flex-1 py-2 bg-destructive text-destructive-foreground rounded-xl font-medium text-xs hover:opacity-90 transition-opacity cursor-pointer"
              >
                Confirmar rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
