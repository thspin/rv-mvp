import * as Sentry from '@sentry/nextjs'
import type { Athlete } from '@/lib/db-types'

export function setUserContext(user: Pick<Athlete, 'id' | 'email' | 'name' | 'role'> | null) {
  if (user?.id) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.name,
      role: user.role,
    })
  } else {
    Sentry.setUser(null)
  }
}

export function addBreadcrumb(message: string, data?: Record<string, unknown>) {
  Sentry.addBreadcrumb({
    message,
    data,
    level: 'info',
  })
}
