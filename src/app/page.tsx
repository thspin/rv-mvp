'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getCurrentUserAsync, setCurrentUserEmail, getAthletesAsync, Athlete } from '@/lib/db';
import { Sparkles } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const user = await getCurrentUserAsync();
      if (user) {
        redirectUser(user);
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setIsCheckingSession(false);
    }
  };

  const redirectUser = (user: Athlete) => {
    if (!user.onboarding_complete) {
      router.push('/onboarding');
    } else if (user.role === 'admin') {
      router.push('/admin');
    } else {
      router.push('/dashboard');
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
            `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        console.error('Error signing in:', error);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error signing in:', error);
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (email: string) => {
    setIsLoading(true);
    setCurrentUserEmail(email);
    
    const athletes = await getAthletesAsync();
    const user = athletes.find(a => a.email === email);
    
    if (user) {
      redirectUser(user);
    } else {
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse text-slate-600">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 text-slate-900 font-sans antialiased overflow-hidden">
      {/* LEFT SECTION: LOGIN */}
      <div className="w-full md:w-1/2 flex flex-col justify-between p-8 md:p-16 bg-white border-r border-slate-200">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            <span className="text-xs font-semibold text-blue-700 tracking-wide uppercase">RV MVP</span>
          </div>
        </div>

        <div className="max-w-md w-full mx-auto my-auto py-12">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900 mb-6 leading-tight">
            Supera tus limites.
          </h1>
          <p className="text-lg text-slate-600 mb-8">
            Unete a tu equipo de montana, realiza el seguimiento de tus cuotas y manten al dia tus aptos medicos de forma simple.
          </p>

          {/* GOOGLE LOGIN BUTTON */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full py-3.5 px-6 bg-blue-600 text-white hover:bg-blue-700 font-semibold text-sm uppercase tracking-wide rounded-full shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 hover:-translate-y-0.5 active:translate-y-0.5 transition-all duration-200 cursor-pointer flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.186 4.114-3.578 0-6.45-2.872-6.45-6.45s2.872-6.45 6.45-6.45c1.621 0 3.098.59 4.254 1.558l3.125-3.125C19.317 2.19 15.992 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.478 0 10.793-4.537 10.793-11 0-.648-.053-1.125-.152-1.485H12.24z"/>
            </svg>
            {isLoading ? 'Conectando...' : 'Continuar con Google'}
          </button>

          {/* DEMO ACCESS */}
          <div className="mt-8 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">Accesos de prueba (Demo)</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleDemoLogin('admin@rv.com')}
                disabled={isLoading}
                className="py-2 px-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-full text-xs text-slate-700 font-semibold transition-all duration-150 cursor-pointer disabled:opacity-50"
              >
                Admin
              </button>
              <button
                onClick={() => handleDemoLogin('atleta_activo@rv.com')}
                disabled={isLoading}
                className="py-2 px-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-full text-xs text-slate-700 font-semibold transition-all duration-150 cursor-pointer disabled:opacity-50"
              >
                Atleta Activo
              </button>
              <button
                onClick={() => handleDemoLogin('atleta_nuevo@rv.com')}
                disabled={isLoading}
                className="py-2 px-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-full text-xs text-slate-700 font-semibold transition-all duration-150 cursor-pointer disabled:opacity-50"
              >
                Nuevo Usuario
              </button>
              <button
                onClick={() => handleDemoLogin('pendiente_pago@rv.com')}
                disabled={isLoading}
                className="py-2 px-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-full text-xs text-slate-700 font-semibold transition-all duration-150 cursor-pointer disabled:opacity-50"
              >
                Pago Pendiente
              </button>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500 text-center">
          Al continuar, aceptas nuestros Terminos de servicio y Politica de privacidad.
        </div>
      </div>

      {/* RIGHT SECTION: DESIGN */}
      <div className="hidden md:flex w-1/2 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 border-l border-slate-700 justify-center items-center p-12 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_120%,rgba(59,130,246,0.1),transparent_50%)]"></div>
        <div className="max-w-md text-center z-10 space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-blue-400 p-[1px] mx-auto shadow-xl shadow-blue-500/20">
            <div className="w-full h-full bg-slate-900 rounded-2xl flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <h2 className="text-4xl font-bold text-white uppercase tracking-wide">Gestion de Equipos Deportivos</h2>
          <p className="text-lg text-slate-400">
            Una herramienta para coordinadores y atletas. Controla la seguridad medica y administrativa de tus salidas presenciales de montana.
          </p>
        </div>
      </div>
    </div>
  );
}
