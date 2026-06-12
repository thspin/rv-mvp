'use client'

import ErrorFallback from '@/components/ErrorFallback'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title="Error en el panel administrador"
      subtitle="No se pudo cargar el panel. Reintenta o vuelve al inicio."
    />
  )
}
