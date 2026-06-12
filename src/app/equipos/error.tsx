'use client'

import * as Sentry from '@sentry/nextjs'
import ErrorFallback from '@/components/ErrorFallback'

export default function EquiposError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  Sentry.captureException(error, {
    tags: { source: 'equipos' },
  })

  return <ErrorFallback error={error} reset={reset} />
}
