'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { createAuthenticatedClient } from '@/lib/supabase/authenticated'
import { addMonthsWithClamp } from '@/lib/utils'
import { getCurrentUserAction } from '@/lib/actions'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { rateLimitAction } from '@/lib/rate-limit'
import type { Team, Athlete, Payment, ActivityLog } from '@/lib/db-types'
import { fromDbAthlete } from '@/lib/db-types'
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
const ATHLETE_COLUMNS = 'id, user_id, email, name, role, onboarding_complete, dni, phone, talle_remera, contacto_emergencia_name, contacto_emergencia_phone, grupo_sanguineo, alergias, afecciones, apto_medico_url, apto_medico_status, apto_medico_vencimiento, apto_medico_motivo_rechazo, team_id, team_status, payment_status, payment_receipt_url, payment_method, payment_motivo_rechazo, genero, fecha_nacimiento, tipo_documento, pais, provincia, ciudad, codigo_postal, domicilio, documento_url, documento_status, avatar_url, mora_months, subscription_plan_id';
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

export async function updateTeamInstructionsAsync(instructions: string): Promise<void> {
  try {
    const session = await requireAdmin()
    const supabase = createAuthenticatedClient(session.user.id)
    const activeTeam = await getTeamAsync();
    if (activeTeam?.id) {
      const { error } = await supabase
        .from('teams')
        .update({ instructions })
        .eq('id', activeTeam.id);
      if (error) throw error;
    }
  } catch (err) {
    console.error('Error in updateTeamInstructionsAsync:', err);
  }
}

export async function updateTeam(id: string, updates: Partial<Team>): Promise<void> {
  try {
    const session = await requireAdmin()
    const supabase = createAuthenticatedClient(session.user.id)
    const { error } = await supabase
      .from('teams')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error('Error in updateTeam:', err);
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

export async function getAthletesAsync(): Promise<Athlete[]> {
  try {
    const session = await requireAdmin()
    const rl = await rateLimitAction(session.user.id, 'getAthletes', 60, '1 m')
    if (!rl.success) throw new Error(rl.error)
    const supabase = createAuthenticatedClient(session.user.id)
    const { data, error } = await supabase
      .from('athletes')
      .select(ATHLETE_COLUMNS)
      .order('name');
    if (error) throw error;
    return data ? data.map(fromDbAthlete) : [];
  } catch (err) {
    console.error('Error in getAthletesAsync:', err);
    return [];
  }
}

export async function getAllAthletes(): Promise<Athlete[]> {
  return getAthletesAsync();
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

export async function uploadPaymentReceiptAsync(email: string, receiptName: string): Promise<void> {
  const session = await requireSession()
  const rl = await rateLimitAction(session.user.id, 'uploadReceipt', 10, '5 m')
  if (!rl.success) throw new Error(rl.error)
  await updateAthleteProfileAsync(email, {
    payment_status: 'Pendiente_Verificacion',
    payment_receipt_url: receiptName,
    payment_motivo_rechazo: undefined,
  });
}

export async function uploadMedicalCertificateAsync(email: string, certName: string): Promise<void> {
  const session = await requireSession()
  const rl = await rateLimitAction(session.user.id, 'uploadMedicalCert', 10, '5 m')
  if (!rl.success) throw new Error(rl.error)
  await updateAthleteProfileAsync(email, {
    apto_medico_status: 'pendiente_verificacion',
    apto_medico_url: certName,
    apto_medico_motivo_rechazo: undefined,
  });
}

// =========== Admin Operations ===========

export async function updateAthleteTeamStatus(email: string, status: 'activo' | 'pendiente' | null): Promise<void> {
  try {
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
      });
      await logActivityAsync('atletas', 'baja', name, email, 'Atleta dado de baja del equipo');
    } else if (status === 'activo') {
      await updateAthleteProfileAsync(email, {
        team_status: 'activo',
        payment_status: 'Pendiente_Pago',
      });
      await logActivityAsync('atletas', 'alta', name, email, 'Atleta activado en el equipo');
    } else {
      await updateAthleteProfileAsync(email, {
        team_status: status,
      });
    }
  } catch (err) {
    console.error('Error in updateAthleteTeamStatus:', err);
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

export async function addPaymentRecord(email: string, name: string, amount: number, method: string): Promise<void> {
  try {
    const session = await requireAdmin()
    const supabase = createAuthenticatedClient(session.user.id)

    const isDuplicate = await checkDuplicatePayment(email);
    if (isDuplicate) {
      console.warn(`Payment for ${email} this month already exists. Skipping insertion for idempotency.`);
      return;
    }

    const { error } = await supabase.from('payments').insert({
      athlete_email: email,
      athlete_name: name,
      amount: amount,
      method: method,
      status: 'aprobado',
    });

    if (error) throw error;
  } catch (err) {
    console.error('Error in addPaymentRecord:', err);
  }
}

export async function processPaymentAsync(email: string, approve: boolean, method?: string, reason?: string): Promise<void> {
  try {
    const session = await requireAdmin()
    const supabase = createAuthenticatedClient(session.user.id)

    if (approve) {
      await updateAthleteProfileAsync(email, {
        payment_status: 'Pagado',
        payment_method: method || 'Transferencia',
        payment_motivo_rechazo: undefined,
      });

      const { data: athlete, error: athleteError } = await supabase
        .from('athletes')
        .select('name')
        .eq('email', email)
        .maybeSingle();

      if (athleteError) throw athleteError;

      if (athlete) {
        await addPaymentRecord(email, athlete.name, 17000, method || 'Transferencia');
      }
    } else {
      await updateAthleteProfileAsync(email, {
        payment_status: 'Vencido',
        payment_motivo_rechazo: reason || 'Comprobante no valido',
      });
    }
  } catch (err) {
    console.error('Error in processPaymentAsync:', err);
  }
}

export async function processCertificateAsync(email: string, approve: boolean, months?: number, reason?: string): Promise<void> {
  try {
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
  } catch (err) {
    console.error('Error in processCertificateAsync:', err);
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
  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from('activity_logs')
      .insert({
        category,
        action,
        athlete_name: athleteName,
        athlete_email: athleteEmail,
        details,
      });
    if (error) throw error;
  } catch (err) {
    console.error('Error in logActivityAsync:', err);
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
  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        read: false,
      });
    if (error) throw error;
  } catch (err) {
    console.error('Error in createNotification:', err);
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
): Promise<void> {
  const session = await requireAdmin();
  const supabase = createAuthenticatedClient(session.user.id)

  const { data: athlete } = await supabase
    .from('athletes')
    .select('user_id')
    .eq('email', email)
    .maybeSingle();

  await updateAthleteProfileAsync(email, {
    payment_status: 'Pagado',
    payment_receipt_url: '',
    mora_months: 0,
  });

  await addPaymentRecord(email, name, amount, method);
  await logActivityAsync('pagos', 'aprobado', name, email, `Pago aprobado de $${amount.toLocaleString()} via ${method}`);

  if (athlete && athlete.user_id) {
    await createNotification(
      athlete.user_id,
      "Pago aprobado",
      `Tu pago de $${amount.toLocaleString()} mediante ${method} ha sido aprobado con exito.`
    );
  }
}

export async function rejectPaymentAsync(email: string, rejectReason: string): Promise<void> {
  const session = await requireAdmin();
  const supabase = createAuthenticatedClient(session.user.id)

  const { data: athlete } = await supabase
    .from('athletes')
    .select('user_id, name')
    .eq('email', email)
    .maybeSingle();

  await updateAthleteProfileAsync(email, {
    payment_status: 'Pendiente_Pago',
    payment_receipt_url: '',
    payment_motivo_rechazo: rejectReason,
  });

  const name = athlete?.name || 'Atleta';
  await logActivityAsync('pagos', 'rechazado', name, email, `Comprobante de pago rechazado. Motivo: ${rejectReason}`);

  if (athlete && athlete.user_id) {
    await createNotification(
      athlete.user_id,
      "Comprobante rechazado",
      "Tu comprobante de pago fue rechazado. Por favor, sube uno nuevo."
    );
  }
}

export async function condonePaymentAsync(email: string, name: string): Promise<void> {
  const session = await requireAdmin();
  const supabase = createAuthenticatedClient(session.user.id)

  const { data: athlete } = await supabase
    .from('athletes')
    .select('user_id')
    .eq('email', email)
    .maybeSingle();

  await updateAthleteProfileAsync(email, {
    payment_status: 'Pagado',
    payment_receipt_url: '',
    mora_months: 0,
  });

  await addPaymentRecord(email, name, 0, 'Condonado');
  await logActivityAsync('pagos', 'condonado', name, email, 'Pago de cuota mensual condonado');

  if (athlete && athlete.user_id) {
    await createNotification(
      athlete.user_id,
      "Pago condonado",
      `El pago de tu cuota mensual ha sido condonado por el administrador.`
    );
  }
}

export async function checkUpcomingExpirations(): Promise<{
  notified30: number
  notified15: number
  notified7: number
  expired: number
}> {
  const supabase = createServiceClient()
  const now = new Date()

  const { data: active } = await supabase
    .from('athletes')
    .select('id, user_id, name, email, apto_medico_vencimiento')
    .eq('apto_medico_status', 'vigente')

  if (!active?.length) return { notified30: 0, notified15: 0, notified7: 0, expired: 0 }

  let notified30 = 0, notified15 = 0, notified7 = 0, expired = 0

  for (const a of active) {
    if (!a.apto_medico_vencimiento || !a.user_id) continue

    const expDate = new Date(a.apto_medico_vencimiento)
    const daysLeft = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const expStr = expDate.toLocaleDateString('es-AR')

    if (daysLeft <= 0) {
      await supabase.from('athletes').update({ apto_medico_status: 'vencido' }).eq('id', a.id)
      await createNotification(a.user_id, 'Apto medico vencido', `Tu certificado vencio el ${expStr}. Subi uno nuevo.`)
      await logActivityAsync('aptos_medicos', 'vencido', a.name, a.email, `Vencio el ${expStr}`)
      expired++
    } else if (daysLeft <= 7) {
      await createNotification(a.user_id, 'Apto medico por vencer', `Tu certificado vence en ${daysLeft} dias (${expStr}).`)
      notified7++
    } else if (daysLeft <= 15) {
      await createNotification(a.user_id, 'Apto medico proximo a vencer', `Tu certificado vence el ${expStr}. Quedan ${daysLeft} dias.`)
      notified15++
    } else if (daysLeft <= 30) {
      await createNotification(a.user_id, 'Renova tu apto medico', `Tu certificado vence el ${expStr}. Renovalo con tiempo.`)
      notified30++
    }
  }

  return { notified30, notified15, notified7, expired }
}
