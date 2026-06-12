'use client'

import { useState } from 'react'
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorFallbackProps {
  error: Error & { digest?: string }
  reset?: () => void
  title?: string
  subtitle?: string
}

export default function ErrorFallback({
  error,
  reset,
  title = 'Algo salió mal',
  subtitle = 'Esta sección tuvo un error inesperado.',
}: ErrorFallbackProps) {
  const [showDetails, setShowDetails] = useState(false)
  const isDev = process.env.NODE_ENV !== 'production'

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card text-card-foreground border border-border rounded-2xl shadow-sm p-6 sm:p-8 text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-destructive" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground text-balance">
            {subtitle}
          </p>
        </div>

        {reset && (
          <Button
            onClick={reset}
            variant="default"
            size="lg"
            className="w-full sm:w-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </Button>
        )}

        {isDev && (
          <div className="pt-2 border-t border-border text-left">
            <button
              type="button"
              onClick={() => setShowDetails((s) => !s)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              Detalles técnicos
            </button>
            {showDetails && (
              <pre className="mt-3 p-3 bg-muted text-foreground rounded-lg text-[11px] font-mono overflow-auto max-h-48 whitespace-pre-wrap break-words">
                {error.message}
                {error.stack ? `\n\n${error.stack}` : ''}
                {error.digest ? `\n\nDigest: ${error.digest}` : ''}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
