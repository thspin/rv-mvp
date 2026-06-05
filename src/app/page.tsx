'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getCurrentUserAsync, setCurrentUserEmail, Athlete } from '@/lib/db';
import { Archivo } from 'next/font/google';

const archivoFont = Archivo({
  subsets: ['latin'],
  weight: ['800', '900'],
});

export default function Login() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isBgLoaded, setIsBgLoaded] = useState(false);

  useEffect(() => {
    checkSession();
    const timer = setTimeout(() => {
      setIsBgLoaded(true);
    }, 50);
    return () => clearTimeout(timer);
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
      const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
      if (isMock) {
        console.log('Detectado entorno local sin credenciales. Usando fallback de demo...');
        setCurrentUserEmail('atleta@demo.com');
        const mockUser = {
          email: 'atleta@demo.com',
          name: 'Atleta de Prueba',
          role: 'atleta' as const,
          onboarding_complete: true
        };
        redirectUser(mockUser);
        return;
      }

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
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-pulse text-slate-400 font-medium">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-end md:items-center justify-start bg-slate-950 text-white font-sans antialiased relative overflow-hidden px-6 py-12 md:p-20">
      {/* Background images with Ken Burns / slow pan effect */}
      <div className={`absolute inset-0 bg-cover bg-center bg-no-repeat bg-[url('/fondo_mobile.webp')] md:bg-[url('/fondo_web.webp')] transition-opacity duration-1000 ease-out animate-slow-pan ${isBgLoaded ? 'opacity-100' : 'opacity-0'}`}></div>
      
      {/* Dark gradient overlay to guarantee text contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/20 md:bg-black/40"></div>

      <div className="w-full max-w-md z-10 space-y-8 md:space-y-10">
        {/* Header Texts */}
        <div className="space-y-4 text-left">
          <h1 className={`${archivoFont.className} text-5xl md:text-6xl font-black tracking-tight text-white leading-[1.1]`}>
            Superá<br />tus límites.
          </h1>
          <p className="text-sm md:text-base text-slate-200/90 leading-relaxed max-w-sm">
            Unite a tu equipo de run, hacé seguimiento de tus entrenamientos y mantené al día tu cuota y documentos.
          </p>
        </div>

        {/* Google Login Button */}
        <div>
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full py-4 px-6 bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/40 font-semibold text-sm md:text-base rounded-full shadow-lg hover:shadow-xl hover:shadow-white/5 backdrop-blur-md transition-all duration-300 ease-out cursor-pointer flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]"
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
            <span className="font-semibold">
              {isLoading ? 'Conectando...' : 'Continuar con Google'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
