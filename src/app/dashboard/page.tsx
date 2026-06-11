'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  getTeamAsync,
  leaveTeamAsync,
  updateAthleteProfileAsync,
  Team,
  Athlete,
  getTeamMembers,
} from '@/lib/db';
import { parseTrainingDays, parseInstructions } from '@/lib/db-types';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import Navbar from '@/components/Navbar';
import HeaderAlert from '@/components/HeaderAlert';
import {
  Users,
  FileText,
  DollarSign,
  Heart,
  AlertTriangle,
  Upload,
  ExternalLink,
  MapPin,
  Clock,
  Dumbbell,
  Calendar,
  MessageCircle,
  Cake,
  ChevronRight,
  Shield,
  CreditCard,
  Stethoscope,
  Navigation,
  Zap,
  Sun,
} from 'lucide-react';
import { Archivo } from 'next/font/google';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { StatusBadge } from '@/components/ui/status-badge';
import { SectionCard } from '@/components/ui/section-card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { parseDateLocal } from '@/lib/utils';

const archivoFont = Archivo({
  subsets: ['latin'],
  weight: ['800', '900'],
});

export default function AthleteDashboard() {
  const router = useRouter();
  const { user, isLoading: authLoading, authError } = useAuthGuard();
  const [team, setTeam] = useState<Team | null>(null);
  const parsedShifts = team ? parseTrainingDays(team.training_days) : null;
  const parsedInstructions = team ? parseInstructions(team.instructions) : null;
  const [activeDashboardTab, setActiveDashboardTab] = useState<'inicio' | 'entrenamientos' | 'club'>('inicio');
  const [activeShiftId, setActiveShiftId] = useState<string>('');
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (parsedShifts && parsedShifts.length > 0 && !activeShiftId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveShiftId(parsedShifts[0].id);
    }
  }, [parsedShifts, activeShiftId]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [certError, setCertError] = useState('');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [uploadingCert, setUploadingCert] = useState(false);
  const [teamMembers, setTeamMembers] = useState<Athlete[]>([]);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaveFeedback, setLeaveFeedback] = useState('');

  const loadData = async () => {
    if (!user) return;
    if (!user.team_id) {
      router.push('/equipos');
      return;
    }
    const members = await getTeamMembers(user.team_id);
    setTeamMembers(members);
    const teamData = await getTeamAsync(user.team_id);
    setTeam(teamData);
    setDataLoading(false);
  };

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleLeaveTeam = async () => {
    if (!user) return;
    await leaveTeamAsync(user.email);
    if (leaveFeedback.trim()) {
      alert('¡Muchas gracias por tu feedback! Nos ayuda a mejorar.');
    }
    loadData();
  };

  const handleUploadReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !receiptFile) {
      setUploadError('Selecciona un archivo de comprobante.');
      return;
    }
    setUploadingReceipt(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('file', receiptFile);
      formData.append('bucket', 'receipts');

      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Upload failed');

      await updateAthleteProfileAsync(user.email, {
        payment_status: 'Pendiente_Verificacion',
        payment_receipt_url: result.filename,
        payment_motivo_rechazo: undefined,
      });

      setReceiptFile(null);
      loadData();
    } catch (error) {
      console.error('Error uploading receipt:', error);
      setUploadError('Error al subir el comprobante. Intenta nuevamente.');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleUploadCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !certFile) {
      setCertError('Selecciona un archivo de apto medico.');
      return;
    }
    setUploadingCert(true);
    setCertError('');
    try {
      const formData = new FormData();
      formData.append('file', certFile);
      formData.append('bucket', 'medical-certs');

      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Upload failed');

      await updateAthleteProfileAsync(user.email, {
        apto_medico_status: 'pendiente_verificacion',
        apto_medico_url: result.filename,
        apto_medico_motivo_rechazo: undefined,
      });

      setCertFile(null);
      loadData();
    } catch (error) {
      console.error('Error uploading certificate:', error);
      setCertError('Error al subir el certificado. Intenta nuevamente.');
    } finally {
      setUploadingCert(false);
    }
  };

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4 p-8">
          <p className="text-slate-700 font-medium">{authError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-full font-bold text-xs uppercase tracking-wider cursor-pointer"
          >
            Recargar
          </button>
        </div>
      </div>
    );
  }

  if (authLoading || dataLoading) {
    return <LoadingScreen />;
  }

  if (!user) return null;

  const teamAdmin = teamMembers.find(a => a.role === 'admin');
  const coachName = teamAdmin ? teamAdmin.name : (team?.coach || 'Raúl');
  const coachPhone = teamAdmin?.phone?.replace(/[^0-9]/g, '') || '5493804592633';
  const whatsappLink = `https://wa.me/${coachPhone}?text=${encodeURIComponent('Hola ' + coachName + ', te escribo desde la app del equipo...')}`;

  const getEmbedUrl = (url?: string) => {
    if (!url) return null;
    if (url.includes('<iframe')) {
      const match = url.match(/src="([^"]+)"/);
      return match ? match[1] : null;
    }
    if (url.startsWith('http')) {
      return url;
    }
    return null;
  };

  const birthdaysThisWeek = (() => {
    if (!user.team_id) return [];
    const members = teamMembers;
    const today = new Date();

    const currentDay = today.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() + distanceToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return members.filter(member => {
      if (!member.fecha_nacimiento) return false;
      const birthDate = parseDateLocal(member.fecha_nacimiento);
      if (isNaN(birthDate.getTime())) return false;

      const projectThisYear = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
      const projectPrevYear = new Date(today.getFullYear() - 1, birthDate.getMonth(), birthDate.getDate());
      const projectNextYear = new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());

      return (
        (projectThisYear >= startOfWeek && projectThisYear <= endOfWeek) ||
        (projectPrevYear >= startOfWeek && projectPrevYear <= endOfWeek) ||
        (projectNextYear >= startOfWeek && projectNextYear <= endOfWeek)
      );
    }).map(member => {
      const birthDate = parseDateLocal(member.fecha_nacimiento!);
      return {
        ...member,
        birthdayStr: birthDate.toLocaleDateString("es-AR", { day: 'numeric', month: 'long' })
      };
    });
  })();

  return (
    <div className="min-h-screen bg-slate-50 bg-[radial-gradient(120%_60%_at_50%_0%,rgba(74,222,128,0.08)_0%,rgba(153,0,0,0.05)_40%,rgba(255,255,255,0)_100%)] text-slate-900 font-sans antialiased pb-8">
      <HeaderAlert user={user} />
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">

        {!user.team_id ? null : user.team_status === 'pendiente' && team ? (
          /* SOLICITUD PENDIENTE */
          <div className="bg-white border border-slate-200 rounded-[32px] p-8 max-w-2xl mx-auto my-12 shadow-sm space-y-6 relative overflow-hidden text-left">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-50 to-transparent rounded-bl-full pointer-events-none" />
            <div className="flex items-center gap-4 pb-4 border-b border-slate-100 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h1 className={`${archivoFont.className} text-xl font-black text-slate-900 uppercase tracking-tight`}>Solicitud en revisión</h1>
                <p className="text-sm text-slate-500 font-medium">Equipo: {team.name}</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-800 leading-relaxed relative z-10">
              <strong>Postulación enviada:</strong> Tu solicitud de ingreso para el equipo <strong>&quot;{team.name}&quot;</strong> está siendo evaluada por el coordinador. Una vez aprobado, figurarás como miembro activo para registrar pagos y acceder a las planificaciones.
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2 relative z-10">
              <button
                onClick={handleLeaveTeam}
                className="w-full py-3 text-slate-700 border border-slate-200 hover:bg-slate-50 font-bold text-xs rounded-full transition-all duration-150 cursor-pointer uppercase tracking-wider"
              >
                Cancelar solicitud
              </button>
              <button
                onClick={() => router.push('/equipos')}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-full transition-all duration-150 cursor-pointer uppercase tracking-wider"
              >
                Ver Info del Equipo
              </button>
            </div>
          </div>
        ) : team && (
            <div className="space-y-6 text-left">
              {/* HEADER DE BIENVENIDA AL EQUIPO */}
              <div className="bg-white border border-slate-200 rounded-[32px] p-6 sm:p-8 shadow-sm relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                    {team.logo_url && (
                      <div className="w-20 h-20 rounded-2xl bg-slate-950 overflow-hidden flex items-center justify-center p-1.5 border border-slate-200 shadow-sm flex-shrink-0">
                        <Image src={team.logo_url} alt={team.name} width={80} height={80} className="w-full h-full object-contain" />
                      </div>
                    )}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {user.payment_status === 'Pagado' ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border bg-emerald-50 border-emerald-200 text-emerald-700">
                            Al día
                          </span>
                        ) : user.payment_status === 'Vencido' ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border bg-red-50 border-red-200 text-red-700">
                            Pago vencido
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border bg-amber-50 border-amber-200 text-amber-700">
                            Pago pendiente
                          </span>
                        )}
                        {team.location && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border bg-blue-50 border-blue-200 text-blue-700">
                            <MapPin className="w-3.5 h-3.5" />
                            {team.location}
                          </span>
                        )}
                      </div>
                      <h1 className={`${archivoFont.className} text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-none uppercase truncate`}>
                        {team.name}
                      </h1>
                      <p className="text-sm text-slate-500 font-medium">
                        Entrenador: <strong className="text-[#990000]">{team.coach}</strong>
                      </p>
                    </div>
                  </div>
                </div>
                {/* TABS DE NAVEGACIÓN PRINCIPAL */}
                <div className="flex border-b border-slate-200 gap-1 pb-px">
                  <button
                    onClick={() => setActiveDashboardTab('inicio')}
                    className={`flex-1 sm:flex-none px-6 py-3 text-sm font-extrabold uppercase tracking-tight transition-all duration-155 border-b-2 cursor-pointer ${
                      activeDashboardTab === 'inicio'
                        ? 'border-slate-900 text-slate-900 font-black'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Inicio
                  </button>
                  <button
                    onClick={() => setActiveDashboardTab('entrenamientos')}
                    className={`flex-1 sm:flex-none px-6 py-3 text-sm font-extrabold uppercase tracking-tight transition-all duration-155 border-b-2 cursor-pointer ${
                      activeDashboardTab === 'entrenamientos'
                        ? 'border-slate-900 text-slate-900 font-black'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Entrenamientos
                  </button>
                  <button
                    onClick={() => setActiveDashboardTab('club')}
                    className={`flex-1 sm:flex-none px-6 py-3 text-sm font-extrabold uppercase tracking-tight transition-all duration-155 border-b-2 cursor-pointer ${
                      activeDashboardTab === 'club'
                        ? 'border-slate-900 text-slate-900 font-black'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Club
                  </button>
                </div>
              </div>

              {activeDashboardTab === 'inicio' ? (
                <div className="bg-white border border-slate-200 rounded-[32px] p-12 text-center shadow-sm">
                  <p className="text-slate-400 text-sm font-medium">Contenido próximamente.</p>
                </div>
              ) : activeDashboardTab === 'entrenamientos' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                  {/* COLUMNA IZQUIERDA – PLANIFICACIÓN (2/3) */}
                  <div className="lg:col-span-2 space-y-6">

                    {/* ENTRENAMIENTOS DIARIOS */}
                    <SectionCard spaceY="space-y-0" padding="p-0">
                      {/* Header con acento */}
                      <div className="bg-gradient-to-r from-[#990000] to-[#fe0000] px-6 sm:px-8 py-5 rounded-t-[32px]">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Dumbbell className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className={`${archivoFont.className} text-base sm:text-lg font-black text-white uppercase tracking-tight leading-none`}>
                              Planificación Diaria
                            </h3>
                            <p className="text-blue-100 text-[11px] font-semibold mt-0.5">
                              {parsedShifts ? `${parsedShifts.length} turno${parsedShifts.length > 1 ? 's' : ''} disponible${parsedShifts.length > 1 ? 's' : ''}` : 'Sin turnos configurados'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="px-6 sm:px-8 py-6 space-y-5">
                        {parsedShifts ? (
                          <div className="space-y-5">
                            {/* Tabs internas de turnos — estilo pill */}
                            <div className="flex flex-wrap gap-2 p-1 bg-slate-100/80 rounded-2xl">
                              {parsedShifts.map((shift) => (
                                <button
                                  key={shift.id}
                                  onClick={() => setActiveShiftId(shift.id)}
                                  className={`flex-1 min-w-0 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                                    activeShiftId === shift.id
                                      ? 'bg-white text-slate-900 shadow-sm shadow-slate-200/60 ring-1 ring-slate-200/50'
                                      : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                                  }`}
                                >
                                  {shift.name}
                                </button>
                              ))}
                            </div>

                            {/* Aviso general */}
                            {parsedInstructions?.general && (
                              <div className="flex items-start gap-3 bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-100 p-4 rounded-2xl">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <Zap className="w-4 h-4 text-blue-600" />
                                </div>
                                <div className="space-y-1 min-w-0">
                                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 block">
                                    Aviso General
                                  </span>
                                  <p className="text-xs font-medium text-blue-900 whitespace-pre-line leading-relaxed">{parsedInstructions.general}</p>
                                </div>
                              </div>
                            )}

                            {/* Contenido del turno activo */}
                            {parsedShifts
                              .filter((shift) => shift.id === activeShiftId)
                              .map((shift) => {
                                const routine = parsedInstructions?.shifts[shift.id];
                                return (
                                  <div key={shift.id} className="space-y-4 text-left">
                                    {/* Info del turno — badges */}
                                    <div className="flex flex-wrap gap-2.5">
                                      <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-150 rounded-xl px-3.5 py-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                                          <Calendar className="w-3.5 h-3.5 text-blue-600" />
                                        </div>
                                        <div className="text-left">
                                          <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block leading-none">Días</span>
                                          <span className="text-xs font-bold text-slate-800 leading-tight">{shift.days}</span>
                                        </div>
                                      </div>
                                      <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-150 rounded-xl px-3.5 py-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                                          <Clock className="w-3.5 h-3.5 text-emerald-600" />
                                        </div>
                                        <div className="text-left">
                                          <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block leading-none">Horario</span>
                                          <span className="text-xs font-bold text-slate-800 leading-tight">{shift.time}</span>
                                        </div>
                                      </div>
                                      <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-150 rounded-xl px-3.5 py-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center flex-shrink-0">
                                          <MapPin className="w-3.5 h-3.5 text-rose-500" />
                                        </div>
                                        <div className="text-left">
                                          <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block leading-none">Lugar</span>
                                          <span className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[140px] block">{shift.location}</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Rutina / Planificación */}
                                    <div className="border border-slate-150 rounded-2xl overflow-hidden">
                                      <div className="bg-slate-50 px-5 py-3 border-b border-slate-150 flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-slate-400" />
                                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                                          Planificación del Turno
                                        </span>
                                      </div>
                                      <div className="p-5 bg-white">
                                        {routine ? (
                                          <p className="text-sm font-medium text-slate-700 whitespace-pre-line leading-relaxed">
                                            {routine}
                                          </p>
                                        ) : (
                                          <div className="flex items-center gap-3 text-slate-400">
                                            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                                              <FileText className="w-5 h-5 text-slate-300" />
                                            </div>
                                            <p className="text-sm italic">
                                              No se ha cargado una planificación específica para este turno.
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        ) : (
                          <div className="bg-slate-50 border border-slate-150 p-5 rounded-2xl text-slate-700 font-medium leading-relaxed">
                            {team.instructions ? (
                              <p className="text-sm whitespace-pre-line">
                                {team.instructions}
                              </p>
                            ) : (
                              <div className="flex items-center gap-3 text-slate-400">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                                  <Dumbbell className="w-5 h-5 text-slate-300" />
                                </div>
                                <p className="text-sm italic">
                                  El coordinador aún no ha publicado instrucciones de entrenamiento.
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </SectionCard>
                  </div>

                  {/* COLUMNA DERECHA (1/3) */}
                  <div className="space-y-6">
                    {/* FONDO DEL FIN DE SEMANA */}
                    <SectionCard spaceY="space-y-0" padding="p-0">
                      <div className="bg-gradient-to-r from-[#990000] to-[#fe0000] px-6 py-4 rounded-t-[32px]">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Sun className="w-4.5 h-4.5 text-white" />
                          </div>
                          <h3 className={`${archivoFont.className} text-sm font-black text-white uppercase tracking-tight leading-none`}>
                            Fondo del Finde
                          </h3>
                        </div>
                      </div>
                      <div className="px-6 py-5">
                        {team.special_instructions ? (
                          <p className="text-sm text-slate-700 font-medium whitespace-pre-line leading-relaxed">
                            {team.special_instructions}
                          </p>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
                              <Calendar className="w-4 h-4 text-amber-400" />
                            </div>
                            <p className="text-xs text-slate-400 italic leading-relaxed">
                              No hay entrenamientos especiales programados para este fin de semana.
                            </p>
                          </div>
                        )}
                      </div>
                    </SectionCard>

                    {/* UBICACIÓN */}
                    <SectionCard spaceY="space-y-0" padding="p-0">
                      <div className="bg-gradient-to-r from-[#990000] to-[#fe0000] px-6 py-4 rounded-t-[32px]">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Navigation className="w-4.5 h-4.5 text-white" />
                          </div>
                          <h3 className={`${archivoFont.className} text-sm font-black text-white uppercase tracking-tight leading-none`}>
                            Ubicación
                          </h3>
                        </div>
                      </div>
                      <div className="px-6 py-5 space-y-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-3.5 h-3.5 text-red-500" />
                          </div>
                          <p className="text-xs font-bold text-slate-700 truncate">
                            {team.location}
                          </p>
                        </div>

                        {getEmbedUrl(team.google_maps_url) ? (
                          <div className="w-full h-44 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                            <iframe
                              src={getEmbedUrl(team.google_maps_url)!}
                              width="100%"
                              height="100%"
                              style={{ border: 0 }}
                              allowFullScreen
                              loading="lazy"
                              referrerPolicy="no-referrer-when-downgrade"
                            />
                          </div>
                        ) : team.google_maps_url ? (
                          <a
                            href={team.google_maps_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2.5 bg-[#990000] hover:bg-[#fe0000] text-white rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all cursor-pointer uppercase tracking-wider"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Ver en Google Maps
                          </a>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No hay mapa configurado.</p>
                        )}
                      </div>
                    </SectionCard>
                  </div>

                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                  {/* COLUMNA IZQUIERDA (2/3) */}
                  <div className="lg:col-span-2 space-y-6">

                    {/* PLAN DE SUSCRIPCIÓN Y PAGO */}
                    <SectionCard spaceY="space-y-0" padding="p-0">
                      {/* Header con acento */}
                      <div className="bg-gradient-to-r from-[#990000] to-[#fe0000] px-6 sm:px-8 py-5 rounded-t-[32px]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                              <CreditCard className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h3 className={`${archivoFont.className} text-base sm:text-lg font-black text-white uppercase tracking-tight leading-none`}>
                                Suscripción y Pago
                              </h3>
                              <p className="text-blue-100 text-[11px] font-semibold mt-0.5">
                                Cuota mensual del equipo
                              </p>
                            </div>
                          </div>
                          <StatusBadge status={user.payment_status} variant="payment" className="!text-[9px] !px-3 !py-1 !rounded-lg bg-white/15 !border-white/25 !text-white backdrop-blur-sm" />
                        </div>
                      </div>

                      <div className="px-6 sm:px-8 py-6 space-y-5">
                        {/* Datos bancarios + Monto */}
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4">
                          <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-3">
                            <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">Datos de Transferencia</span>
                            <div className="space-y-1.5 text-xs">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                                  <DollarSign className="w-3 h-3 text-blue-600" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-slate-500 font-medium leading-none text-[10px]">CBU</p>
                                  <p className="text-slate-900 font-bold tracking-tight truncate">0070012345678901234567</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-md bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                                  <ChevronRight className="w-3 h-3 text-emerald-600" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-slate-500 font-medium leading-none text-[10px]">Alias</p>
                                  <p className="text-slate-900 font-bold">rv.entrenamientos.mp</p>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="sm:w-36 bg-gradient-to-br from-[#990000] to-[#fe0000] rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-red-200 block mb-1">Cuota</span>
                            <p className="text-white font-black text-2xl leading-none">$17.000</p>
                            <span className="text-red-200 text-[10px] font-medium mt-1">/ mes</span>
                          </div>
                        </div>

                        {/* Estado del pago */}
                        {user.payment_status === 'Pagado' && (
                          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                              <Shield className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div className="text-xs text-emerald-800 font-medium leading-relaxed">
                              <span className="text-emerald-950 font-bold">¡Cuota al día!</span> Registrado mediante <span className="font-bold">{user.payment_method}</span>.
                            </div>
                          </div>
                        )}

                        {user.payment_status === 'Pendiente_Verificacion' && (
                          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-blue-50 border border-blue-200">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <Clock className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="text-xs text-blue-800 font-medium leading-relaxed">
                              Comprobante <strong>&quot;{user.payment_receipt_url}&quot;</strong> en revisión.
                            </div>
                          </div>
                        )}

                        {user.payment_status === 'Vencido' && (
                          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-red-50 border border-red-200">
                            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                              <AlertTriangle className="w-4 h-4 text-red-600" />
                            </div>
                            <div className="text-xs text-red-800 font-medium leading-relaxed">
                              <strong>Rechazado:</strong> {user.payment_motivo_rechazo || 'Comprobante no válido.'}
                            </div>
                          </div>
                        )}

                        {user.payment_status === 'Pendiente_Pago' && (
                          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                              <AlertTriangle className="w-4 h-4 text-amber-600" />
                            </div>
                            <div className="text-xs text-amber-800 font-medium leading-relaxed">
                              <strong>Falta registrar pago:</strong> Reportá tu transferencia mensual.
                            </div>
                          </div>
                        )}

                        {/* Upload form */}
                        {(user.payment_status === 'Pendiente_Pago' || user.payment_status === 'Vencido') && (
                          <form onSubmit={handleUploadReceipt} className="pt-4 border-t border-slate-100 space-y-3 relative z-10">
                            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block flex items-center gap-1.5">
                              <Upload className="w-3 h-3" />
                              Cargar comprobante de pago
                            </label>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) => {
                                  setReceiptFile(e.target.files?.[0] || null);
                                  setUploadError('');
                                }}
                                className="w-full bg-slate-50 border border-slate-200 focus:border-[#990000] focus:ring-1 focus:ring-[#990000]/20 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none transition-all file:mr-2 file:py-0.5 file:px-2.5 file:rounded-full file:border-0 file:text-[9px] file:font-bold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300"
                              />
                              <button
                                type="submit"
                                disabled={!receiptFile || uploadingReceipt}
                                className="sm:w-52 py-2.5 bg-[#990000] hover:bg-[#fe0000] text-white font-bold text-xs rounded-xl shadow-md shadow-[#990000]/10 hover:shadow-[#990000]/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                {uploadingReceipt ? 'Enviando...' : 'Enviar Comprobante'}
                              </button>
                            </div>
                            {uploadError && <p className="text-[10px] text-red-650 font-medium">{uploadError}</p>}
                          </form>
                        )}
                      </div>
                    </SectionCard>

                    {/* APTO FÍSICO */}
                    <SectionCard spaceY="space-y-0" padding="p-0">
                      <div className="bg-gradient-to-r from-[#990000] to-[#fe0000] px-6 sm:px-8 py-5 rounded-t-[32px]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                              <Stethoscope className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h3 className={`${archivoFont.className} text-base sm:text-lg font-black text-white uppercase tracking-tight leading-none`}>
                                Apto Físico
                              </h3>
                              <p className="text-blue-100 text-[11px] font-semibold mt-0.5">
                                Certificado médico obligatorio
                              </p>
                            </div>
                          </div>
                          <StatusBadge status={user.apto_medico_status} variant="medical" className="!text-[9px] !px-3 !py-1 !rounded-lg bg-white/15 !border-white/25 !text-white backdrop-blur-sm" />
                        </div>
                      </div>

                      <div className="px-6 sm:px-8 py-6 space-y-5">
                        {user.apto_medico_status === 'vigente' && user.apto_medico_vencimiento && (
                          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                              <Shield className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div className="text-xs text-emerald-800 font-medium leading-relaxed">
                              Válido hasta: <strong className="text-emerald-950">{new Date(user.apto_medico_vencimiento).toLocaleDateString("es-AR")}</strong>.
                            </div>
                          </div>
                        )}

                        {user.apto_medico_status === 'pendiente_verificacion' && (
                          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-blue-50 border border-blue-200">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <Clock className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="text-xs text-blue-800 font-medium">
                              Comprobante médico subido. Esperando validación.
                            </div>
                          </div>
                        )}

                        {user.apto_medico_status === 'rechazado' && (
                          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-red-50 border border-red-200">
                            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                              <AlertTriangle className="w-4 h-4 text-red-600" />
                            </div>
                            <div className="text-xs text-red-800 font-medium leading-relaxed">
                              <strong>Rechazado:</strong> {user.apto_medico_motivo_rechazo || 'Documento no válido.'}
                            </div>
                          </div>
                        )}

                        {user.apto_medico_status === 'no_entregado' && (
                          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                              <AlertTriangle className="w-4 h-4 text-amber-600" />
                            </div>
                            <div className="text-xs text-amber-800 font-medium leading-relaxed">
                              Obligatorio para participar en entrenamientos presenciales.
                            </div>
                          </div>
                        )}

                        {/* Upload form */}
                        {(user.apto_medico_status === 'no_entregado' || user.apto_medico_status === 'rechazado') && (
                          <form onSubmit={handleUploadCert} className="pt-4 border-t border-slate-100 space-y-3 relative z-10">
                            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block flex items-center gap-1.5">
                              <Upload className="w-3 h-3" />
                              Cargar apto médico
                            </label>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) => {
                                  setCertFile(e.target.files?.[0] || null);
                                  setCertError('');
                                }}
                                className="w-full bg-slate-50 border border-slate-200 focus:border-rose-400 focus:ring-1 focus:ring-rose-400/20 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none transition-all file:mr-2 file:py-0.5 file:px-2.5 file:rounded-full file:border-0 file:text-[9px] file:font-bold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300"
                              />
                              <button
                                type="submit"
                                disabled={!certFile || uploadingCert}
                                className="sm:w-52 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-500/10 hover:shadow-rose-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                {uploadingCert ? 'Enviando...' : 'Enviar Certificado'}
                              </button>
                            </div>
                            {certError && <p className="text-[10px] text-red-655 font-medium">{certError}</p>}
                          </form>
                        )}
                      </div>
                    </SectionCard>
                  </div>

                  {/* COLUMNA DERECHA (1/3) */}
                  <div className="space-y-6">

                    {/* CONTACTO ENTRENADOR */}
                    <SectionCard spaceY="space-y-0" padding="p-0">
                      <div className="bg-gradient-to-r from-[#990000] to-[#fe0000] px-6 py-4 rounded-t-[32px]">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <MessageCircle className="w-4.5 h-4.5 text-white" />
                          </div>
                          <h3 className={`${archivoFont.className} text-sm font-black text-white uppercase tracking-tight leading-none`}>
                            Tu Entrenador
                          </h3>
                        </div>
                      </div>
                      <div className="px-6 py-5 space-y-4">
                        {/* Coach card */}
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white font-black text-base uppercase shadow-sm">
                            {coachName[0]}
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-bold text-slate-900 leading-none">{coachName}</p>
                            <p className="text-[10px] text-slate-500 font-semibold mt-1 uppercase tracking-wider">Coordinador</p>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                          ¿Tenés dudas o necesitas justificar una inasistencia?
                        </p>
                        <a
                          href={whatsappLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl text-center flex items-center justify-center gap-2 shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all cursor-pointer uppercase tracking-wider"
                        >
                          <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                            <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.335 4.978L2 22l5.233-1.372a9.948 9.948 0 0 0 4.779 1.222h.004c5.505 0 9.989-4.478 9.99-9.985A9.97 9.97 0 0 0 12.012 2zm5.835 14.129c-.256.719-1.285 1.408-1.768 1.47-.482.062-1.077.087-3.136-.763-2.636-1.087-4.32-3.791-4.452-3.966-.131-.174-1.071-1.428-1.071-2.723 0-1.294.678-1.928.919-2.19.242-.262.528-.328.703-.328.176 0 .351.001.503.008.157.007.368-.06.575.441.207.502.71 1.733.772 1.859.062.126.103.272.019.439-.083.167-.124.272-.248.419-.124.146-.26.326-.372.438-.124.125-.254.261-.11.512.145.251.644 1.062 1.379 1.718.948.845 1.745 1.107 1.993 1.232.247.126.392.105.538-.063.145-.167.621-.722.787-.968.166-.246.331-.207.558-.123.228.084 1.448.682 1.696.807.248.125.414.188.476.293.061.104.061.603-.195 1.322z" />
                          </svg>
                          Enviar WhatsApp
                        </a>
                      </div>
                    </SectionCard>

                    {/* CUMPLEAÑOS DE LA SEMANA */}
                    <SectionCard spaceY="space-y-0" padding="p-0">
                      <div className="bg-gradient-to-r from-[#990000] to-[#fe0000] px-6 py-4 rounded-t-[32px]">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Cake className="w-4.5 h-4.5 text-white" />
                          </div>
                          <h3 className={`${archivoFont.className} text-sm font-black text-white uppercase tracking-tight leading-none`}>
                            Cumpleaños
                          </h3>
                        </div>
                      </div>
                      <div className="px-6 py-5">
                        {birthdaysThisWeek.length === 0 ? (
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center flex-shrink-0">
                              <Cake className="w-4 h-4 text-violet-300" />
                            </div>
                            <p className="text-xs text-slate-400 italic leading-relaxed">No hay cumpleaños de compañeros esta semana.</p>
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {birthdaysThisWeek.map(member => (
                              <div key={member.id} className="flex items-center gap-3 bg-gradient-to-r from-violet-50 to-purple-50/50 p-3 rounded-xl border border-violet-100/80">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-xs uppercase shadow-sm">
                                  {member.name ? member.name[0] : '🎂'}
                                </div>
                                <div className="text-left min-w-0 flex-1">
                                  <p className="text-xs font-bold text-slate-850 leading-none truncate">{member.name}</p>
                                  <p className="text-[10px] text-violet-600 font-semibold mt-1">🎉 {member.birthdayStr}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </SectionCard>
                  </div>

                </div>
              )}

              {/* BOTÓN DARSE DE BAJA AL FINAL DE TODO */}
              <div className="flex justify-center pt-6 border-t border-slate-200 mt-6">
                <button
                  onClick={() => setLeaveDialogOpen(true)}
                  className="px-6 py-2.5 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-150 border border-red-200 rounded-full font-bold text-xs transition-all duration-150 cursor-pointer uppercase tracking-wider shadow-sm"
                >
                  Darse de baja del equipo
                </button>
              </div>

              <ConfirmDialog
                open={leaveDialogOpen}
                onOpenChange={(open) => { if (!open) setLeaveFeedback(''); setLeaveDialogOpen(open); }}
                title="Darse de baja del equipo"
                description="¿Estás seguro de que deseas darte de baja de este equipo? Se borrarán tus datos de pago asociados al club."
                confirmLabel="Sí, darme de baja"
                variant="destructive"
                onConfirm={handleLeaveTeam}
              >
                <div className="px-4">
                  <label className="text-xs font-medium text-slate-500 mb-1 block">
                    Motivo (opcional)
                  </label>
                  <textarea
                    value={leaveFeedback}
                    onChange={(e) => setLeaveFeedback(e.target.value)}
                    placeholder="Dejanos tu feedback para seguir mejorando..."
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-700 bg-slate-50 resize-none h-20 outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>
              </ConfirmDialog>

            </div>
          )}
      </main>
    </div>
  );
}
