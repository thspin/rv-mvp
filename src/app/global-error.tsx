'use client'

import * as Sentry from '@sentry/nextjs'
import ErrorFallback from '@/components/ErrorFallback'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  Sentry.captureException(error, {
    tags: { source: 'global-error' },
  })

  return (
    <html lang="es">
      <body className="min-h-full bg-background text-foreground font-sans antialiased">
        <ErrorFallback
          error={error}
          reset={reset}
          title="Error critico de la aplicacion"
          subtitle="Ocurrio un error inesperado. Por favor, intenta de nuevo."
        />
      </body>
    </html>
  )
}
