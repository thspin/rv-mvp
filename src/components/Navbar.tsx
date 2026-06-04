'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getCurrentUserAsync, setCurrentUserEmail, getAthletesAsync, Athlete } from '@/lib/db';
import { LogOut, Shield, Compass, Grid, User } from 'lucide-react';
import Link from 'next/link';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<Athlete | null>(null);

  useEffect(() => {
    loadUser();
  }, [pathname]);

  const loadUser = async () => {
    const currentUser = await getCurrentUserAsync();
    setUser(currentUser);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setCurrentUserEmail(null);
    router.push('/');
  };

  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* NAV LINKS */}
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-1">
              {user.role === 'admin' ? (
                <Link
                  href="/admin"
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 ${
                    pathname === '/admin'
                      ? 'bg-blue-50 text-blue-700 border border-blue-100'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  Administracion
                </Link>
              ) : (
                <>
                  <Link
                    href="/dashboard"
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 ${
                      pathname === '/dashboard'
                        ? 'bg-blue-50 text-blue-700 border border-blue-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Grid className="w-4 h-4" />
                    Mi Panel
                  </Link>

                  <Link
                    href="/equipos"
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 ${
                      pathname === '/equipos'
                        ? 'bg-blue-50 text-blue-700 border border-blue-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Compass className="w-4 h-4" />
                    Explorar Equipos
                  </Link>

                  <Link
                    href="/perfil"
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 ${
                      pathname === '/perfil'
                        ? 'bg-blue-50 text-blue-700 border border-blue-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    Mi Perfil
                  </Link>
                </>
              )}
            </nav>
          </div>

          {/* USER ACTIONS */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              <div className="hidden sm:block text-right">
                <div className="text-sm font-semibold text-slate-900 leading-tight">
                  {user.name}
                </div>
                <div className="text-xs text-slate-500 leading-none mt-0.5">
                  {user.email}
                </div>
              </div>

              <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-semibold text-sm">
                {user.name ? user.name[0].toUpperCase() : 'U'}
              </div>

              <button
                onClick={handleLogout}
                title="Cerrar sesion"
                className="p-2 text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-xl transition-all duration-150 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
