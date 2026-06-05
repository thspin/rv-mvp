'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getCurrentUserAsync, Athlete } from '@/lib/db';
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

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse text-slate-600 font-medium">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900 font-sans antialiased relative overflow-hidden px-4">
      {/* Background radial effects for premium feel */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(59,130,246,0.06),transparent_40%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(99,102,241,0.06),transparent_45%)]"></div>

      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-100/40 p-8 md:p-10 z-10 text-center space-y-8 transition-all duration-300">
        {/* Logo / Icon */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-950 p-[1px] shadow-lg shadow-slate-950/10">
          <div className="w-full h-full bg-white rounded-2xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-slate-950" />
          </div>
        </div>

        {/* Header Texts */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-slate-950">
            Superá tus límites.
          </h1>
          <p className="text-sm md:text-base text-slate-500 leading-relaxed max-w-sm mx-auto">
            Unite a tu equipo de montaña, hacé seguimiento de tus cuotas y mantené al día tus aptos médicos.
          </p>
        </div>

        {/* Google Login Button */}
        <div className="pt-2">
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full py-3.5 px-6 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 hover:border-slate-300 font-semibold text-sm rounded-2xl shadow-sm hover:shadow transition-all duration-200 cursor-pointer flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group active:scale-[0.98]"
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.53-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-8.77z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.08 1.16-3.14 0-5.8-2.11-6.75-4.96H1.21v3.15C3.18 21.88 7.39 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.25 14.24c-.25-.72-.39-1.5-.39-2.3 0-.8.14-1.58.39-2.3V6.49H1.21C.44 8.04 0 9.77 0 11.62c0 1.85.44 3.58 1.21 5.13l4.04-3.15c-.09-.36-.09-1-.09-1.36z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.22 0 12 0 7.39 0 3.18 2.12 1.21 5.62l4.04 3.15c.95-2.85 3.61-4.96 6.75-4.96z"
              />
            </svg>
            <span className="font-semibold text-slate-800">
              {isLoading ? 'Conectando...' : 'Continuar con Google'}
            </span>
          </button>
        </div>

        <div className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed pt-2">
          Al continuar, aceptás nuestros Términos de servicio y Política de privacidad.
        </div>
      </div>
    </div>
  );
}
