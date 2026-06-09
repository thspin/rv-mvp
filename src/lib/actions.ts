'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/service'
import { Athlete, fromDbAthlete } from '@/lib/db'

export async function getCurrentUserAction(): Promise<Athlete | null> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })
    if (!session?.user?.email) return null

    const supabase = createServiceClient()
    const userId = session.user.id
    const userEmail = session.user.email

    const { data: userById } = await supabase
      .from('athletes')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (userById) {
      return fromDbAthlete(userById)
    }

    const { data: userByEmail } = await supabase
      .from('athletes')
      .select('*')
      .eq('email', userEmail)
      .maybeSingle()

    if (userByEmail) {
      const { data: updated, error: updateError } = await supabase
        .from('athletes')
        .update({ user_id: userId })
        .eq('id', userByEmail.id)
        .select()
        .single()

      if (!updateError && updated) {
        return fromDbAthlete(updated)
      }
      return fromDbAthlete(userByEmail)
    }

    const newAthlete = {
      user_id: userId,
      email: userEmail,
      name: session.user.name || userEmail.split('@')[0],
      role: 'atleta',
      onboarding_complete: false,
      apto_medico_status: 'no_entregado',
      avatar_url: session.user.image || '',
    }

    const { data: created, error: createError } = await supabase
      .from('athletes')
      .upsert(newAthlete, { onConflict: 'user_id' })
      .select()
      .single()

    if (!createError && created) {
      return fromDbAthlete(created)
    }
  } catch (err) {
    console.error('Error in getCurrentUserAction:', err)
  }

  return null
}
