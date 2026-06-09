'use client';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Athlete } from '@/lib/db';
import { isProfileComplete } from '@/lib/utils';

interface HeaderAlertProps {
  user: Athlete | null;
}

export default function HeaderAlert({ user }: HeaderAlertProps) {
  if (!user || isProfileComplete(user)) return null;

  return (
    <div className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs sm:text-sm font-bold py-3 px-4 flex items-center justify-center gap-2 shadow-md relative z-40 animate-fade-in text-center transition-colors">
      <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0 animate-pulse text-zinc-950" />
      <span>Tu perfil está incompleto. Completa tus datos y documentación obligatorios para poder unirte a un equipo.</span>
      <Link href="/perfil" className="underline flex items-center gap-1 hover:text-black transition-colors ml-1">
        Completar ahora <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
      </Link>
    </div>
  );
}
