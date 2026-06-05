// Base de datos con Supabase para RV
import { createClient } from '@/lib/supabase/client'

export interface Team {
  id: string;
  name: string;
  description: string;
  whatsapp_url: string;
  training_days: string;
  coach: string;
  instructions: string;
  location: string;
  logo_url: string;
}

export interface Athlete {
  id?: string;
  user_id?: string;
  email: string;
  name: string;
  role: 'atleta' | 'admin' | null;
  onboarding_complete: boolean;
  dni?: string;
  phone?: string; // Teléfono personal del atleta
  talle_remera?: string;
  contacto_emergencia_name?: string;
  contacto_emergencia_phone?: string;
  grupo_sanguineo?: string;
  alergias?: string;
  afecciones?: string;
  apto_medico_url?: string;
  apto_medico_status?: 'no_entregado' | 'pendiente_verificacion' | 'vigente' | 'rechazado';
  apto_medico_vencimiento?: string;
  apto_medico_motivo_rechazo?: string;
  team_id?: string | null;
  team_status?: 'pendiente' | 'activo' | null;
  payment_status?: 'Pendiente_Pago' | 'Pendiente_Verificacion' | 'Pagado' | 'Vencido' | null;
  payment_receipt_url?: string;
  payment_method?: string;
  payment_motivo_rechazo?: string;
}

export interface Payment {
  id: string;
  athlete_email: string;
  athlete_name: string;
  amount: number;
  method: string;
  created_at: string;
  status: 'aprobado' | 'rechazado';
}

// Mapeo de camelCase a snake_case para la base de datos
function toSnakeCase(athlete: Partial<Athlete>): Record<string, unknown> {
  const data: Record<string, unknown> = {
    email: athlete.email,
    name: athlete.name,
    role: athlete.role,
    onboarding_complete: athlete.onboarding_complete,
    dni: athlete.dni,
    phone: athlete.phone,
    talle_remera: athlete.talle_remera,
    contacto_emergencia_name: athlete.contacto_emergencia_name,
    contacto_emergencia_phone: athlete.contacto_emergencia_phone,
    grupo_sanguineo: athlete.grupo_sanguineo,
    alergias: athlete.alergias,
    afecciones: athlete.afecciones,
    apto_medico_url: athlete.apto_medico_url,
    apto_medico_status: athlete.apto_medico_status,
    apto_medico_vencimiento: athlete.apto_medico_vencimiento,
    apto_medico_motivo_rechazo: athlete.apto_medico_motivo_rechazo,
    team_id: athlete.team_id,
    team_status: athlete.team_status,
    payment_status: athlete.payment_status,
    payment_receipt_url: athlete.payment_receipt_url,
    payment_method: athlete.payment_method,
    payment_motivo_rechazo: athlete.payment_motivo_rechazo,
  };

  if (athlete.user_id !== undefined) {
    data.user_id = athlete.user_id;
  }

  return data;
}

// Mapeo de snake_case a camelCase desde la DB
function fromDbAthlete(row: Record<string, unknown>): Athlete {
  return {
    id: row.id as string,
    user_id: row.user_id as string | undefined,
    email: row.email as string,
    name: row.name as string,
    role: row.role as 'atleta' | 'admin' | null,
    onboarding_complete: !!row.onboarding_complete,
    dni: row.dni as string | undefined,
    phone: row.phone as string | undefined,
    talle_remera: row.talle_remera as string | undefined,
    contacto_emergencia_name: row.contacto_emergencia_name as string | undefined,
    contacto_emergencia_phone: row.contacto_emergencia_phone as string | undefined,
    grupo_sanguineo: row.grupo_sanguineo as string | undefined,
    alergias: row.alergias as string | undefined,
    afecciones: row.afecciones as string | undefined,
    apto_medico_url: row.apto_medico_url as string | undefined,
    apto_medico_status: row.apto_medico_status as Athlete['apto_medico_status'],
    apto_medico_vencimiento: row.apto_medico_vencimiento as string | undefined,
    apto_medico_motivo_rechazo: row.apto_medico_motivo_rechazo as string | undefined,
    team_id: row.team_id as string | null | undefined,
    team_status: row.team_status as Athlete['team_status'],
    payment_status: row.payment_status as Athlete['payment_status'],
    payment_receipt_url: row.payment_receipt_url as string | undefined,
    payment_method: row.payment_method as string | undefined,
    payment_motivo_rechazo: row.payment_motivo_rechazo as string | undefined,
  };
}

function fromDbTeam(row: Record<string, unknown>): Team {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description || '') as string,
    whatsapp_url: (row.whatsapp_url || '') as string,
    training_days: (row.training_days || '') as string,
    coach: (row.coach || '') as string,
    instructions: (row.instructions || '') as string,
    location: (row.location || '') as string,
    logo_url: (row.logo_url || '/rv-logo.svg') as string,
  };
}

function fromDbPayment(row: Record<string, unknown>): Payment {
  return {
    id: row.id as string,
    athlete_email: row.athlete_email as string,
    athlete_name: row.athlete_name as string,
    amount: Number(row.amount),
    method: row.method as string,
    created_at: row.created_at as string,
    status: row.status as 'aprobado' | 'rechazado',
  };
}

// Helpers para cookie-based demo access en el navegador (evita fugas en HMR/serverless global state)
function getDemoEmail(): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )demo_email=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function setCurrentUserEmail(email: string | null) {
  if (typeof window !== 'undefined') {
    if (email) {
      document.cookie = `demo_email=${encodeURIComponent(email)}; path=/; max-age=86400`;
    } else {
      document.cookie = 'demo_email=; path=/; max-age=0';
    }
  }
}

export function initializeDB() {
  // No-op: La base de datos está en Supabase
}

// Clamping de meses para evitar saltos incorrectos (ej: 31 de Enero + 1 mes = 3 de Marzo)
function addMonthsWithClamp(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const expectedMonth = (result.getMonth() + months) % 12;
  result.setMonth(result.getMonth() + months);
  // Si el mes resultante no coincide con el esperado, retrocedemos al último día del mes anterior
  if (result.getMonth() !== expectedMonth) {
    result.setDate(0);
  }
  return result;
}

// =========== Team Operations ===========

export async function getTeamAsync(teamId?: string): Promise<Team | null> {
  try {
    const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
    if (isMock) {
      const targetId = teamId || 'mock-team-id';
      return {
        id: targetId,
        name: 'RV Entrenamientos',
        description: 'Grupo de entrenamiento especializado en Trail Running, ultra maratones y carreras de run en todos los niveles.',
        whatsapp_url: 'https://chat.whatsapp.com/RVEquipoRunSimulado',
        training_days: 'Martes y Jueves 19:00 hs, Sabados 8:00 hs',
        coach: 'Raul Vergara',
        instructions: 'Para el entrenamiento de este martes, traer linterna frontal y mochila de hidratacion.',
        location: 'La Rioja, Argentina',
        logo_url: '/rv-logo.svg',
      };
    }

    const supabase = createClient()
    let query = supabase.from('teams').select('*')
    if (teamId) {
      query = query.eq('id', teamId)
    }
    const { data, error } = await query.limit(1).maybeSingle()
    if (error) throw error
    return data ? fromDbTeam(data) : null
  } catch (err) {
    console.error('Error in getTeamAsync:', err)
    return null
  }
}

export async function getTeamById(id: string): Promise<Team | null> {
  return getTeamAsync(id)
}

// Sync version for compatibility (returns default team)
export function getTeam(): Team {
  return {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    name: 'RV Entrenamientos',
    description: 'Grupo de entrenamiento especializado en Trail Running, ultra maratones y carreras de run en todos los niveles.',
    whatsapp_url: 'https://chat.whatsapp.com/RVEquipoMontanaSimulado',
    training_days: 'Martes y Jueves 19:00 hs, Sabados 8:00 hs',
    coach: 'Raul Vergara',
    instructions: 'Para el entrenamiento de este martes, traer linterna frontal y mochila de hidratacion.',
    location: 'La Rioja, Argentina',
    logo_url: '/rv-logo.svg',
  }
}

export async function updateTeamInstructionsAsync(instructions: string): Promise<void> {
  try {
    const supabase = createClient()
    const activeTeam = await getTeamAsync()
    if (activeTeam?.id) {
      const { error } = await supabase
        .from('teams')
        .update({ instructions })
        .eq('id', activeTeam.id)
      if (error) throw error
    }
  } catch (err) {
    console.error('Error in updateTeamInstructionsAsync:', err)
  }
}

export function updateTeamInstructions(instructions: string) {
  updateTeamInstructionsAsync(instructions)
}

export async function updateTeam(id: string, updates: Partial<Team>): Promise<void> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('teams')
      .update(updates)
      .eq('id', id)
    if (error) throw error
  } catch (err) {
    console.error('Error in updateTeam:', err)
  }
}

export async function getTeamsAsync(): Promise<Team[]> {
  try {
    const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
    if (isMock) {
      return [
        {
          id: 'mock-team-id',
          name: 'RV Entrenamientos',
          description: 'Grupo de entrenamiento especializado en Trail Running, ultra maratones y carreras de run en todos los niveles.',
          whatsapp_url: 'https://chat.whatsapp.com/RVEquipoRunSimulado',
          training_days: 'Martes y Jueves 19:00 hs, Sabados 8:00 hs',
          coach: 'Raul Vergara',
          instructions: 'Para el entrenamiento de este martes, traer linterna frontal y mochila de hidratacion.',
          location: 'La Rioja, Argentina',
          logo_url: '/rv-logo.svg',
        }
      ];
    }

    const supabase = createClient()
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('name')
    if (error) throw error
    return data ? data.map(fromDbTeam) : []
  } catch (err) {
    console.error('Error in getTeamsAsync:', err)
    return []
  }
}

// =========== Athletes Operations ===========

export async function getAthletesAsync(): Promise<Athlete[]> {
  try {
    const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
    if (isMock) {
      return [
        {
          id: 'mock-admin-id',
          user_id: 'mock-admin-user-id',
          email: 'admin@demo.com',
          name: 'Raúl Vergara',
          role: 'admin',
          onboarding_complete: true,
          phone: '+5493804000000',
          team_id: 'mock-team-id',
          team_status: 'activo',
        },
        {
          id: 'mock-athlete-id',
          user_id: 'mock-user-id',
          email: 'atleta@demo.com',
          name: 'Atleta de Prueba',
          role: 'atleta',
          onboarding_complete: true,
          dni: '12345678',
          phone: '+5491123456789',
          team_id: 'mock-team-id',
          team_status: 'activo',
        }
      ];
    }

    const supabase = createClient()
    const { data, error } = await supabase
      .from('athletes')
      .select('*')
      .order('name')
    
    if (error) throw error
    return data ? data.map(fromDbAthlete) : []
  } catch (err) {
    console.error('Error in getAthletesAsync:', err)
    return []
  }
}

export async function getAllAthletes(): Promise<Athlete[]> {
  return getAthletesAsync()
}

export function getAthletes(): Athlete[] {
  return []
}

export async function getAthleteByEmail(email: string): Promise<Athlete | null> {
  try {
    const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
    if (isMock) {
      if (email === 'admin@demo.com') {
        return {
          id: 'mock-admin-id',
          user_id: 'mock-admin-user-id',
          email: 'admin@demo.com',
          name: 'Raúl Vergara',
          role: 'admin',
          onboarding_complete: true,
          phone: '+5493804000000',
          team_id: 'mock-team-id',
          team_status: 'activo',
        };
      }
      if (email === 'atleta@demo.com') {
        return {
          id: 'mock-athlete-id',
          user_id: 'mock-user-id',
          email: 'atleta@demo.com',
          name: 'Atleta de Prueba',
          role: 'atleta',
          onboarding_complete: true,
          dni: '12345678',
          phone: '+5491123456789',
          team_id: 'mock-team-id',
          team_status: 'activo',
        };
      }
    }

    const supabase = createClient()
    const { data, error } = await supabase
      .from('athletes')
      .select('*')
      .eq('email', email)
      .maybeSingle()
    if (error) throw error
    return data ? fromDbAthlete(data) : null
  } catch (err) {
    console.error('Error in getAthleteByEmail:', err)
    return null
  }
}

export async function getCurrentUserAsync(): Promise<Athlete | null> {
  try {
    const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
    if (isMock) {
      const demoEmail = getDemoEmail();
      if (!demoEmail) return null;
      return {
        id: demoEmail === 'admin@demo.com' ? 'mock-admin-id' : 'mock-athlete-id',
        user_id: demoEmail === 'admin@demo.com' ? 'mock-admin-user-id' : 'mock-user-id',
        email: demoEmail,
        name: demoEmail === 'admin@demo.com' ? 'Raúl Vergara' : 'Atleta de Prueba',
        role: demoEmail === 'admin@demo.com' ? 'admin' : 'atleta',
        onboarding_complete: true,
        dni: '12345678',
        phone: demoEmail === 'admin@demo.com' ? '+5493804000000' : '+5491123456789',
        talle_remera: 'M',
        contacto_emergencia_name: 'Contacto Emergencia',
        contacto_emergencia_phone: '+5491198765432',
        team_id: 'mock-team-id',
        team_status: 'activo',
        payment_status: 'Pagado',
      };
    }

    const supabase = createClient()
    
    // 1. Verificar si hay un usuario de Supabase autenticado
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user?.email) {
      // Intentar buscar por user_id primero para máxima seguridad
      const { data: userById, error: errorById } = await supabase
        .from('athletes')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (userById) {
        return fromDbAthlete(userById)
      }
      
      // Si no tiene user_id configurado, buscar por email para asociarlo
      const { data: userByEmail, error: errorByEmail } = await supabase
        .from('athletes')
        .select('*')
        .eq('email', user.email)
        .maybeSingle()
      
      if (userByEmail) {
        // Enlazar user_id para futuras consultas
        const { data: updated, error: updateError } = await supabase
          .from('athletes')
          .update({ user_id: user.id })
          .eq('id', userByEmail.id)
          .select()
          .single()
        
        if (!updateError && updated) {
          return fromDbAthlete(updated)
        }
        return fromDbAthlete(userByEmail)
      }
      
      // Si no existe ningún registro, lo creamos de forma segura mediante upsert
      const newAthlete = {
        user_id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email.split('@')[0],
        role: 'atleta',
        onboarding_complete: false,
        apto_medico_status: 'no_entregado',
      }
      
      const { data: created, error: createError } = await supabase
        .from('athletes')
        .upsert(newAthlete, { onConflict: 'user_id' })
        .select()
        .single()
      
      if (!createError && created) {
        return fromDbAthlete(created)
      }
    }
    
    // 2. Si no hay Supabase Auth, comprobar cookie de Demo local
    const demoEmail = getDemoEmail()
    if (demoEmail) {
      const { data, error } = await supabase
        .from('athletes')
        .select('*')
        .eq('email', demoEmail)
        .maybeSingle()
      
      if (!error && data) {
        return fromDbAthlete(data)
      }
    }
  } catch (err) {
    console.error('Error in getCurrentUserAsync:', err)
  }
  
  return null
}

// Sync version for compatibility
export function getCurrentUser(): Athlete | null {
  return null // Debe usarse la versión asíncrona
}

export async function updateAthleteProfileAsync(email: string, updates: Partial<Athlete>): Promise<Athlete | null> {
  try {
    const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
    if (isMock) {
      const demoEmail = getDemoEmail() || email;
      return {
        id: 'mock-athlete-id',
        user_id: 'mock-user-id',
        email: demoEmail,
        name: 'Atleta de Prueba',
        role: demoEmail === 'admin@demo.com' ? 'admin' : 'atleta',
        onboarding_complete: true,
        dni: '12345678',
        phone: '+5491123456789',
        talle_remera: 'M',
        contacto_emergencia_name: 'Contacto Emergencia',
        contacto_emergencia_phone: '+5491198765432',
        team_id: updates.team_id !== undefined ? updates.team_id : 'mock-team-id',
        team_status: updates.team_status !== undefined ? updates.team_status : 'activo',
        payment_status: 'Pagado',
        ...updates,
      };
    }

    const supabase = createClient()
    
    // Filtrar valores indefinidos y mapear a snake_case
    const dbUpdates: Record<string, unknown> = {}
    const snakeCaseData = toSnakeCase(updates)
    
    for (const [key, value] of Object.entries(snakeCaseData)) {
      if (value !== undefined) {
        dbUpdates[key] = value
      }
    }
    
    const { data, error } = await supabase
      .from('athletes')
      .update(dbUpdates)
      .eq('email', email)
      .select()
      .single()
    
    if (error) throw error
    return data ? fromDbAthlete(data) : null
  } catch (err) {
    console.error('Error in updateAthleteProfileAsync:', err)
    return null
  }
}

export function updateAthleteProfile(email: string, updates: Partial<Athlete>): Athlete | null {
  updateAthleteProfileAsync(email, updates)
  return null
}

export async function updateProfileAsync(email: string, updates: Partial<Athlete>): Promise<Athlete | null> {
  return updateAthleteProfileAsync(email, updates)
}

export async function completeOnboardingAsync(email: string, updates: Partial<Athlete>): Promise<Athlete | null> {
  return updateAthleteProfileAsync(email, {
    ...updates,
    onboarding_complete: true
  })
}

export async function requestJoinTeamAsync(email: string, teamId: string): Promise<void> {
  await updateAthleteProfileAsync(email, {
    team_id: teamId,
    team_status: 'pendiente',
  })
}

export function requestJoinTeam(email: string, teamId: string) {
  requestJoinTeamAsync(email, teamId)
}

export async function joinTeamAsync(email: string, teamId: string): Promise<void> {
  await requestJoinTeamAsync(email, teamId)
}

export async function leaveTeamAsync(email: string): Promise<void> {
  await updateAthleteProfileAsync(email, {
    team_id: null,
    team_status: null,
    payment_status: null,
    payment_receipt_url: undefined,
    payment_method: undefined,
    payment_motivo_rechazo: undefined,
  })
}

export function leaveTeam(email: string) {
  leaveTeamAsync(email)
}

export async function uploadPaymentReceiptAsync(email: string, receiptName: string): Promise<void> {
  await updateAthleteProfileAsync(email, {
    payment_status: 'Pendiente_Verificacion',
    payment_receipt_url: receiptName,
    payment_motivo_rechazo: undefined,
  })
}

export function uploadPaymentReceipt(email: string, receiptName: string) {
  uploadPaymentReceiptAsync(email, receiptName)
}

export async function uploadMedicalCertificateAsync(email: string, certName: string): Promise<void> {
  await updateAthleteProfileAsync(email, {
    apto_medico_status: 'pendiente_verificacion',
    apto_medico_url: certName,
    apto_medico_motivo_rechazo: undefined,
  })
}

export function uploadMedicalCertificate(email: string, certName: string) {
  uploadMedicalCertificateAsync(email, certName)
}

// =========== Admin Operations ===========

export async function updateAthleteTeamStatus(email: string, status: 'activo' | 'pendiente' | null): Promise<void> {
  try {
    if (status === null) {
      await updateAthleteProfileAsync(email, {
        team_id: null,
        team_status: null,
        payment_status: null,
        payment_receipt_url: undefined,
        payment_method: undefined,
        payment_motivo_rechazo: undefined,
      })
    } else if (status === 'activo') {
      await updateAthleteProfileAsync(email, {
        team_status: 'activo',
        payment_status: 'Pendiente_Pago',
      })
    } else {
      await updateAthleteProfileAsync(email, {
        team_status: status,
      })
    }
  } catch (err) {
    console.error('Error in updateAthleteTeamStatus:', err)
  }
}

export async function updateAthleteAptoStatus(
  email: string,
  status: 'no_entregado' | 'pendiente_verificacion' | 'vigente' | 'rechazado',
  vencimiento: string | null,
  rejectReason?: string
): Promise<void> {
  await updateAthleteProfileAsync(email, {
    apto_medico_status: status,
    apto_medico_vencimiento: vencimiento || undefined,
    apto_medico_motivo_rechazo: rejectReason || undefined,
  })
}

export async function updateAthletePaymentStatus(
  email: string,
  status: 'Pendiente_Pago' | 'Pendiente_Verificacion' | 'Pagado' | 'Vencido' | null,
  rejectReason?: string
): Promise<void> {
  await updateAthleteProfileAsync(email, {
    payment_status: status,
    payment_motivo_rechazo: rejectReason || undefined,
  })
}

export async function processRequestAsync(email: string, approve: boolean): Promise<void> {
  if (approve) {
    await updateAthleteTeamStatus(email, 'activo')
  } else {
    await updateAthleteTeamStatus(email, null)
  }
}

export function processRequest(email: string, approve: boolean) {
  processRequestAsync(email, approve)
}

// Idempotencia de pagos: comprobar si ya existe un registro de pago para este correo en el mes actual
async function checkDuplicatePayment(supabase: any, email: string): Promise<boolean> {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  
  const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0, 23, 59, 59, 999)
  
  const { data, error } = await supabase
    .from('payments')
    .select('id')
    .eq('athlete_email', email)
    .gte('created_at', startOfMonth.toISOString())
    .lte('created_at', endOfMonth.toISOString())
    .limit(1)
    .maybeSingle()
  
  if (error) {
    console.error('Error checking duplicate payment:', error)
    return false
  }
  return !!data
}

export async function addPaymentRecord(email: string, name: string, amount: number, method: string): Promise<void> {
  try {
    const supabase = createClient()
    
    // Validar duplicado
    const isDuplicate = await checkDuplicatePayment(supabase, email)
    if (isDuplicate) {
      console.warn(`Payment for ${email} this month already exists. Skipping insertion for idempotency.`)
      return
    }

    const { error } = await supabase.from('payments').insert({
      athlete_email: email,
      athlete_name: name,
      amount: amount,
      method: method,
      status: 'aprobado',
    })
    
    if (error) throw error
  } catch (err) {
    console.error('Error in addPaymentRecord:', err)
  }
}

export async function processPaymentAsync(email: string, approve: boolean, method?: string, reason?: string): Promise<void> {
  try {
    const supabase = createClient()
    
    if (approve) {
      await updateAthleteProfileAsync(email, {
        payment_status: 'Pagado',
        payment_method: method || 'Transferencia',
        payment_motivo_rechazo: undefined,
      })
      
      const { data: athlete, error: athleteError } = await supabase
        .from('athletes')
        .select('name')
        .eq('email', email)
        .maybeSingle()
      
      if (athleteError) throw athleteError
      
      if (athlete) {
        await addPaymentRecord(email, athlete.name, 17000, method || 'Transferencia')
      }
    } else {
      await updateAthleteProfileAsync(email, {
        payment_status: 'Vencido',
        payment_motivo_rechazo: reason || 'Comprobante no valido',
      })
    }
  } catch (err) {
    console.error('Error in processPaymentAsync:', err)
  }
}

export function processPayment(email: string, approve: boolean, method?: string, reason?: string) {
  processPaymentAsync(email, approve, method, reason)
}

export async function processCertificateAsync(email: string, approve: boolean, months?: number, reason?: string): Promise<void> {
  try {
    if (approve) {
      const monthsValidity = months || 6
      const expirationDate = addMonthsWithClamp(new Date(), monthsValidity)

      await updateAthleteProfileAsync(email, {
        apto_medico_status: 'vigente',
        apto_medico_vencimiento: expirationDate.toISOString(),
        apto_medico_motivo_rechazo: undefined,
      })
    } else {
      await updateAthleteProfileAsync(email, {
        apto_medico_status: 'rechazado',
        apto_medico_motivo_rechazo: reason || 'Certificado medico borroso o no legible',
      })
    }
  } catch (err) {
    console.error('Error in processCertificateAsync:', err)
  }
}

export function processCertificate(email: string, approve: boolean, months?: number, reason?: string) {
  processCertificateAsync(email, approve, months, reason)
}

export async function expelAthleteAsync(email: string): Promise<void> {
  await leaveTeamAsync(email)
}

export function expelAthlete(email: string) {
  expelAthleteAsync(email)
}

// =========== Payments Operations ===========

export async function getPaymentsAsync(): Promise<Payment[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data ? data.map(fromDbPayment) : []
  } catch (err) {
    console.error('Error in getPaymentsAsync:', err)
    return []
  }
}

export async function getPaymentHistory(): Promise<Payment[]> {
  return getPaymentsAsync()
}

export function getPayments(): Payment[] {
  return []
}

// =========== Analytics ===========

export async function getAnalyticsDataAsync() {
  try {
    // 2.7 Optimización con Promise.all
    const [payments, athletes] = await Promise.all([
      getPaymentsAsync(),
      getAthletesAsync()
    ])
    
    const teamAthletes = athletes.filter(a => a.team_id && a.team_status === 'activo')

    const monthlyData: { [key: string]: { revenue: number; paymentCount: number; month: string; monthLabel: string } } = {}

    payments.forEach(p => {
      if (p.status !== 'aprobado') return
      const d = new Date(p.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
      if (!monthlyData[key]) {
        monthlyData[key] = {
          revenue: 0,
          paymentCount: 0,
          month: key,
          monthLabel: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
        }
      }
      monthlyData[key].revenue += p.amount
      monthlyData[key].paymentCount += 1
    })

    const sortedMonths = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month))

    const totalRevenue = payments.filter(p => p.status === 'aprobado').reduce((sum, p) => sum + p.amount, 0)
    const totalActiveAthletes = teamAthletes.length
    const paidAthletes = teamAthletes.filter(a => a.payment_status === 'Pagado').length
    const unpaidAthletes = teamAthletes.filter(a => a.payment_status !== 'Pagado').length
    const morosityRate = totalActiveAthletes > 0 ? Math.round((unpaidAthletes / totalActiveAthletes) * 100) : 0

    return {
      monthlyData: sortedMonths,
      totalRevenue,
      totalActiveAthletes,
      paidAthletes,
      unpaidAthletes,
      morosityRate,
      averagePerAthlete: totalActiveAthletes > 0 ? Math.round(totalRevenue / totalActiveAthletes) : 0,
    }
  } catch (err) {
    console.error('Error in getAnalyticsDataAsync:', err)
    return {
      monthlyData: [],
      totalRevenue: 0,
      totalActiveAthletes: 0,
      paidAthletes: 0,
      unpaidAthletes: 0,
      morosityRate: 0,
      averagePerAthlete: 0,
    }
  }
}
