'use client';
import { AlertTriangle, ArrowRight, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { Athlete } from '@/lib/db';
import { isProfileComplete } from '@/lib/utils';

interface HeaderAlertProps {
  user: Athlete | null;
}

export default function HeaderAlert({ user }: HeaderAlertProps) {
  if (!user) return null;

  const isAptoVencido = user.apto_medico_status === 'vencido'
  const isAptoPorVencer = user.apto_medico_status === 'vigente' && user.apto_medico_vencimiento && (() => {
    const daysLeft = Math.ceil((new Date(user.apto_medico_vencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return daysLeft <= 15 && daysLeft > 0
  })()

  if (isAptoVencido) {
    return (
      <div className="w-full bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold py-3 px-4 flex items-center justify-center gap-2 shadow-md relative z-40 animate-fade-in text-center transition-colors">
        <ShieldAlert className="w-4.5 h-4.5 flex-shrink-0 text-white" />
        <span>Tu apto medico esta vencido. Subi un certificado nuevo para poder entrenar.</span>
        <Link href="/dashboard" className="underline flex items-center gap-1 hover:text-red-100 transition-colors ml-1">
          Ir al dashboard <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
        </Link>
      </div>
    )
  }

  if (isAptoPorVencer) {
    const daysLeft = Math.ceil((new Date(user.apto_medico_vencimiento!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return (
      <div className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs sm:text-sm font-bold py-3 px-4 flex items-center justify-center gap-2 shadow-md relative z-40 animate-fade-in text-center transition-colors">
        <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0 animate-pulse text-zinc-950" />
        <span>Tu apto medico vence en {daysLeft} dias. Renova con tiempo para no quedar fuera de los entrenamientos.</span>
        <Link href="/dashboard" className="underline flex items-center gap-1 hover:text-black transition-colors ml-1">
          Ver detalle <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
        </Link>
      </div>
    )
  }

  if (!isProfileComplete(user)) {
    return (
      <div className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs sm:text-sm font-bold py-3 px-4 flex items-center justify-center gap-2 shadow-md relative z-40 animate-fade-in text-center transition-colors">
        <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0 animate-pulse text-zinc-950" />
        <span>Tu perfil esta incompleto. Completa tus datos y documentacion obligatorios para poder unirte a un equipo.</span>
        <Link href="/perfil" className="underline flex items-center gap-1 hover:text-black transition-colors ml-1">
          Completar ahora <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
        </Link>
      </div>
    )
  }

  return null;
}
