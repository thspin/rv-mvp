'use client';

import { useState, useEffect, useReducer } from 'react';
import Image from 'next/image';
import { updateProfileAsync, completeOnboardingAsync, Athlete } from '@/lib/db';
import { getCurrentUserAction } from '@/lib/actions';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useFileUpload } from '@/hooks/useFileUpload';
import Navbar from '@/components/Navbar';
import HeaderAlert from '@/components/HeaderAlert';
import { calculateProfileCompletion, parseDateLocal } from '@/lib/utils';
import { 
  User, Save, AlertCircle, Edit3, X, ShieldAlert, 
  MapPin, FileText, Camera, Upload, AlertTriangle, Check
} from 'lucide-react';
import { Archivo } from 'next/font/google';
import { StatusBadge } from '@/components/ui/status-badge';
import { LoadingScreen } from '@/components/ui/loading-screen';

const archivoFont = Archivo({
  subsets: ['latin'],
  weight: ['800', '900'],
});

interface FormState {
  name: string;
  genero: string;
  fechaNacimiento: string;
  tipoDocumento: string;
  dni: string;
  phone: string;
  shirtSize: string;
  pais: string;
  provincia: string;
  ciudad: string;
  codigoPostal: string;
  domicilio: string;
  emergencyName: string;
  emergencyPhone: string;
}

type FormAction =
  | { type: 'SET_FIELD'; field: keyof FormState; value: string }
  | { type: 'LOAD_USER'; payload: Partial<FormState> };

const initialFormState: FormState = {
  name: '', genero: '', fechaNacimiento: '', tipoDocumento: 'DNI',
  dni: '', phone: '', shirtSize: '',
  pais: '', provincia: '', ciudad: '', codigoPostal: '', domicilio: '',
  emergencyName: '', emergencyPhone: '',
};

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'LOAD_USER':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

const formatDbToInputDate = (dbDate?: string): string => {
  if (!dbDate) return '';
  if (dbDate.includes('/')) return dbDate;
  const parts = dbDate.split('-');
  if (parts.length === 3) {
    const [yyyy, mm, dd] = parts;
    return `${dd.padStart(2, '0')}/${mm.padStart(2, '0')}/${yyyy}`;
  }
  return dbDate;
};

const formatInputToDbDate = (inputDate: string): string => {
  if (!inputDate) return '';
  const parts = inputDate.split('/');
  if (parts.length === 3) {
    const [dd, mm, yyyy] = parts;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  return inputDate;
};

export default function PerfilPage() {
  const { user, isLoading: authLoading, setUser } = useAuthGuard(false);
  const { uploadFile, uploading } = useFileUpload();
  const [dataLoading, setDataLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showOnboardingPopup, setShowOnboardingPopup] = useState(false);
  const [popupDismissed, setPopupDismissed] = useState(false);
  const [form, dispatch] = useReducer(formReducer, initialFormState);

  const DRAFT_KEY = 'rv_onboarding_draft';

  // Persiste cada campo en localStorage durante el onboarding
  const setField = (field: keyof FormState, value: string) => {
    dispatch({ type: 'SET_FIELD', field, value });
    // Guardar draft solo si el onboarding no está completo
    if (user && !user.onboarding_complete) {
      try {
        const current = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...current, [field]: value }));
      } catch { /* ignorar errores de localStorage */ }
    }
  };

  const handleFechaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // Remover todo lo que no sea número
    if (value.length > 8) {
      value = value.slice(0, 8);
    }
    
    let formatted = value;
    if (value.length > 4) {
      formatted = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
    } else if (value.length > 2) {
      formatted = `${value.slice(0, 2)}/${value.slice(2)}`;
    }
    
    setField('fechaNacimiento', formatted);
  };

  // Messages and Upload Statuses
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [docMessage, setDocMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const getAvatarSrc = (avatarUrl?: string) => {
    if (!avatarUrl) return null;
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://') || avatarUrl.startsWith('data:')) {
      return avatarUrl;
    }
    return `/api/storage/avatars?filename=${avatarUrl}`;
  };

  const loadUser = (force = false) => {
    if (!user) return;

    // Durante el onboarding, intentar restaurar draft de localStorage primero
    if (!user.onboarding_complete) {
      try {
        const draft = localStorage.getItem(DRAFT_KEY);
        if (draft && !force) {
          // Hay un draft guardado — restaurarlo sin pisar lo que el usuario escribió
          const parsed = JSON.parse(draft) as Partial<FormState>;
          dispatch({ type: 'LOAD_USER', payload: {
            name: parsed.name ?? user.name ?? '',
            genero: parsed.genero ?? user.genero ?? '',
            fechaNacimiento: parsed.fechaNacimiento ?? (user.fecha_nacimiento ? formatDbToInputDate(user.fecha_nacimiento) : ''),
            tipoDocumento: parsed.tipoDocumento ?? user.tipo_documento ?? 'DNI',
            dni: parsed.dni ?? user.dni ?? '',
            phone: parsed.phone ?? user.phone ?? '',
            shirtSize: parsed.shirtSize ?? user.talle_remera ?? '',
            pais: parsed.pais ?? user.pais ?? '',
            provincia: parsed.provincia ?? user.provincia ?? '',
            ciudad: parsed.ciudad ?? user.ciudad ?? '',
            codigoPostal: parsed.codigoPostal ?? user.codigo_postal ?? '',
            domicilio: parsed.domicilio ?? user.domicilio ?? '',
            emergencyName: parsed.emergencyName ?? user.contacto_emergencia_name ?? '',
            emergencyPhone: parsed.emergencyPhone ?? user.contacto_emergencia_phone ?? '',
          }});
          setIsEditing(true);
          if (!popupDismissed) {
            setShowOnboardingPopup(true);
          }
          setDataLoading(false);
          return;
        }
      } catch { /* ignorar */ }
    }

    // Sin draft o forzado: cargar desde la DB
    dispatch({ type: 'LOAD_USER', payload: {
      name: user.name || '',
      genero: user.genero || '',
      fechaNacimiento: user.fecha_nacimiento ? formatDbToInputDate(user.fecha_nacimiento) : '',
      tipoDocumento: user.tipo_documento || 'DNI',
      dni: user.dni || '',
      phone: user.phone || '',
      shirtSize: user.talle_remera || '',
      pais: user.pais || '',
      provincia: user.provincia || '',
      ciudad: user.ciudad || '',
      codigoPostal: user.codigo_postal || '',
      domicilio: user.domicilio || '',
      emergencyName: user.contacto_emergencia_name || '',
      emergencyPhone: user.contacto_emergencia_phone || '',
    }});

    if (!user.onboarding_complete) {
      setIsEditing(true);
      if (!popupDismissed) {
        setShowOnboardingPopup(true);
      }
    }
    setDataLoading(false);
  };

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadUser();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSaveAsync = async (): Promise<boolean> => {
    if (!user) return false;
    
    if (
      !form.name.trim() || !form.dni.trim() || !form.phone.trim() || 
      !form.emergencyName.trim() || !form.emergencyPhone.trim() || !form.shirtSize ||
      !form.genero || !form.fechaNacimiento || !form.tipoDocumento ||
      !form.pais.trim() || !form.provincia.trim() || !form.ciudad.trim() || !form.codigoPostal.trim() || !form.domicilio.trim()
    ) {
      setMessage({ type: 'error', text: 'Por favor completa todos los campos de datos personales, residencia y emergencia.' });
      return false;
    }

    // Validar formato de fecha de nacimiento (DD/MM/AAAA)
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(form.fechaNacimiento)) {
      setMessage({ type: 'error', text: 'Por favor ingresa una fecha de nacimiento válida en formato DD/MM/AAAA.' });
      return false;
    }

    const parts = form.fechaNacimiento.split('/');
    const dd = parseInt(parts[0], 10);
    const mm = parseInt(parts[1], 10);
    const yyyy = parseInt(parts[2], 10);
    const date = new Date(yyyy, mm - 1, dd);
    const today = new Date();
    if (
      date.getFullYear() !== yyyy ||
      date.getMonth() !== mm - 1 ||
      date.getDate() !== dd ||
      yyyy < 1900 ||
      yyyy > today.getFullYear()
    ) {
      setMessage({ type: 'error', text: 'La fecha de nacimiento no es una fecha válida.' });
      return false;
    }
    
    setIsSaving(true);
    try {
      const profileUpdates = {
        name: form.name.trim(),
        genero: form.genero,
        fecha_nacimiento: formatInputToDbDate(form.fechaNacimiento),
        tipo_documento: form.tipoDocumento,
        dni: form.dni.trim(),
        phone: form.phone.trim(),
        talle_remera: form.shirtSize,
        pais: form.pais.trim(),
        provincia: form.provincia.trim(),
        ciudad: form.ciudad.trim(),
        codigo_postal: form.codigoPostal.trim(),
        domicilio: form.domicilio.trim(),
        contacto_emergencia_name: form.emergencyName.trim(),
        contacto_emergencia_phone: form.emergencyPhone.trim()
      };

      if (!user.onboarding_complete) {
        await completeOnboardingAsync(user.email, profileUpdates);
        // Limpiar draft de localStorage al completar el onboarding
        try { localStorage.removeItem('rv_onboarding_draft'); } catch { /* ignorar */ }
      } else {
        await updateProfileAsync(user.email, profileUpdates);
      }

      const freshUser = await getCurrentUserAction();
      if (freshUser) setUser(freshUser);
      setMessage({ type: 'success', text: 'Perfil actualizado correctamente.' });
      return true;
    } catch {
      setMessage({ type: 'error', text: 'Error al actualizar el perfil.' });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await handleSaveAsync();
    if (success) {
      setIsEditing(false);
    }
  };

  const handleListoParaSalir = async () => {
    const success = await handleSaveAsync();
    if (success) {
      setIsEditing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'documento' | 'apto' | 'avatar') => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
      if (isMock) {
        if (type === 'avatar') {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64data = reader.result as string;
            await updateProfileAsync(user.email, { avatar_url: base64data });
            const freshUser = await getCurrentUserAction();
            if (freshUser) setUser(freshUser);
            setDocMessage({ type: 'success', text: 'Foto de perfil actualizada (Demo).' });
          };
          reader.readAsDataURL(file);
        } else {
          const updates = type === 'documento'
            ? { documento_url: file.name, documento_status: 'pendiente_verificacion' as const }
            : { apto_medico_url: file.name, apto_medico_status: 'pendiente_verificacion' as const };
          await updateProfileAsync(user.email, updates);
          const freshUser = await getCurrentUserAction();
          if (freshUser) setUser(freshUser);
          setDocMessage({ type: 'success', text: `${type === 'documento' ? 'Documento' : 'Apto médico'} subido correctamente (Demo).` });
        }
        return;
      }

      const bucketName = type === 'documento' || type === 'avatar' ? 'receipts' : 'medical-certs';
      const { fileName, error: uploadErr } = await uploadFile(file, bucketName, user.email, type);
      if (!fileName) {
        setDocMessage({ type: 'error', text: uploadErr || 'Error al subir el archivo.' });
        return;
      }

      const updates: Partial<Athlete> = type === 'documento'
        ? { documento_url: fileName, documento_status: 'pendiente_verificacion' }
        : type === 'avatar'
        ? { avatar_url: fileName }
        : { apto_medico_url: fileName, apto_medico_status: 'pendiente_verificacion', apto_medico_motivo_rechazo: undefined };

      await updateProfileAsync(user.email, updates);
      const freshUser = await getCurrentUserAction();
      if (freshUser) setUser(freshUser);
      
      setDocMessage({ 
        type: 'success', 
        text: type === 'documento' 
          ? 'Documento subido correctamente.' 
          : type === 'avatar'
          ? 'Foto de perfil actualizada correctamente.'
          : 'Apto médico subido correctamente.' 
      });
    } catch (err) {
      console.error('Error uploading file:', err);
      setDocMessage({ type: 'error', text: 'Error al subir el archivo. Intenta nuevamente.' });
    }
  };

  if (authLoading || dataLoading) {
    return <LoadingScreen />;
  }

  if (!user) return null;

  const datosPersonalesCargados = !!(
    user.name?.trim() &&
    user.dni?.trim() &&
    user.phone?.trim() &&
    user.contacto_emergencia_name?.trim() &&
    user.contacto_emergencia_phone?.trim() &&
    user.talle_remera &&
    user.genero &&
    user.fecha_nacimiento &&
    user.pais?.trim() &&
    user.provincia?.trim() &&
    user.ciudad?.trim() &&
    user.codigo_postal?.trim() &&
    user.domicilio?.trim()
  );

  const docPendiente = !(
    user.documento_url &&
    user.documento_status !== 'no_entregado' &&
    user.documento_status !== 'rechazado' &&
    user.apto_medico_url &&
    user.apto_medico_status !== 'no_entregado' &&
    user.apto_medico_status !== 'rechazado'
  );

  const mostrarDocPrimero = datosPersonalesCargados && docPendiente;

  const formComplete = !!(
    form.name.trim() &&
    form.dni.trim() &&
    form.phone.trim() &&
    form.emergencyName.trim() &&
    form.emergencyPhone.trim() &&
    form.shirtSize &&
    form.genero &&
    form.fechaNacimiento &&
    form.pais.trim() &&
    form.provincia.trim() &&
    form.ciudad.trim() &&
    form.codigoPostal.trim() &&
    form.domicilio.trim()
  );

  const docsUploaded = !docPendiente;

  const listoParaSalir = formComplete && docsUploaded;

  const sectionDatosPersonales = (
    <div className="bg-white border border-slate-200 rounded-[32px] p-6 sm:p-8 shadow-sm text-left space-y-5">
      <h3 className={`${archivoFont.className} text-lg font-black text-slate-900 uppercase tracking-tight pb-3 border-b border-slate-100 flex items-center gap-2`}>
        <User className="w-5 h-5 text-[#990000]" />
        Datos Personales
      </h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6">
        <div className="space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Tipo Documento</span>
          <p className="text-sm font-bold text-slate-800">{user.tipo_documento || 'DNI'}</p>
        </div>
        
        <div className="space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">N° de Documento</span>
          <p className="text-sm font-bold text-slate-800">{user.dni || 'No especificado'}</p>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Género</span>
          <p className="text-sm font-bold text-slate-800">{user.genero || 'No especificado'}</p>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Fecha de Nacimiento</span>
          <p className="text-sm font-bold text-slate-800">
            {user.fecha_nacimiento ? parseDateLocal(user.fecha_nacimiento).toLocaleDateString("es-AR") : 'No especificada'}
          </p>
        </div>
        
        <div className="space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Teléfono Personal</span>
          <p className="text-sm font-bold text-slate-800">{user.phone || 'No especificado'}</p>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Talle de Remera</span>
          <p className="text-sm font-bold text-slate-800">{user.talle_remera || 'No especificado'}</p>
        </div>
      </div>
    </div>
  );

  const sectionResidencia = (
    <div className="bg-white border border-slate-200 rounded-[32px] p-6 sm:p-8 shadow-sm text-left space-y-5">
      <h3 className={`${archivoFont.className} text-lg font-black text-slate-900 uppercase tracking-tight pb-3 border-b border-slate-100 flex items-center gap-2`}>
        <MapPin className="w-5 h-5 text-emerald-600" />
        Datos de Residencia
      </h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6">
        <div className="space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">País</span>
          <p className="text-sm font-bold text-slate-800">{user.pais || 'No especificado'}</p>
        </div>
        
        <div className="space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Provincia</span>
          <p className="text-sm font-bold text-slate-800">{user.provincia || 'No especificado'}</p>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Ciudad</span>
          <p className="text-sm font-bold text-slate-800">{user.ciudad || 'No especificado'}</p>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Código Postal</span>
          <p className="text-sm font-bold text-slate-800">{user.codigo_postal || 'No especificado'}</p>
        </div>

        <div className="space-y-1 sm:col-span-2">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Domicilio</span>
          <p className="text-sm font-bold text-slate-800">{user.domicilio || 'No especificado'}</p>
        </div>
      </div>
    </div>
  );

  const sectionEmergencia = (
    <div className="bg-white border border-slate-200 rounded-[32px] p-6 sm:p-8 shadow-sm text-left space-y-5">
      <h3 className={`${archivoFont.className} text-lg font-black text-slate-900 uppercase tracking-tight pb-3 border-b border-slate-100 flex items-center gap-2`}>
        <AlertCircle className="w-5 h-5 text-amber-600" />
        Contacto de Emergencia
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Nombre de Contacto</span>
          <p className="text-sm font-bold text-slate-800">{user.contacto_emergencia_name || 'No especificado'}</p>
        </div>
        
        <div className="space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Teléfono de Emergencia</span>
          <p className="text-sm font-bold text-slate-800">{user.contacto_emergencia_phone || 'No especificado'}</p>
        </div>
      </div>
    </div>
  );

  const sectionDocumentacion = (
    <div className="bg-white border border-slate-200 rounded-[32px] p-6 sm:p-8 shadow-sm text-left space-y-5">
      <h3 className={`${archivoFont.className} text-lg font-black text-slate-900 uppercase tracking-tight pb-3 border-b border-slate-100 flex items-center gap-2`}>
        <FileText className="w-5 h-5 text-rose-500" />
        Documentación Requerida
      </h3>
      
      <div className="space-y-4">
        {/* DNI Document Scan Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-100 p-4 rounded-2xl">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Foto DNI / Documento</span>
            <StatusBadge status={user.documento_status} variant="document" className="px-3 py-1 text-[11px]" />
          </div>
          {user.documento_url && (
            <a href={`/api/storage/receipts?filename=${user.documento_url}`} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-[#990000] hover:underline">
              Ver Documento
            </a>
          )}
        </div>

        {/* Medical Apto Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-100 p-4 rounded-2xl">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Apto Médico</span>
            <StatusBadge status={user.apto_medico_status} variant="document" className="px-3 py-1 text-[11px]" />
          </div>
          {user.apto_medico_url && (
            <a href={`/api/storage/medical-certs?filename=${user.apto_medico_url}`} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-[#990000] hover:underline">
              Ver Apto Médico
            </a>
          )}
        </div>

        {user.apto_medico_status === 'rechazado' && user.apto_medico_motivo_rechazo && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-800 flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Motivo de rechazo de Apto Médico:</strong>
              <p className="text-red-700 mt-0.5">{user.apto_medico_motivo_rechazo}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 bg-[radial-gradient(120%_60%_at_50%_0%,rgba(74,222,128,0.08)_0%,rgba(30,78,109,0.05)_40%,rgba(255,255,255,0)_100%)] text-slate-900 font-sans antialiased pb-8">
      <HeaderAlert user={user} />
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* HEADER & EDIT BUTTON */}
        <div className="relative mb-8 flex flex-row justify-between items-center border-b border-slate-200/60 pb-6">
          <div className="space-y-2">
            <h1 className={`${archivoFont.className} text-4xl sm:text-5xl font-black tracking-tight text-slate-900 leading-none uppercase`}>
              Mi Perfil
            </h1>
          </div>
          
          <div>
            {!isEditing ? (
              <button
                onClick={() => {
                  setIsEditing(true);
                  setMessage(null);
                  setDocMessage(null);
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-bold shadow-md shadow-blue-600/10 hover:shadow-blue-600/20 transition-all duration-150 flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Editar perfil
              </button>
            ) : (
              (user.onboarding_complete || listoParaSalir) && (
                <button
                  onClick={listoParaSalir ? handleListoParaSalir : () => {
                    setIsEditing(false);
                    setMessage(null);
                    setDocMessage(null);
                    loadUser(); // Restore state
                  }}
                  className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-150 flex items-center gap-1.5 cursor-pointer shadow-sm ${
                    listoParaSalir 
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 hover:border-emerald-700 shadow-emerald-600/15 hover:shadow-emerald-600/25' 
                      : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {listoParaSalir ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      Listo para salir
                    </>
                  ) : (
                    <>
                      <X className="w-3.5 h-3.5" />
                      Cancelar
                    </>
                  )}
                </button>
              )
            )}
          </div>
        </div>

        {/* USER INFO CARD */}
        <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm mb-6 flex flex-col sm:flex-row items-center gap-6 p-6 sm:p-8 text-left relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-red-50 to-transparent rounded-bl-full pointer-events-none" />
          <div className="relative group flex-shrink-0">
            {getAvatarSrc(user.avatar_url) ? (
              <Image 
                src={getAvatarSrc(user.avatar_url)!} 
                alt={user.name} 
                width={80}
                height={80}
                className="rounded-2xl object-cover shadow-md"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#990000] to-red-500 flex items-center justify-center text-white font-black text-3xl shadow-md">
                {user.name ? user.name[0].toUpperCase() : 'U'}
              </div>
            )}
            
            {isEditing && (
              <label 
                htmlFor="avatar-upload" 
                className="absolute inset-0 bg-black/55 hover:bg-black/70 rounded-2xl flex flex-col items-center justify-center text-white text-[10px] font-extrabold uppercase cursor-pointer transition-all duration-150 border border-white/20 text-center px-1"
              >
                <Camera className="w-5 h-5 mb-0.5" />
                {uploading ? 'Subiendo...' : 'Cambiar'}
              </label>
            )}
            <input 
              type="file" 
              accept="image/*" 
              id="avatar-upload" 
              className="hidden" 
              disabled={uploading}
              onChange={(e) => handleFileUpload(e, 'avatar')} 
            />
          </div>
          <div className="space-y-1.5 z-10">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className={`${archivoFont.className} text-2xl font-black text-slate-900 leading-tight uppercase`}>
                {user.name}
              </h2>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                user.role === 'admin' 
                  ? 'bg-amber-50 border-amber-200 text-amber-700' 
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}>
                {user.role === 'admin' ? 'Coordinador' : 'Atleta'}
              </span>
            </div>
            <p className="text-sm text-slate-500 font-medium">{user.email}</p>

            {/* Completado del perfil con barra de progreso */}
            {(() => {
              const completion = calculateProfileCompletion(user);
              return (
                <div className="mt-2.5 w-full min-w-[200px] sm:min-w-[240px]">
                  <div className="flex justify-between items-center mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Completado del Perfil</span>
                    <span className="text-[#990000] font-black">{completion}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50">
                    <div 
                      className="bg-gradient-to-r from-red-500 to-emerald-500 h-full rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${completion}%` }}
                    />
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* PROFILE SECTIONS CONTAINER */}
        <div className="space-y-6">
          {!isEditing ? (
            /* ================= VIEW MODE ================= */
            mostrarDocPrimero ? (
              <>
                {sectionDocumentacion}
                {sectionDatosPersonales}
                {sectionResidencia}
                {sectionEmergencia}
              </>
            ) : (
              <>
                {sectionDatosPersonales}
                {sectionResidencia}
                {sectionEmergencia}
                {sectionDocumentacion}
              </>
            )
          ) : (
            /* ================= EDIT MODE ================= */
            <div className="space-y-6">
              {/* EDIT FORM FIELDS */}
              <div className="bg-white border border-slate-200 rounded-[32px] p-6 sm:p-10 shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  {/* DATOS PERSONALES */}
                  <div className="space-y-5">
                    <h3 className={`${archivoFont.className} text-lg font-black text-slate-900 uppercase tracking-tight pb-3 border-b border-slate-100 flex items-center gap-2 text-left`}>
                      <User className="w-5 h-5 text-[#990000]" />
                      Datos Personales
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {/* Nombre completo */}
                      <div className="space-y-1.5 text-left sm:col-span-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Nombre Completo</label>
                        <input
                          type="text"
                          value={form.name}
                          onChange={(e) => setField('name', e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:border-[#1e4e6d] focus:ring-2 focus:ring-[#1e4e6d]/10 outline-none transition-all duration-150"
                        />
                      </div>

                      {/* Tipo Documento */}
                      <div className="space-y-1.5 text-left">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Tipo de Documento</label>
                        <select
                          value={form.tipoDocumento}
                          onChange={(e) => setField('tipoDocumento', e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:border-[#1e4e6d] focus:ring-2 focus:ring-[#1e4e6d]/10 outline-none transition-all duration-150 cursor-pointer"
                        >
                          <option value="DNI">DNI</option>
                          <option value="Pasaporte">Pasaporte</option>
                          <option value="LC">L.C.</option>
                          <option value="LE">L.E.</option>
                        </select>
                      </div>

                      {/* N° de Documento (DNI) */}
                      <div className="space-y-1.5 text-left">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">N° de Documento</label>
                        <input
                          type="text"
                          placeholder="Ej: 32456789"
                          value={form.dni}
                          onChange={(e) => setField('dni', e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:border-[#1e4e6d] focus:ring-2 focus:ring-[#1e4e6d]/10 outline-none transition-all duration-150"
                        />
                      </div>

                      {/* Género */}
                      <div className="space-y-1.5 text-left">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Género</label>
                        <select
                          value={form.genero}
                          onChange={(e) => setField('genero', e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:border-[#1e4e6d] focus:ring-2 focus:ring-[#1e4e6d]/10 outline-none transition-all duration-150 cursor-pointer"
                        >
                          <option value="">Selecciona género</option>
                          <option value="Masculino">Masculino</option>
                          <option value="Femenino">Femenino</option>
                          <option value="No Binario">No Binario</option>
                          <option value="Otro">Otro</option>
                        </select>
                      </div>

                      {/* Fecha de Nacimiento */}
                      <div className="space-y-1.5 text-left">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Fecha de Nacimiento</label>
                        <input
                          type="text"
                          placeholder="DD/MM/AAAA"
                          value={form.fechaNacimiento}
                          onChange={handleFechaChange}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:border-[#1e4e6d] focus:ring-2 focus:ring-[#1e4e6d]/10 outline-none transition-all duration-150"
                        />
                      </div>

                      {/* Teléfono */}
                      <div className="space-y-1.5 text-left">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Telefono Personal</label>
                        <input
                          type="tel"
                          placeholder="Ej: +54 9 11 2345-6789"
                          value={form.phone}
                          onChange={(e) => setField('phone', e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:border-[#1e4e6d] focus:ring-2 focus:ring-[#1e4e6d]/10 outline-none transition-all duration-150"
                        />
                      </div>

                      {/* Talle Remera */}
                      <div className="space-y-1.5 text-left">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Talle de Remera</label>
                        <select
                          value={form.shirtSize}
                          onChange={(e) => setField('shirtSize', e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:border-[#1e4e6d] focus:ring-2 focus:ring-[#1e4e6d]/10 outline-none transition-all duration-150 cursor-pointer"
                        >
                          <option value="">Selecciona un talle</option>
                          <option value="XS">XS</option>
                          <option value="S">S</option>
                          <option value="M">M</option>
                          <option value="L">L</option>
                          <option value="XL">XL</option>
                          <option value="XXL">XXL</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* DATOS DE RESIDENCIA */}
                  <div className="space-y-5 pt-4">
                    <h3 className={`${archivoFont.className} text-lg font-black text-slate-900 uppercase tracking-tight pb-3 border-b border-slate-100 flex items-center gap-2 text-left`}>
                      <MapPin className="w-5 h-5 text-emerald-600" />
                      Datos de Residencia
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-1.5 text-left">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">País</label>
                        <input
                          type="text"
                          value={form.pais}
                          onChange={(e) => setField('pais', e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:border-[#1e4e6d] focus:ring-2 focus:ring-[#1e4e6d]/10 outline-none transition-all duration-150"
                        />
                      </div>

                      <div className="space-y-1.5 text-left">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Provincia</label>
                        <input
                          type="text"
                          value={form.provincia}
                          onChange={(e) => setField('provincia', e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:border-[#1e4e6d] focus:ring-2 focus:ring-[#1e4e6d]/10 outline-none transition-all duration-150"
                        />
                      </div>

                      <div className="space-y-1.5 text-left">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Ciudad</label>
                        <input
                          type="text"
                          value={form.ciudad}
                          onChange={(e) => setField('ciudad', e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:border-[#1e4e6d] focus:ring-2 focus:ring-[#1e4e6d]/10 outline-none transition-all duration-150"
                        />
                      </div>

                      <div className="space-y-1.5 text-left">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Código Postal</label>
                        <input
                          type="text"
                          value={form.codigoPostal}
                          onChange={(e) => setField('codigoPostal', e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:border-[#1e4e6d] focus:ring-2 focus:ring-[#1e4e6d]/10 outline-none transition-all duration-150"
                        />
                      </div>

                      <div className="space-y-1.5 text-left sm:col-span-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Domicilio</label>
                        <input
                          type="text"
                          value={form.domicilio}
                          onChange={(e) => setField('domicilio', e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:border-[#1e4e6d] focus:ring-2 focus:ring-[#1e4e6d]/10 outline-none transition-all duration-150"
                        />
                      </div>
                    </div>
                  </div>

                  {/* CONTACTO DE EMERGENCIA */}
                  <div className="space-y-5 pt-4">
                    <h3 className={`${archivoFont.className} text-lg font-black text-slate-900 uppercase tracking-tight pb-3 border-b border-slate-100 flex items-center gap-2 text-left`}>
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                      Contacto de Emergencia
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5 text-left">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Nombre de Contacto</label>
                        <input
                          type="text"
                          placeholder="Nombre completo"
                          value={form.emergencyName}
                          onChange={(e) => setField('emergencyName', e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:border-[#1e4e6d] focus:ring-2 focus:ring-[#1e4e6d]/10 outline-none transition-all duration-150"
                        />
                      </div>
                      <div className="space-y-1.5 text-left">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Teléfono de Emergencia</label>
                        <input
                          type="tel"
                          placeholder="Ej: +54 9 11 1234-5678"
                          value={form.emergencyPhone}
                          onChange={(e) => setField('emergencyPhone', e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:border-[#1e4e6d] focus:ring-2 focus:ring-[#1e4e6d]/10 outline-none transition-all duration-150"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Message Alert */}
                  {message && (
                    <div className={`p-4 rounded-xl text-sm font-medium ${
                      message.type === 'success' 
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' 
                        : 'bg-red-50 border border-red-200 text-red-700'
                    }`}>
                      {message.text}
                    </div>
                  )}

                  {/* Save Button */}
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="w-full py-4 bg-[#990000] hover:bg-[#660000] text-white font-bold text-sm rounded-full shadow-lg shadow-[#990000]/10 hover:shadow-[#990000]/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" />
                      {isSaving ? 'Guardando...' : 'Guardar Datos del Perfil'}
                    </button>
                  </div>
                </form>
              </div>

              {/* UPLOAD DOCUMENTATION BLOCK (ONLY IN EDIT MODE) */}
              <div className="bg-white border border-slate-200 rounded-[32px] p-6 sm:p-10 shadow-sm text-center space-y-6">
                <h3 className={`${archivoFont.className} text-lg font-black text-slate-900 uppercase tracking-tight pb-3 border-b border-slate-100 flex items-center justify-center gap-2`}>
                  <FileText className="w-5 h-5 text-rose-500" />
                  Actualizar Documentación
                </h3>

                {/* Doc Message Alert */}
                {docMessage && (
                  <div className={`p-4 rounded-xl text-sm font-medium max-w-md mx-auto ${
                    docMessage.type === 'success' 
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' 
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}>
                    {docMessage.text}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Photo DNI Upload */}
                  <div className="space-y-4 p-6 bg-slate-50/60 border border-slate-200/80 rounded-2xl flex flex-col justify-between items-center text-center">
                    <div className="flex flex-col items-center space-y-2">
                      <h4 className="text-sm font-black uppercase tracking-wider text-slate-700 bg-slate-100 px-3.5 py-1.5 rounded-full border border-slate-200/50">
                        Foto de DNI / Documento
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed max-w-[220px]">
                        Sube una imagen o PDF claro del frente de tu documento.
                      </p>
                      <div className="flex flex-col items-center gap-1 pt-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Estado actual</span>
                        <StatusBadge status={user.documento_status} variant="document" className="px-3 py-1 text-[11px]" />
                      </div>
                    </div>
                    
                    <div className="space-y-2 w-full max-w-[220px] pt-2">
                      <label className="w-full py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-[#990000] hover:text-[#660000] rounded-xl text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm">
                        <Upload className="w-3.5 h-3.5" />
                        {uploading ? 'Subiendo...' : 'Seleccionar Archivo'}
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => handleFileUpload(e, 'documento')}
                          disabled={uploading}
                          className="hidden"
                        />
                      </label>
                      <label className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm">
                        <Camera className="w-3.5 h-3.5" />
                        {uploading ? 'Tomando...' : 'Tomar Foto'}
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => handleFileUpload(e, 'documento')}
                          disabled={uploading}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Apto Medico Upload */}
                  <div className="space-y-4 p-6 bg-slate-50/60 border border-slate-200/80 rounded-2xl flex flex-col justify-between items-center text-center">
                    <div className="flex flex-col items-center space-y-2">
                      <h4 className="text-sm font-black uppercase tracking-wider text-slate-700 bg-slate-100 px-3.5 py-1.5 rounded-full border border-slate-200/50">
                        Certificado de Apto Médico
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed max-w-[220px]">
                        Sube tu certificado médico firmado y vigente.
                      </p>
                      <div className="flex flex-col items-center gap-1 pt-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Estado actual</span>
                        <StatusBadge status={user.apto_medico_status} variant="document" className="px-3 py-1 text-[11px]" />
                      </div>
                    </div>
                    
                    <div className="space-y-2 w-full max-w-[220px] pt-2">
                      <label className="w-full py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-[#990000] hover:text-[#660000] rounded-xl text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm">
                        <Upload className="w-3.5 h-3.5" />
                        {uploading ? 'Subiendo...' : 'Seleccionar Archivo'}
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => handleFileUpload(e, 'apto')}
                          disabled={uploading}
                          className="hidden"
                        />
                      </label>
                      <label className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm">
                        <Camera className="w-3.5 h-3.5" />
                        {uploading ? 'Tomando...' : 'Tomar Foto'}
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => handleFileUpload(e, 'apto')}
                          disabled={uploading}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ONBOARDING WARNING POPUP */}
      {showOnboardingPopup && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#e2edf6] text-slate-800 rounded-[32px] overflow-hidden shadow-2xl max-w-md w-full border border-white/45 p-8 flex flex-col items-center text-center space-y-6 animate-modal-zoom-in">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500 shadow-sm">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className={`${archivoFont.className} text-2xl font-black uppercase tracking-tight text-slate-900`}>
                Onboarding pendiente
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed font-medium">
                Por favor completa tu perfil para poder continuar. Deberás ingresar tus datos personales, de residencia y de contacto de emergencia.
              </p>
            </div>
            <button
              onClick={() => {
                setShowOnboardingPopup(false);
                setPopupDismissed(true);
              }}
              className="w-full py-3 bg-[#990000] hover:bg-[#660000] text-white font-bold text-sm rounded-full transition-all cursor-pointer shadow-md"
            >
              Completar Perfil
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
