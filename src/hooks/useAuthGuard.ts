'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { getCurrentUserAction } from '@/lib/actions';
import { Athlete } from '@/lib/db';

export function useAuthGuard(requireOnboarding = true) {
  const router = useRouter();
  const [user, setUser] = useState<Athlete | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Still waiting for session check
      if (isPending) return;

      // No session at all → redirect to login
      if (!session?.user) {
        if (!cancelled) router.push('/');
        return;
      }

      // Session exists — fetch athlete profile from DB
      const currentUser = await getCurrentUserAction();
      if (cancelled) return;

      if (!currentUser) {
        // DB error or user not created yet — show error instead of looping
        setAuthError('No se pudo cargar tu perfil. Por favor recargá la página.');
        setIsLoading(false);
        return;
      }

      // Redirect new users to complete onboarding
      if (requireOnboarding && !currentUser.onboarding_complete) {
        router.push('/perfil');
        // Keep isLoading true so the page shows LoadingScreen during navigation
        return;
      }

      setUser(currentUser);
      setIsLoading(false);
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, isPending]);

  return { user, isLoading, setUser, authError };
}
