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
  founded_date?: string;
  specialties?: string;
  special_instructions?: string;
  google_maps_url?: string;
  subscription_plans?: string;
  bank_cbu?: string;
  bank_alias?: string;
}

export interface TrainingShift {
  id: string;
  name: string;
  days: string;
  time: string;
  location: string;
}

export interface ShiftInstructions {
  general?: string;
  shifts: Record<string, string>;
}

export function parseTrainingDays(trainingDaysStr: string | undefined | null): TrainingShift[] | null {
  if (!trainingDaysStr) return null;
  try {
    const parsed = JSON.parse(trainingDaysStr);
    if (Array.isArray(parsed) && parsed.every(item => item && typeof item === 'object' && 'id' in item && 'name' in item)) {
      return parsed as TrainingShift[];
    }
  } catch {
  }
  return null;
}

export function parseInstructions(instructionsStr: string | undefined | null): ShiftInstructions | null {
  if (!instructionsStr) return null;
  try {
    const parsed = JSON.parse(instructionsStr);
    if (parsed && typeof parsed === 'object' && 'shifts' in parsed) {
      return parsed as ShiftInstructions;
    }
  } catch {
  }
  return null;
}

export interface Athlete {
  id?: string;
  user_id?: string;
  email: string;
  name: string;
  role: 'atleta' | 'admin' | null;
  onboarding_complete: boolean;
  dni?: string;
  phone?: string;
  talle_remera?: string;
  contacto_emergencia_name?: string;
  contacto_emergencia_phone?: string;
  grupo_sanguineo?: string;
  alergias?: string;
  afecciones?: string;
  apto_medico_url?: string;
  apto_medico_status?: 'no_entregado' | 'pendiente_verificacion' | 'vigente' | 'rechazado' | 'vencido';
  apto_medico_vencimiento?: string;
  apto_medico_motivo_rechazo?: string;
  team_id?: string | null;
  team_status?: 'pendiente' | 'activo' | null;
  payment_status?: 'Pendiente_Pago' | 'Pendiente_Verificacion' | 'Pagado' | 'Vencido' | null;
  payment_receipt_url?: string;
  payment_method?: string;
  payment_motivo_rechazo?: string;
  genero?: string;
  fecha_nacimiento?: string;
  tipo_documento?: string;
  pais?: string;
  provincia?: string;
  ciudad?: string;
  codigo_postal?: string;
  domicilio?: string;
  documento_url?: string;
  documento_status?: 'no_entregado' | 'pendiente_verificacion' | 'vigente' | 'rechazado';
  avatar_url?: string;
  mora_months?: number;
  subscription_plan_id?: string;
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

export interface ActivityLog {
  id: string;
  category: 'solicitudes' | 'atletas' | 'pagos' | 'aptos_medicos';
  action: string;
  athlete_name: string | null;
  athlete_email: string | null;
  details: string | null;
  created_at: string;
}

export function fromDbAthlete(row: Record<string, unknown>): Athlete {
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
    genero: row.genero as string | undefined,
    fecha_nacimiento: row.fecha_nacimiento as string | undefined,
    tipo_documento: row.tipo_documento as string | undefined,
    pais: row.pais as string | undefined,
    provincia: row.provincia as string | undefined,
    ciudad: row.ciudad as string | undefined,
    codigo_postal: row.codigo_postal as string | undefined,
    domicilio: row.domicilio as string | undefined,
    documento_url: row.documento_url as string | undefined,
    documento_status: row.documento_status as Athlete['documento_status'],
    avatar_url: row.avatar_url as string | undefined,
    mora_months: (row.mora_months as number) || 0,
    subscription_plan_id: row.subscription_plan_id as string | undefined,
  };
}
