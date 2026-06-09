'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { getCurrentUserActionDetailed } from '@/lib/actions';
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
      if (isPending) return;

      if (!session?.user) {
        if (!cancelled) router.push('/');
        return;
      }

      const result = await getCurrentUserActionDetailed();
      if (cancelled) return;

      if (!result.success) {
        setAuthError(`Error (${result.code}): ${result.error}`);
        setIsLoading(false);
        return;
      }

      const currentUser = result.data;

      if (requireOnboarding && !currentUser.onboarding_complete) {
        router.push('/perfil');
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
