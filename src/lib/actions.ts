'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/service'
import type { Athlete } from '@/lib/db-types'
import { fromDbAthlete } from '@/lib/db-types'

type ActionResult =
  | { success: true; data: Athlete }
  | { success: false; error: string; code: 'NO_SESSION' | 'DB_ERROR' | 'CREATE_ERROR' | 'UNKNOWN' }

export async function getCurrentUserAction(): Promise<Athlete> {
  const result = await getCurrentUserActionDetailed()
  if (result.success) return result.data
  console.error(`[getCurrentUserAction] ${result.code}:`, result.error)
  throw new Error(result.error)
}

export async function getCurrentUserActionDetailed(): Promise<ActionResult> {
  try {
    // 1. Verify Better Auth session
    const session = await auth.api.getSession({
      headers: await headers(),
    })
    if (!session?.user?.email) {
      return { success: false, error: 'No active session', code: 'NO_SESSION' }
    }

    const supabase = createServiceClient()
    const userId = session.user.id
    const userEmail = session.user.email

    // 2. Look up by user_id (fastest path)
    const { data: userById, error: e1 } = await supabase
      .from('athletes')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (e1) {
      return { success: false, error: `athletes lookup by user_id failed: ${e1.message} (code: ${e1.code})`, code: 'DB_ERROR' }
    }

    if (userById) {
      // Sync Google avatar if athlete doesn't have one yet
      const googleImage = session.user.image
      if (googleImage && !userById.avatar_url) {
        await supabase
          .from('athletes')
          .update({ avatar_url: googleImage })
          .eq('id', userById.id)
        userById.avatar_url = googleImage
      }
      return { success: true, data: fromDbAthlete(userById) }
    }

    // 3. Fallback: look up by email (migration path)
    const { data: userByEmail, error: e2 } = await supabase
      .from('athletes')
      .select('*')
      .eq('email', userEmail)
      .maybeSingle()

    if (e2) {
      return { success: false, error: `athletes lookup by email failed: ${e2.message} (code: ${e2.code})`, code: 'DB_ERROR' }
    }

    if (userByEmail) {
      // Link existing record to Better Auth user_id and sync avatar
      const googleImage = session.user.image
      const updates: Record<string, unknown> = { user_id: userId }
      if (googleImage && !userByEmail.avatar_url) updates.avatar_url = googleImage

      const { data: updated, error: updateError } = await supabase
        .from('athletes')
        .update(updates)
        .eq('id', userByEmail.id)
        .select()
        .single()

      if (!updateError && updated) {
        return { success: true, data: fromDbAthlete(updated) }
      }
      return { success: true, data: fromDbAthlete(userByEmail) }
    }

    // 4. First login: create new athlete record
    const newAthlete = {
      user_id: userId,
      email: userEmail,
      name: session.user.name || userEmail.split('@')[0],
      role: 'atleta',
      onboarding_complete: false,
      apto_medico_status: 'no_entregado',
      avatar_url: session.user.image || null,
    }

    const { data: created, error: createError } = await supabase
      .from('athletes')
      .upsert(newAthlete, { onConflict: 'user_id' })
      .select()
      .single()

    if (createError) {
      return { success: false, error: `athlete creation failed: ${createError.message} (code: ${createError.code})`, code: 'CREATE_ERROR' }
    }

    if (created) {
      return { success: true, data: fromDbAthlete(created) }
    }

    return { success: false, error: 'upsert returned no data', code: 'UNKNOWN' }
  } catch (err) {
    return { success: false, error: String(err), code: 'UNKNOWN' }
  }
}

type TeamActionResult =
  | { success: true; data: Athlete }
  | { success: false; error: string; code: 'NO_SESSION' | 'DB_ERROR' | 'UNKNOWN' }

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.email) {
    return { session: null, error: 'No active session' as const }
  }
  return { session, error: null as null }
}

export async function requestJoinTeamAction(teamId: string): Promise<TeamActionResult> {
  try {
    const { session, error } = await requireSession()
    if (error || !session) {
      return { success: false, error, code: 'NO_SESSION' }
    }

    const supabase = createServiceClient()
    const { data, error: updateError } = await supabase
      .from('athletes')
      .update({ team_id: teamId, team_status: 'pendiente' })
      .eq('user_id', session.user.id)
      .select()
      .single()

    if (updateError) {
      return { success: false, error: updateError.message, code: 'DB_ERROR' }
    }
    return { success: true, data: fromDbAthlete(data) }
  } catch (err) {
    return { success: false, error: String(err), code: 'UNKNOWN' }
  }
}

export async function leaveTeamAction(): Promise<TeamActionResult> {
  try {
    const { session, error } = await requireSession()
    if (error || !session) {
      return { success: false, error, code: 'NO_SESSION' }
    }

    const supabase = createServiceClient()
    const { data, error: updateError } = await supabase
      .from('athletes')
      .update({
        team_id: null,
        team_status: null,
        payment_status: null,
        payment_receipt_url: null,
        payment_method: null,
        payment_motivo_rechazo: null,
      })
      .eq('user_id', session.user.id)
      .select()
      .single()

    if (updateError) {
      return { success: false, error: updateError.message, code: 'DB_ERROR' }
    }
    return { success: true, data: fromDbAthlete(data) }
  } catch (err) {
    return { success: false, error: String(err), code: 'UNKNOWN' }
  }
}
