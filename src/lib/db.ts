'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { createAuthenticatedClient } from '@/lib/supabase/authenticated'
import { addMonthsWithClamp, computeNextPaymentDue, assertFilenameOwnership } from '@/lib/utils'
import {
  email as emailSchema,
  nonNegativeAmount,
  paymentMethod as paymentMethodSchema,
  rejectReason as rejectReasonSchema,
  safeFilename,
  shortText,
  teamInstructionsInput,
  updateTeamInput,
} from '@/lib/validators'
import { getCurrentUserAction } from '@/lib/actions'
import { getPricingConfig } from '@/lib/settings'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { rateLimitAction } from '@/lib/rate-limit'
import * as Sentry from '@sentry/nextjs'
import type { Team, Athlete, Payment, ActivityLog, MutationResult } from '@/lib/db-types'
import { fromDbAthlete, ok, fail } from '@/lib/db-types'
import {
  createNotificationInternal,
  logActivityInternal,
} from '@/lib/db-internal'
export type { Team, Athlete, Payment, ActivityLog, TrainingShift, ShiftInstructions } from '@/lib/db-types'

// =========== Auth Helpers ===========

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.email) {
    throw new Error('Unauthorized: No active session')
  }
  return session
}

async function requireAdmin() {
  const session = await requireSession()
  const supabase = createAuthenticatedClient(session.user.id)
  const { data: athlete } = await supabase
    .from('athletes')
    .select('role')
    .eq('user_id', session.user.id)
    .maybeSingle()
  
  if (!athlete || athlete.role !== 'admin') {
    throw new Error('Forbidden: Admin access required')
  }
  return session
}

function requireOwnershipOrAdmin(targetEmail: string) {
  return async () => {
    const session = await requireSession()
    const supabase = createAuthenticatedClient(session.user.id)
    const { data: athlete } = await supabase
      .from('athletes')
      .select('role')
      .eq('user_id', session.user.id)
      .maybeSingle()
    
    const isAdmin = athlete?.role === 'admin'
    const isOwner = session.user.email === targetEmail
    
    if (!isOwner && !isAdmin) {
      throw new Error('Forbidden: Cannot modify another user\'s data')
    }
    return session
  }
}

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
    genero: athlete.genero,
    fecha_nacimiento: athlete.fecha_nacimiento,
    tipo_documento: athlete.tipo_documento,
    pais: athlete.pais,
    provincia: athlete.provincia,
    ciudad: athlete.ciudad,
    codigo_postal: athlete.codigo_postal,
    domicilio: athlete.domicilio,
    documento_url: athlete.documento_url,
    documento_status: athlete.documento_status,
    avatar_url: athlete.avatar_url,
  };

  if (athlete.user_id !== undefined) {
    data.user_id = athlete.user_id;
  }

  return data;
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
    logo_url: (row.logo_url || '/rv-logo.png') as string,
    founded_date: (row.founded_date || '') as string,
    specialties: (row.specialties || '') as string,
    special_instructions: (row.special_instructions || '') as string,
    google_maps_url: (row.google_maps_url || '') as string,
    subscription_plans: (row.subscription_plans || '') as string,
    bank_cbu: (row.bank_cbu || '') as string,
    bank_alias: (row.bank_alias || '') as string,
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

// =========== Column Projections ===========

const TEAM_COLUMNS = 'id, name, description, whatsapp_url, training_days, coach, instructions, location, logo_url, founded_date, specialties, special_instructions, google_maps_url, subscription_plans, bank_cbu, bank_alias';
const ATHLETE_COLUMNS = 'id, user_id, email, name, role, onboarding_complete, dni, phone, talle_remera, contacto_emergencia_name, contacto_emergencia_phone, grupo_sanguineo, alergias, afecciones, apto_medico_url, apto_medico_status, apto_medico_vencimiento, apto_medico_motivo_rechazo, team_id, team_status, payment_status, payment_receipt_url, payment_method, payment_motivo_rechazo, genero, fecha_nacimiento, tipo_documento, pais, provincia, ciudad, codigo_postal, domicilio, documento_url, documento_status, avatar_url, mora_months, subscription_plan_id, next_payment_due, last_payment_date';
const PAYMENT_COLUMNS = 'id, athlete_email, athlete_name, amount, method, created_at, status';

// =========== Team Operations ===========

export async function getTeamAsync(teamId?: string): Promise<Team | null> {
  try {
    const session = await requireSession()
    const supabase = createAuthenticatedClient(session.user.id)
    let query = supabase.from('teams').select(TEAM_COLUMNS);
    if (teamId) {
      query = query.eq('id', teamId);
    }
    const { data, error } = await query.limit(1).maybeSingle();
    if (error) throw error;
    return data ? fromDbTeam(data) : null;
  } catch (err) {
    console.error('Error in getTeamAsync:', err);
    return null;
  }
}

export async function getTeamById(id: string): Promise<Team | null> {
  return getTeamAsync(id);
}

export async function updateTeamInstructionsAsync(instructions: string): Promise<MutationResult> {
  try {
    const parsed = teamInstructionsInput.safeParse(instructions)
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'invalid instructions', 'UNKNOWN')
    }
    const session = await requireAdmin()
    const supabase = createAuthenticatedClient(session.user.id)
    const activeTeam = await getTeamAsync();
    if (activeTeam?.id) {
      const { error } = await supabase
        .from('teams')
        .update({ instructions: parsed.data })
        .eq('id', activeTeam.id);
      if (error) throw error;
    }
    return ok()
  } catch (err) {
    Sentry.captureException(err, {
      tags: { source: 'db.updateTeamInstructionsAsync' },
      extra: { instructions },
    })
    console.error('Error in updateTeamInstructionsAsync:', err)
    return fail(String(err), 'DB_ERROR')
  }
}

export async function updateTeam(id: string, updates: Partial<Team>): Promise<MutationResult> {
  try {
    const parsed = updateTeamInput.safeParse(updates)
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'invalid team update', 'UNKNOWN')
    }
    const session = await requireAdmin()
    const supabase = createAuthenticatedClient(session.user.id)
    const { error } = await supabase
      .from('teams')
      .update(parsed.data)
      .eq('id', id);
    if (error) throw error;
    return ok()
  } catch (err) {
    Sentry.captureException(err, {
      tags: { source: 'db.updateTeam' },
      extra: { teamId: id, updates },
    })
    console.error('Error in updateTeam:', err)
    return fail(String(err), 'DB_ERROR')
  }
}

export async function getTeamsAsync(): Promise<Team[]> {
  try {
    const session = await requireSession()
    const supabase = createAuthenticatedClient(session.user.id)
    const { data, error } = await supabase
      .from('teams')
      .select(TEAM_COLUMNS)
      .order('name');
    if (error) throw error;
    return data ? data.map(fromDbTeam) : [];
  } catch (err) {
    console.error('Error in getTeamsAsync:', err);
    return [];
  }
}

// =========== Athletes Operations ===========

export interface PaginatedAthletes {
  athletes: Athlete[]
  total: number
  page: number
  pageSize: number
}

export async function getAthletesAsync(opts?: { page?: number; pageSize?: number }): Promise<PaginatedAthletes> {
  try {
    const session = await requireAdmin()
    const rl = await rateLimitAction(session.user.id, 'getAthletes', 60, '1 m')
    if (!rl.success) throw new Error(rl.error)
    const supabase = createAuthenticatedClient(session.user.id)
    const page = Math.max(1, opts?.page ?? 1)
    const pageSize = Math.max(1, Math.min(100, opts?.pageSize ?? 20))
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await supabase
      .from('athletes')
      .select(ATHLETE_COLUMNS, { count: 'exact' })
      .order('name')
      .range(from, to);
    if (error) throw error;
    return {
      athletes: data ? data.map(fromDbAthlete) : [],
      total: count ?? 0,
      page,
      pageSize,
    }
  } catch (err) {
    console.error('Error in getAthletesAsync:', err);
    return { athletes: [], total: 0, page: 1, pageSize: 20 }
  }
}

export async function getAllAthletes(opts?: { page?: number; pageSize?: number }): Promise<Athlete[]> {
  const res = await getAthletesAsync(opts)
  return res.athletes
}

export async function getPaginatedAthletesByTeamStatusAsync(
  teamStatus: 'pendiente' | 'activo',
  opts?: { page?: number; pageSize?: number },
): Promise<PaginatedAthletes> {
  try {
    const session = await requireAdmin()
    const rl = await rateLimitAction(session.user.id, 'getAthletes', 60, '1 m')
    if (!rl.success) throw new Error(rl.error)
    const supabase = createAuthenticatedClient(session.user.id)
    const page = Math.max(1, opts?.page ?? 1)
    const pageSize = Math.max(1, Math.min(100, opts?.pageSize ?? 20))
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await supabase
      .from('athletes')
      .select(ATHLETE_COLUMNS, { count: 'exact' })
      .eq('team_status', teamStatus)
      .order('name')
      .range(from, to)
    if (error) throw error
    return {
      athletes: data ? data.map(fromDbAthlete) : [],
      total: count ?? 0,
      page,
      pageSize,
    }
  } catch (err) {
    console.error('Error in getPaginatedAthletesByTeamStatusAsync:', err)
    return { athletes: [], total: 0, page: 1, pageSize: 20 }
  }
}

export async function getTeamMembers(teamId: string): Promise<Athlete[]> {
  try {
    const session = await requireSession()
    const supabase = createAuthenticatedClient(session.user.id)
    const { data, error } = await supabase
      .from('athletes')
      .select(ATHLETE_COLUMNS)
      .eq('team_id', teamId)
      .eq('team_status', 'activo')
      .order('name');
    if (error) throw error;
    return data ? data.map(fromDbAthlete) : [];
  } catch (err) {
    console.error('Error in getTeamMembers:', err);
    return [];
  }
}

export async function getAthleteByEmail(email: string): Promise<Athlete | null> {
  try {
    const session = await requireSession()
    const supabase = createAuthenticatedClient(session.user.id)
    const { data, error } = await supabase
      .from('athletes')
      .select(ATHLETE_COLUMNS)
      .eq('email', email)
      .maybeSingle();
    if (error) throw error;
    return data ? fromDbAthlete(data) : null;
  } catch (err) {
    console.error('Error in getAthleteByEmail:', err);
    return null;
  }
}

export async function updateAthleteProfileAsync(email: string, updates: Partial<Athlete>): Promise<Athlete | null> {
  try {
    const session = await requireOwnershipOrAdmin(email)()
    const supabase = createAuthenticatedClient(session.user.id)

    const dbUpdates: Record<string, unknown> = {};
    const snakeCaseData = toSnakeCase(updates);

    for (const [key, value] of Object.entries(snakeCaseData)) {
      if (value !== undefined) {
        dbUpdates[key] = value;
      }
    }

    const { data, error } = await supabase
      .from('athletes')
      .update(dbUpdates)
      .eq('email', email)
      .select()
      .single();

    if (error) throw error;
    return data ? fromDbAthlete(data) : null;
  } catch (err) {
    console.error('Error in updateAthleteProfileAsync:', err);
    return null;
  }
}

export async function updateProfileAsync(email: string, updates: Partial<Athlete>): Promise<Athlete | null> {
  return updateAthleteProfileAsync(email, updates);
}

export async function completeOnboardingAsync(email: string, updates: Partial<Athlete>): Promise<Athlete | null> {
  const session = await requireSession()
  const rl = await rateLimitAction(session.user.id, 'completeOnboarding', 20, '5 m')
  if (!rl.success) throw new Error(rl.error)
  return updateAthleteProfileAsync(email, {
    ...updates,
    onboarding_complete: true
  });
}

export async function requestJoinTeamAsync(email: string, teamId: string): Promise<void> {
  await updateAthleteProfileAsync(email, {
    team_id: teamId,
    team_status: 'pendiente',
  });
}

export async function joinTeamAndReturnAsync(email: string, teamId: string): Promise<Athlete | null> {
  await requestJoinTeamAsync(email, teamId);
  return await getCurrentUserAction();
}

export async function joinTeamAsync(email: string, teamId: string): Promise<void> {
  await requestJoinTeamAsync(email, teamId);
}

export async function leaveTeamAsync(email: string): Promise<void> {
  await updateAthleteProfileAsync(email, {
    team_id: null,
    team_status: null,
    payment_status: null,
    payment_receipt_url: undefined,
    payment_method: undefined,
    payment_motivo_rechazo: undefined,
  });
}

export async function leaveTeamAndReturnAsync(email: string): Promise<Athlete | null> {
  await updateAthleteProfileAsync(email, {
    team_id: null,
    team_status: null,
    payment_status: null,
    payment_receipt_url: undefined,
    payment_method: undefined,
    payment_motivo_rechazo: undefined,
  });
  return await getCurrentUserAction();
}

export async function uploadPaymentReceiptAsync(email: string, receiptName: string): Promise<MutationResult> {
  try {
    const emailParsed = emailSchema.safeParse(email)
    if (!emailParsed.success) {
      return fail(emailParsed.error.issues[0]?.message ?? 'invalid email', 'UNKNOWN')
    }
    const filenameParsed = safeFilename.safeParse(receiptName)
    if (!filenameParsed.success) {
      return fail(filenameParsed.error.issues[0]?.message ?? 'invalid filename', 'UNKNOWN')
    }
    const session = await requireSession()
    const rl = await rateLimitAction(session.user.id, 'uploadReceipt', 10, '5 m')
    if (!rl.success) throw new Error(rl.error)
    assertFilenameOwnership(session.user.email, receiptName, 'receipt')
    await updateAthleteProfileAsync(email, {
      payment_status: 'Pendiente_Verificacion',
      payment_receipt_url: receiptName,
      payment_motivo_rechazo: undefined,
    });
    return ok()
  } catch (err) {
    Sentry.captureException(err, {
      tags: { source: 'db.uploadPaymentReceiptAsync' },
      extra: { email, receiptName },
    })
    return fail(String(err), 'UNKNOWN')
  }
}

export async function uploadMedicalCertificateAsync(email: string, certName: string): Promise<MutationResult> {
  try {
    const emailParsed = emailSchema.safeParse(email)
    if (!emailParsed.success) {
      return fail(emailParsed.error.issues[0]?.message ?? 'invalid email', 'UNKNOWN')
    }
    const filenameParsed = safeFilename.safeParse(certName)
    if (!filenameParsed.success) {
      return fail(filenameParsed.error.issues[0]?.message ?? 'invalid filename', 'UNKNOWN')
    }
    const session = await requireSession()
    const rl = await rateLimitAction(session.user.id, 'uploadMedicalCert', 10, '5 m')
    if (!rl.success) throw new Error(rl.error)
    assertFilenameOwnership(session.user.email, certName, 'cert')
    await updateAthleteProfileAsync(email, {
      apto_medico_status: 'pendiente_verificacion',
      apto_medico_url: certName,
      apto_medico_motivo_rechazo: undefined,
    });
    return ok()
  } catch (err) {
    Sentry.captureException(err, {
      tags: { source: 'db.uploadMedicalCertificateAsync' },
      extra: { email, certName },
    })
    return fail(String(err), 'UNKNOWN')
  }
}

// =========== Admin Operations ===========

export async function updateAthleteTeamStatus(
  email: string,
  status: 'activo' | 'pendiente' | null,
): Promise<MutationResult> {
  try {
    const emailParsed = emailSchema.safeParse(email)
    if (!emailParsed.success) {
      return fail(emailParsed.error.issues[0]?.message ?? 'invalid email', 'UNKNOWN')
    }
    const session = await requireAdmin()
    const supabase = createAuthenticatedClient(session.user.id)
    const { data: athlete } = await supabase.from('athletes').select('name').eq('email', email).maybeSingle()
    const name = athlete?.name || 'Atleta'

    if (status === null) {
      await updateAthleteProfileAsync(email, {
        team_id: null,
        team_status: null,
        payment_status: null,
        payment_receipt_url: '',
        payment_method: '',
        payment_motivo_rechazo: '',
        mora_months: 0,
        next_payment_due: null,
        last_payment_date: null,
      });
      await logActivityAsync('atletas', 'baja', name, email, 'Atleta dado de baja del equipo');
    } else if (status === 'activo') {
      const pricing = await getPricingConfig()
      const nextDue = computeNextPaymentDue(new Date(), pricing.dueDay).toISOString()
      await supabase
        .from('athletes')
        .update({
          team_status: 'activo',
          payment_status: 'Pendiente_Pago',
          next_payment_due: nextDue,
          mora_months: 0,
        })
        .eq('email', email)
      await logActivityAsync('atletas', 'alta', name, email, 'Atleta activado en el equipo');
    } else {
      await updateAthleteProfileAsync(email, {
        team_status: status,
      });
    }
    return ok()
  } catch (err) {
    Sentry.captureException(err, {
      tags: { source: 'db.updateAthleteTeamStatus' },
      extra: { email, status },
    })
    console.error('Error in updateAthleteTeamStatus:', err)
    return fail(String(err), 'DB_ERROR')
  }
}

export async function updateAthleteAptoStatus(
  email: string,
  status: 'no_entregado' | 'pendiente_verificacion' | 'vigente' | 'rechazado',
  vencimiento: string | null,
  rejectReason?: string
): Promise<void> {
  const session = await requireAdmin()
  const supabase = createAuthenticatedClient(session.user.id)
  const { data: athlete } = await supabase.from('athletes').select('name, user_id').eq('email', email).maybeSingle()
  const name = athlete?.name || 'Atleta'

  await updateAthleteProfileAsync(email, {
    apto_medico_status: status,
    apto_medico_vencimiento: vencimiento || undefined,
    apto_medico_motivo_rechazo: rejectReason || undefined,
  });

  if (status === 'vigente') {
    await logActivityAsync('aptos_medicos', 'aprobado', name, email, 'Apto médico aprobado');
    if (athlete && athlete.user_id) {
      await createNotification(athlete.user_id, "Apto médico aprobado", "Tu apto médico ha sido aprobado con éxito.");
    }
  } else if (status === 'rechazado') {
    await logActivityAsync('aptos_medicos', 'rechazado', name, email, `Apto médico rechazado. Motivo: ${rejectReason || 'No especificado'}`);
    if (athlete && athlete.user_id) {
      await createNotification(athlete.user_id, "Apto médico rechazado", `Tu apto médico fue rechazado. Motivo: ${rejectReason || 'No especificado'}`);
    }
  }
}

export async function updateAthletePaymentStatus(
  email: string,
  status: 'Pendiente_Pago' | 'Pendiente_Verificacion' | 'Pagado' | 'Vencido' | null,
  rejectReason?: string
): Promise<void> {
  await requireAdmin()
  await updateAthleteProfileAsync(email, {
    payment_status: status,
    payment_motivo_rechazo: rejectReason || undefined,
  });
}

export async function processRequestAsync(email: string, approve: boolean): Promise<void> {
  const session = await requireAdmin()
  const supabase = createAuthenticatedClient(session.user.id)
  const { data: athlete } = await supabase.from('athletes').select('name, user_id').eq('email', email).maybeSingle()
  const name = athlete?.name || 'Atleta'

  if (approve) {
    await updateAthleteTeamStatus(email, 'activo');
    await logActivityAsync('solicitudes', 'aprobado', name, email, 'Solicitud de ingreso aprobada');
    if (athlete && athlete.user_id) {
      await createNotification(athlete.user_id, "Solicitud aprobada", "Tu solicitud para unirte al equipo fue aprobada.");
    }
  } else {
    await updateAthleteTeamStatus(email, null);
    await logActivityAsync('solicitudes', 'rechazado', name, email, 'Solicitud de ingreso rechazada');
  }
}

async function checkDuplicatePayment(email: string): Promise<boolean> {
  const supabase = createServiceClient();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0, 23, 59, 59, 999);

  const { data, error } = await supabase
    .from('payments')
    .select('id')
    .eq('athlete_email', email)
    .gte('created_at', startOfMonth.toISOString())
    .lte('created_at', endOfMonth.toISOString())
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error checking duplicate payment:', error);
    return false;
  }
  return !!data;
}

export async function addPaymentRecord(
  email: string,
  name: string,
  amount: number,
  method: string,
): Promise<MutationResult> {
  try {
    const emailParsed = emailSchema.safeParse(email)
    if (!emailParsed.success) {
      return fail(emailParsed.error.issues[0]?.message ?? 'invalid email', 'UNKNOWN')
    }
    const amountParsed = nonNegativeAmount().safeParse(amount)
    if (!amountParsed.success) {
      return fail(amountParsed.error.issues[0]?.message ?? 'invalid amount', 'UNKNOWN')
    }
    const methodParsed = paymentMethodSchema.safeParse(method)
    if (!methodParsed.success) {
      return fail(methodParsed.error.issues[0]?.message ?? 'invalid payment method', 'UNKNOWN')
    }
    const validatedEmail = emailParsed.data

    const session = await requireAdmin()
    const supabase = createAuthenticatedClient(session.user.id)

    const isDuplicate = await checkDuplicatePayment(validatedEmail);
    if (isDuplicate) {
      console.warn(`Payment for ${validatedEmail} this month already exists. Skipping insertion for idempotency.`);
      return fail(`Pago duplicado para ${validatedEmail} en el mes actual`, 'DUPLICATE')
    }

    const { error } = await supabase.from('payments').insert({
      athlete_email: validatedEmail,
      athlete_name: name,
      amount: amount,
      method: method,
      status: 'aprobado',
    });

    if (error) throw error;
    return ok()
  } catch (err) {
    Sentry.captureException(err, {
      tags: { source: 'db.addPaymentRecord' },
      extra: { email, name, amount, method },
    })
    console.error('Error in addPaymentRecord:', err)
    return fail(String(err), 'DB_ERROR')
  }
}

export async function processPaymentAsync(
  email: string,
  approve: boolean,
  method?: string,
  reason?: string,
): Promise<MutationResult> {
  try {
    const emailParsed = emailSchema.safeParse(email)
    if (!emailParsed.success) {
      return fail(emailParsed.error.issues[0]?.message ?? 'invalid email', 'UNKNOWN')
    }
    const validatedEmail = emailParsed.data
    if (approve && method) {
      const methodParsed = paymentMethodSchema.safeParse(method)
      if (!methodParsed.success) {
        return fail(methodParsed.error.issues[0]?.message ?? 'invalid payment method', 'UNKNOWN')
      }
    }
    if (!approve && reason) {
      const reasonParsed = rejectReasonSchema.safeParse(reason)
      if (!reasonParsed.success) {
        return fail(reasonParsed.error.issues[0]?.message ?? 'invalid reject reason', 'UNKNOWN')
      }
    }

    const session = await requireAdmin()
    const supabase = createAuthenticatedClient(session.user.id)

    if (approve) {
      const pricing = await getPricingConfig()
      const now = new Date()
      const nextDue = computeNextPaymentDue(now, pricing.dueDay).toISOString()
      await supabase
        .from('athletes')
        .update({
          payment_status: 'Pagado',
          payment_method: method || 'Transferencia',
          payment_motivo_rechazo: null,
          last_payment_date: now.toISOString(),
          next_payment_due: nextDue,
          mora_months: 0,
        })
        .eq('email', validatedEmail)

      const { data: athlete, error: athleteError } = await supabase
        .from('athletes')
        .select('name')
        .eq('email', validatedEmail)
        .maybeSingle();

      if (athleteError) throw athleteError;

      if (athlete) {
        const result = await addPaymentRecord(validatedEmail, athlete.name, pricing.amount, method || 'Transferencia')
        if (!result.success) return result
      }
      return ok()
    } else {
      await updateAthleteProfileAsync(validatedEmail, {
        payment_status: 'Vencido',
        payment_motivo_rechazo: reason || 'Comprobante no valido',
      });
      return ok()
    }
  } catch (err) {
    Sentry.captureException(err, {
      tags: { source: 'db.processPaymentAsync' },
      extra: { email, approve, method, reason },
    })
    console.error('Error in processPaymentAsync:', err)
    return fail(String(err), 'DB_ERROR')
  }
}

export async function processCertificateAsync(
  email: string,
  approve: boolean,
  months?: number,
  reason?: string,
): Promise<MutationResult> {
  try {
    const emailParsed = emailSchema.safeParse(email)
    if (!emailParsed.success) {
      return fail(emailParsed.error.issues[0]?.message ?? 'invalid email', 'UNKNOWN')
    }
    if (reason) {
      const reasonParsed = rejectReasonSchema.safeParse(reason)
      if (!reasonParsed.success) {
        return fail(reasonParsed.error.issues[0]?.message ?? 'invalid reason', 'UNKNOWN')
      }
    }
    await requireAdmin()
    if (approve) {
      const monthsValidity = months || 6;
      const expirationDate = addMonthsWithClamp(new Date(), monthsValidity);

      await updateAthleteProfileAsync(email, {
        apto_medico_status: 'vigente',
        apto_medico_vencimiento: expirationDate.toISOString(),
        apto_medico_motivo_rechazo: undefined,
      });
    } else {
      await updateAthleteProfileAsync(email, {
        apto_medico_status: 'rechazado',
        apto_medico_motivo_rechazo: reason || 'Certificado medico borroso o no legible',
      });
    }
    return ok()
  } catch (err) {
    Sentry.captureException(err, {
      tags: { source: 'db.processCertificateAsync' },
      extra: { email, approve, months, reason },
    })
    console.error('Error in processCertificateAsync:', err)
    return fail(String(err), 'DB_ERROR')
  }
}

export async function expelAthleteAsync(email: string): Promise<void> {
  await leaveTeamAsync(email);
}

// =========== Payments Operations ===========

export async function getPaymentsAsync(): Promise<Payment[]> {
  try {
    const session = await requireAdmin()
    const rl = await rateLimitAction(session.user.id, 'getPayments', 30, '1 m')
    if (!rl.success) throw new Error(rl.error)
    const supabase = createAuthenticatedClient(session.user.id)
    const { data, error } = await supabase
      .from('payments')
      .select(PAYMENT_COLUMNS)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ? data.map(fromDbPayment) : [];
  } catch (err) {
    console.error('Error in getPaymentsAsync:', err);
    return [];
  }
}

export async function getPaymentHistory(): Promise<Payment[]> {
  return getPaymentsAsync();
}

// =========== Analytics ===========

export async function getAnalyticsDataAsync() {
  try {
    const session = await requireAdmin()
    const supabase = createAuthenticatedClient(session.user.id)

    const [{ data: paymentsData }, { data: athletesData }] = await Promise.all([
      supabase.from('payments').select(PAYMENT_COLUMNS).order('created_at', { ascending: false }),
      supabase.from('athletes').select(ATHLETE_COLUMNS).order('name'),
    ])

    const payments = paymentsData ? paymentsData.map(fromDbPayment) : []
    const athletes = athletesData ? athletesData.map(fromDbAthlete) : []

    const teamAthletes = athletes.filter(a => a.team_id && a.team_status === 'activo');

    const monthlyData: { [key: string]: { revenue: number; paymentCount: number; month: string; monthLabel: string } } = {};

    payments.forEach(p => {
      if (p.status !== 'aprobado') return;
      const d = new Date(p.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      if (!monthlyData[key]) {
        monthlyData[key] = {
          revenue: 0,
          paymentCount: 0,
          month: key,
          monthLabel: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
        };
      }
      monthlyData[key].revenue += p.amount;
      monthlyData[key].paymentCount += 1;
    });

    const sortedMonths = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

    const totalRevenue = payments.filter(p => p.status === 'aprobado').reduce((sum, p) => sum + p.amount, 0);
    const totalActiveAthletes = teamAthletes.length;
    const paidAthletes = teamAthletes.filter(a => a.payment_status === 'Pagado').length;
    const unpaidAthletes = teamAthletes.filter(a => a.payment_status !== 'Pagado').length;
    const morosityRate = totalActiveAthletes > 0 ? Math.round((unpaidAthletes / totalActiveAthletes) * 100) : 0;

    return {
      monthlyData: sortedMonths,
      totalRevenue,
      totalActiveAthletes,
      paidAthletes,
      unpaidAthletes,
      morosityRate,
      averagePerAthlete: totalActiveAthletes > 0 ? Math.round(totalRevenue / totalActiveAthletes) : 0,
    };
  } catch (err) {
    console.error('Error in getAnalyticsDataAsync:', err);
    return {
      monthlyData: [],
      totalRevenue: 0,
      totalActiveAthletes: 0,
      paidAthletes: 0,
      unpaidAthletes: 0,
      morosityRate: 0,
      averagePerAthlete: 0,
    };
  }
}

// =========== Notification & Activity Log Operations ===========

export async function logActivityAsync(
  category: 'solicitudes' | 'atletas' | 'pagos' | 'aptos_medicos',
  action: string,
  athleteName: string | null,
  athleteEmail: string | null,
  details: string | null
): Promise<void> {
  await requireAdmin()
  try {
    await logActivityInternal(category, action, athleteName, athleteEmail, details)
  } catch (err) {
    console.error('Error in logActivityAsync:', err)
  }
}

export async function getActivityLogsAsync(): Promise<ActivityLog[]> {
  try {
    const session = await requireAdmin();
    const supabase = createAuthenticatedClient(session.user.id)
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as ActivityLog[];
  } catch (err) {
    console.error('Error in getActivityLogsAsync:', err);
    return [];
  }
}

export async function createNotification(
  userId: string,
  title: string,
  message: string
): Promise<void> {
  await requireAdmin()
  try {
    await createNotificationInternal(userId, title, message)
  } catch (err) {
    console.error('Error in createNotification:', err)
  }
}

export async function getNotifications(userId: string) {
  try {
    const session = await requireSession()
    const supabase = createAuthenticatedClient(session.user.id)
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error in getNotifications:', err);
    return [];
  }
}

export async function markNotificationsAsRead(userId: string): Promise<void> {
  try {
    const session = await requireSession()
    const supabase = createAuthenticatedClient(session.user.id)
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId);
    if (error) throw error;
  } catch (err) {
    console.error('Error in markNotificationsAsRead:', err);
  }
}

// =========== Unified Payment Operations ===========

export async function approvePaymentAsync(
  email: string,
  name: string,
  amount: number,
  method: string
): Promise<MutationResult> {
  try {
    const emailParsed = emailSchema.safeParse(email)
    if (!emailParsed.success) {
      return fail(emailParsed.error.issues[0]?.message ?? 'invalid email', 'UNKNOWN')
    }
    const amountParsed = nonNegativeAmount().safeParse(amount)
    if (!amountParsed.success) {
      return fail(amountParsed.error.issues[0]?.message ?? 'invalid amount', 'UNKNOWN')
    }
    const methodParsed = paymentMethodSchema.safeParse(method)
    if (!methodParsed.success) {
      return fail(methodParsed.error.issues[0]?.message ?? 'invalid payment method', 'UNKNOWN')
    }
    const nameParsed = shortText(120).safeParse(name)
    if (!nameParsed.success) {
      return fail(nameParsed.error.issues[0]?.message ?? 'invalid name', 'UNKNOWN')
    }

    const validatedEmail = emailParsed.data
    const validatedName = nameParsed.data

    const session = await requireAdmin();
    const supabase = createAuthenticatedClient(session.user.id)

    const { data: athlete } = await supabase
      .from('athletes')
      .select('user_id')
      .eq('email', validatedEmail)
      .maybeSingle();

    const pricing = await getPricingConfig()
    const now = new Date()
    const nextDue = computeNextPaymentDue(now, pricing.dueDay).toISOString()
    await supabase
      .from('athletes')
      .update({
        payment_status: 'Pagado',
        payment_receipt_url: '',
        payment_motivo_rechazo: null,
        mora_months: 0,
        last_payment_date: now.toISOString(),
        next_payment_due: nextDue,
      })
      .eq('email', validatedEmail);

    // The athlete update happened. If the payment record insert fails, the
    // system is in an inconsistent state (athlete marked Pagado but no
    // payment row). Surface this loudly to the caller.
    const paymentResult = await addPaymentRecord(validatedEmail, validatedName, amount, method);
    if (!paymentResult.success) {
      Sentry.captureException(new Error(`approvePaymentAsync: payment record failed for ${validatedEmail}`), {
        tags: { source: 'db.approvePaymentAsync' },
        extra: { email: validatedEmail, name: validatedName, amount, method, paymentError: paymentResult.error },
        level: 'error',
      })
      return paymentResult
    }

    await logActivityAsync('pagos', 'aprobado', validatedName, validatedEmail, `Pago aprobado de $${amount.toLocaleString()} via ${method}`);

    if (athlete && athlete.user_id) {
      await createNotification(
        athlete.user_id,
        "Pago aprobado",
        `Tu pago de $${amount.toLocaleString()} mediante ${method} ha sido aprobado con exito.`
      );
    }
    return ok()
  } catch (err) {
    Sentry.captureException(err, {
      tags: { source: 'db.approvePaymentAsync' },
      extra: { email, name, amount, method },
    })
    console.error('Error in approvePaymentAsync:', err)
    return fail(String(err), 'DB_ERROR')
  }
}

export async function rejectPaymentAsync(email: string, rejectReason: string): Promise<MutationResult> {
  try {
    const emailParsed = emailSchema.safeParse(email)
    if (!emailParsed.success) {
      return fail(emailParsed.error.issues[0]?.message ?? 'invalid email', 'UNKNOWN')
    }
    const reasonParsed = rejectReasonSchema.safeParse(rejectReason)
    if (!reasonParsed.success) {
      return fail(reasonParsed.error.issues[0]?.message ?? 'invalid reject reason', 'UNKNOWN')
    }
    const validatedEmail = emailParsed.data
    const validatedReason = reasonParsed.data

    const session = await requireAdmin();
    const supabase = createAuthenticatedClient(session.user.id)

    const { data: athlete } = await supabase
      .from('athletes')
      .select('user_id, name')
      .eq('email', validatedEmail)
      .maybeSingle();

    await updateAthleteProfileAsync(validatedEmail, {
      payment_status: 'Pendiente_Pago',
      payment_receipt_url: '',
      payment_motivo_rechazo: validatedReason,
    });

    const name = athlete?.name || 'Atleta';
    await logActivityAsync('pagos', 'rechazado', name, validatedEmail, `Comprobante de pago rechazado. Motivo: ${validatedReason}`);

    if (athlete && athlete.user_id) {
      await createNotification(
        athlete.user_id,
        "Comprobante rechazado",
        "Tu comprobante de pago fue rechazado. Por favor, sube uno nuevo."
      );
    }
    return ok()
  } catch (err) {
    Sentry.captureException(err, {
      tags: { source: 'db.rejectPaymentAsync' },
      extra: { email, rejectReason },
    })
    console.error('Error in rejectPaymentAsync:', err)
    return fail(String(err), 'DB_ERROR')
  }
}

export async function condonePaymentAsync(
  email: string,
  name: string,
): Promise<MutationResult> {
  try {
    const emailParsed = emailSchema.safeParse(email)
    if (!emailParsed.success) {
      return fail(emailParsed.error.issues[0]?.message ?? 'invalid email', 'UNKNOWN')
    }
    const nameParsed = shortText(120).safeParse(name)
    if (!nameParsed.success) {
      return fail(nameParsed.error.issues[0]?.message ?? 'invalid name', 'UNKNOWN')
    }
    const validatedEmail = emailParsed.data
    const validatedName = nameParsed.data

    const session = await requireAdmin();
    const supabase = createAuthenticatedClient(session.user.id)

    const { data: athlete } = await supabase
      .from('athletes')
      .select('user_id')
      .eq('email', validatedEmail)
      .maybeSingle();

    await updateAthleteProfileAsync(validatedEmail, {
      payment_status: 'Pagado',
      payment_receipt_url: '',
      mora_months: 0,
    });

    const paymentResult = await addPaymentRecord(validatedEmail, validatedName, 0, 'Condonado');
    if (!paymentResult.success) {
      Sentry.captureException(new Error(`condonePaymentAsync: payment record failed for ${validatedEmail}`), {
        tags: { source: 'db.condonePaymentAsync' },
        extra: { email: validatedEmail, name: validatedName, paymentError: paymentResult.error },
        level: 'error',
      })
      return paymentResult
    }

    await logActivityAsync('pagos', 'condonado', validatedName, validatedEmail, 'Pago de cuota mensual condonado');

    if (athlete && athlete.user_id) {
      await createNotification(
        athlete.user_id,
        "Pago condonado",
        `El pago de tu cuota mensual ha sido condonado por el administrador.`
      );
    }
    return ok()
  } catch (err) {
    Sentry.captureException(err, {
      tags: { source: 'db.condonePaymentAsync' },
      extra: { email, name },
    })
    console.error('Error in condonePaymentAsync:', err)
    return fail(String(err), 'DB_ERROR')
  }
}
