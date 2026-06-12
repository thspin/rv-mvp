'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, Loader2 } from 'lucide-react';
import { getPricingConfig, updatePricingConfig } from '@/lib/settings';
import { SUPPORTED_CURRENCIES, type SupportedCurrency } from '@/lib/db-types';
import { useToast } from '@/components/ui/toast';

const DUE_DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => i + 1);

export function ConfiguracionTab() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState<number>(17000);
  const [currency, setCurrency] = useState<SupportedCurrency>('ARS');
  const [dueDay, setDueDay] = useState<number>(1);
  const [original, setOriginal] = useState({ amount: 17000, currency: 'ARS' as SupportedCurrency, dueDay: 1 });

  useEffect(() => {
    let cancelled = false;
    getPricingConfig()
      .then((cfg) => {
        if (cancelled) return;
        setAmount(cfg.amount);
        setCurrency(cfg.currency);
        setDueDay(cfg.dueDay);
        setOriginal({ amount: cfg.amount, currency: cfg.currency, dueDay: cfg.dueDay });
      })
      .catch(() => { /* keep defaults */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const isDirty =
    amount !== original.amount ||
    currency !== original.currency ||
    dueDay !== original.dueDay;

  const handleSave = async () => {
    setSaving(true);
    try {
      const next = await updatePricingConfig({ amount, currency, dueDay });
      setOriginal({ amount: next.amount, currency: next.currency, dueDay: next.dueDay });
      success('Configuracion guardada');
    } catch (err) {
      error('No se pudo guardar la configuracion');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-xl p-12 border border-border flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-5 border-b border-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Settings className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Cuota y Vencimiento</h2>
            <p className="text-xs text-muted-foreground">
              Define el monto mensual, la moneda y el dia de vencimiento de la cuota.
            </p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Monto mensual
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                  {currency}
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full pl-14 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Moneda
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Dia de vencimiento del mes
            </label>
            <select
              value={dueDay}
              onChange={(e) => setDueDay(Math.max(1, Math.min(28, Number(e.target.value))))}
              className="w-full md:w-64 px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {DUE_DAY_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  Dia {d}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Limitado a dias 1-28 para evitar problemas con meses cortos.
            </p>
          </div>

          <div className="flex items-center justify-end pt-2 border-t border-border">
            <button
              onClick={handleSave}
              disabled={!isDirty || saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Guardar cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
