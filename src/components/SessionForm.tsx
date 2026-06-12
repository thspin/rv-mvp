'use client';

import { useState } from 'react';
import { Calendar, Save, Trash2, X } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const DAY_OPTIONS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

const LEVEL_OPTIONS = [
  { value: 'easy',   label: 'Fácil',    description: 'Recuperación o rodaje liviano' },
  { value: 'medium', label: 'Moderado', description: 'Tempo o series largas' },
  { value: 'hard',   label: 'Intenso',  description: 'Velocidad o pista'  },
];

const LEVEL_STYLES: Record<string, { active: string; dot: string }> = {
  easy:   { active: 'bg-emerald-50 border-emerald-400 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-700', dot: 'bg-emerald-500' },
  medium: { active: 'bg-amber-50 border-amber-400 text-amber-800 dark:bg-amber-950/20 dark:border-amber-700', dot: 'bg-amber-500' },
  hard:   { active: 'bg-red-50 border-red-400 text-red-800 dark:bg-red-950/20 dark:border-red-700', dot: 'bg-red-500' },
};

const EMPTY_FORM = {
  name:     '',
  level:    'easy',
  dow:      1,          // day of week (0 = domingo)
  time:     '07:00',
  location: '',
  group:    '',
  notes:    '',
};

function generateId() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function validate(form: any) {
  const errors: Record<string, string> = {};
  if (!form.name.trim()) errors.name = 'El nombre de la sesión es obligatorio.';
  return errors;
}

// ─── Field wrapper ─────────────────────────────────────────────────────────────
interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

function Field({ label, required, error, children }: FieldProps) {
  return (
    <div className="space-y-1 text-left">
      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs font-semibold text-rose-500">{error}</p>}
    </div>
  );
}

// ─── Input / Textarea base styles ─────────────────────────────────────────────
const inputCls =
  'w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 ' +
  'px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-300 dark:placeholder-slate-700 ' +
  'focus:outline-none focus:ring-1 focus:ring-[#990000]/30 focus:border-[#990000] transition outline-none';

// ─── Level selector ────────────────────────────────────────────────────────────
function LevelSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {LEVEL_OPTIONS.map((opt) => {
        const isActive = value === opt.value;
        const s = LEVEL_STYLES[opt.value];
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={[
              'flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all cursor-pointer outline-none',
              isActive
                ? `${s.active} border-2`
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850',
            ].join(' ')}
          >
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${s.dot}`} />
              <span className="text-[11px] font-bold uppercase tracking-wider">{opt.label}</span>
            </span>
            <span className="text-[9px] font-semibold leading-normal opacity-85 mt-0.5">{opt.description}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Day selector ──────────────────────────────────────────────────────────────
function DaySelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {DAY_OPTIONS.map((d) => (
        <button
          key={d.value}
          type="button"
          onClick={() => onChange(d.value)}
          className={[
            'flex-1 min-w-[42px] py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer outline-none',
            value === d.value
              ? 'bg-[#990000] border-[#990000] text-white shadow-sm shadow-[#990000]/10'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850',
          ].join(' ')}
        >
          {d.label.slice(0, 3)}
        </button>
      ))}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
interface SessionFormProps {
  initialData?: any;
  defaultDow?: number;
  onSave?: (session: any) => void;
  onDelete?: (sessionId: string) => void;
  onCancel?: () => void;
}

export default function SessionForm({
  initialData = null,
  defaultDow  = new Date().getDay(),
  onSave,
  onDelete,
  onCancel,
}: SessionFormProps) {
  const isEditing = !!initialData;

  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    dow: defaultDow,
    ...(initialData ?? {}),
  }));

  const [errors, setErrors]     = useState<Record<string, string>>({});
  const [saving, setSaving]     = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function set(field: string, value: any) {
    const next = { ...form, [field]: value };
    setForm(next);
    if (submitted) setErrors(validate(next));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      const session = {
        ...form,
        id: isEditing ? form.id : generateId(),
      };
      await onSave?.(session);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col bg-white dark:bg-slate-950 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden w-full max-w-lg mx-auto">

      {/* ── Header ──────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-150 dark:border-slate-850 bg-slate-50 dark:bg-slate-900/60">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-bold text-slate-400 hover:text-slate-650 transition cursor-pointer"
        >
          Cancelar
        </button>
        <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
          {isEditing ? 'Editar Sesión' : 'Nueva Sesión'}
        </h2>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="text-xs font-bold text-[#990000] hover:text-[#660000] disabled:opacity-40 transition cursor-pointer"
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </header>

      {/* ── Form body ───────────────────────────────── */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex-1 overflow-y-auto px-6 py-6 space-y-5"
      >

        {/* Nombre */}
        <Field label="Nombre de la sesión" required error={errors.name}>
          <input
            type="text"
            placeholder="Ej: Series de velocidad, Rodaje regenerativo..."
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            className={inputCls}
          />
        </Field>

        {/* Día */}
        <Field label="Día de la semana" required>
          <DaySelector value={form.dow} onChange={(v) => set('dow', v)} />
        </Field>

        {/* Intensidad */}
        <Field label="Intensidad / Nivel">
          <LevelSelector value={form.level} onChange={(v) => set('level', v)} />
        </Field>

        {/* Hora de inicio */}
        <Field label="Hora de inicio">
          <input
            type="time"
            value={form.time}
            onChange={(e) => set('time', e.target.value)}
            className={inputCls}
          />
        </Field>

        {/* Lugar */}
        <Field label="Lugar de encuentro">
          <input
            type="text"
            placeholder="Ej: Parque Central, Pista Municipal, Estadio..."
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
            className={inputCls}
          />
        </Field>

        {/* Grupo */}
        <Field label="Grupo / Nivel">
          <input
            type="text"
            placeholder="Ej: Grupo A, Grupo B, Todos..."
            value={form.group}
            onChange={(e) => set('group', e.target.value)}
            className={inputCls}
          />
        </Field>

        {/* Notas */}
        <Field label="Notas o detalles del entrenamiento">
          <textarea
            rows={4}
            placeholder="Describe la entrada en calor, el bloque principal, series a realizar o cualquier indicación para el atleta..."
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            className={`${inputCls} resize-none leading-relaxed`}
          />
        </Field>

        {/* Botones de Acción al Pie */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-850 flex flex-col gap-2.5">
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-[#990000] hover:bg-[#660000] text-white text-xs font-bold uppercase tracking-wider disabled:opacity-40 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shadow-[#990000]/10"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Guardando…' : isEditing ? 'Guardar Cambios' : 'Agregar Sesión'}
          </button>

          {isEditing && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(form.id)}
              className="w-full py-3 rounded-xl border border-red-200 text-red-650 text-xs font-bold uppercase tracking-wider hover:bg-red-50 dark:hover:bg-red-950/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar Sesión
            </button>
          )}
        </div>

      </form>
    </div>
  );
}
