export class RateLimitError extends Error {
  public readonly code = 'RATE_LIMITED' as const
  constructor(
    message = 'Demasiadas solicitudes. Intenta de nuevo en unos segundos.',
    public readonly retryAfter?: number,
  ) {
    super(message)
    this.name = 'RateLimitError'
  }
}
