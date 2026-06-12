'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Clock, MapPin, Users, Moon, Calendar, Plus } from 'lucide-react';
import { Archivo } from 'next/font/google';

const archivoFont = Archivo({
  subsets: ['latin'],
  weight: ['800', '900'],
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAY_FULL   = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const LEVEL_STYLES: Record<string, { badge: string; label: string }> = {
  easy:   { badge: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/45 dark:border-emerald-800 dark:text-emerald-300',  label: 'Fácil'    },
  medium: { badge: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/45 dark:border-amber-800 dark:text-amber-300',  label: 'Moderado' },
  hard:   { badge: 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/45 dark:border-red-800 dark:text-red-300',    label: 'Intenso'  },
};

function getWeekDates(referenceDate = new Date()) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(referenceDate);
    d.setDate(referenceDate.getDate() - referenceDate.getDay() + i);
    return d;
  });
}

function getWeekNumber(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// ─── Sub-components ───────────────────────────────────────────────────────────
interface DayChipProps {
  date: Date;
  isActive: boolean;
  hasSessions: boolean;
  onClick: () => void;
}

function DayChip({ date, isActive, hasSessions, onClick }: DayChipProps) {
  const dow = date.getDay();
  return (
    <button
      onClick={onClick}
      type="button"
      className={[
        'flex flex-col items-center gap-0.5 flex-1 py-2 px-1 rounded-xl border transition-all cursor-pointer outline-none',
        isActive
          ? 'bg-[#990000] border-[#990000] text-white shadow-sm shadow-[#990000]/10'
          : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850',
      ].join(' ')}
    >
      <span
        className={`text-[9px] font-extrabold uppercase tracking-wider ${
          isActive ? 'text-red-100' : 'text-slate-400'
        }`}
      >
        {DAY_LABELS[dow]}
      </span>
      <span
        className={`text-xs font-black ${
          isActive ? 'text-white' : 'text-slate-800 dark:text-slate-100'
        }`}
      >
        {date.getDate()}
      </span>
      <span
        className={`w-1 h-1 rounded-full ${
          isActive
            ? 'bg-red-200'
            : hasSessions
            ? 'bg-[#990000]'
            : 'bg-transparent'
        }`}
      />
    </button>
  );
}

function LevelBadge({ level }: { level: string }) {
  const { badge, label } = LEVEL_STYLES[level] ?? LEVEL_STYLES.easy;
  return (
    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${badge}`}>
      {label}
    </span>
  );
}

interface MetaChipProps {
  icon: React.ReactNode;
  label: string;
}

function MetaChip({ icon, label }: MetaChipProps) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
      {icon}
      <span>{label}</span>
    </span>
  );
}

function RestCard() {
  return (
    <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center bg-white dark:bg-slate-900/50">
      <Moon className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Día de descanso activo</p>
    </div>
  );
}

interface SessionCardProps {
  session: any;
  onClick?: () => void;
}

function SessionCard({ session, onClick }: SessionCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 space-y-4 text-left transition-all ${
        onClick ? 'hover:border-[#990000]/40 hover:shadow-md cursor-pointer hover:scale-[1.01]' : 'shadow-sm'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-bold text-slate-850 dark:text-slate-100 leading-snug">
          {session.name}
        </p>
        <LevelBadge level={session.level} />
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1 border-t border-slate-50 dark:border-slate-850">
        <MetaChip icon={<Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />} label={session.time} />
        {session.location && (
          <MetaChip icon={<MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />} label={session.location} />
        )}
        {session.group && (
          <MetaChip icon={<Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />} label={session.group} />
        )}
      </div>

      {/* Notes / Instructions */}
      {session.notes && (
        <div className="mt-2 text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850 leading-relaxed font-medium">
          {session.notes}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface TrainingScheduleProps {
  sessionsByDow?: Record<number, any[]>;
  onAddSession?: () => void;
  onEditSession?: (session: any) => void;
  isAdmin?: boolean;
}

export default function TrainingSchedule({
  sessionsByDow = {},
  onAddSession,
  onEditSession,
  isAdmin = false,
}: TrainingScheduleProps) {
  const today     = new Date();
  const weekDates = getWeekDates(today);
  const [activeDay, setActiveDay] = useState(today.getDay());

  const activeSessions = sessionsByDow[activeDay] ?? [];

  return (
    <div className="flex flex-col bg-slate-50 dark:bg-slate-950 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden w-full max-w-2xl mx-auto">

      {/* ── Top bar ─────────────────────────────────────── */}
      <header className="bg-white dark:bg-slate-900 px-6 py-4 border-b border-slate-150 dark:border-slate-850">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#990000]" />
            <h2 className={`${archivoFont?.className || ''} text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight`}>
              Entrenamientos
            </h2>
          </div>
          {isAdmin && onAddSession && (
            <button
              onClick={onAddSession}
              type="button"
              className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#990000] hover:bg-[#660000] px-3.5 py-2 rounded-xl transition-all duration-150 shadow-sm shadow-[#990000]/10 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar
            </button>
          )}
        </div>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1 text-left">
          Semana {getWeekNumber(today)} · {today.toLocaleString('es-AR', { month: 'long', year: 'numeric' })}
        </p>
      </header>

      {/* ── Day strip ───────────────────────────────────── */}
      <div className="flex gap-1.5 px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-150 dark:border-slate-850 overflow-x-auto">
        {weekDates.map((date) => {
          const dow = date.getDay();
          return (
            <DayChip
              key={dow}
              date={date}
              isActive={dow === activeDay}
              hasSessions={(sessionsByDow[dow] ?? []).length > 0}
              onClick={() => setActiveDay(dow)}
            />
          );
        })}
      </div>

      {/* ── Session list ────────────────────────────────── */}
      <main className="flex-1 px-6 py-5 space-y-4">
        <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wider text-left">
          {DAY_FULL[activeDay]}
          {activeSessions.length > 0 && ` · ${activeSessions.length} sesión${activeSessions.length > 1 ? 'es' : ''}`}
        </p>

        {activeSessions.length === 0 ? (
          <RestCard />
        ) : (
          <div className="space-y-3">
            {activeSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onClick={isAdmin && onEditSession ? () => onEditSession(session) : undefined}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
