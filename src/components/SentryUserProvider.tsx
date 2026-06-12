'use client'

import { useEffect } from 'react'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { setUserContext } from '@/lib/sentry-utils'

export default function SentryUserProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthGuard(false)

  useEffect(() => {
    setUserContext(user)
  }, [user])

  return <>{children}</>
}
