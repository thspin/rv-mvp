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
  Footprints,
  Activity,
  Dumbbell,
  Mountain,
  Compass,
  MessageCircle
} from 'lucide-react';
import { Archivo } from 'next/font/google';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { StatusBadge } from '@/components/ui/status-badge';
import { SectionCard } from '@/components/ui/section-card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { parseDateLocal, getExperienceYears } from '@/lib/utils';

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
    <div className="min-h-screen bg-slate-50 bg-[radial-gradient(120%_60%_at_50%_0%,rgba(74,222,128,0.08)_0%,rgba(30,78,109,0.05)_40%,rgba(255,255,255,0)_100%)] text-slate-900 font-sans antialiased pb-8">
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
                        Entrenador: <strong className="text-[#1e4e6d]">{team.coach}</strong>
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
                <div className="space-y-6">
                  {/* DESCRIPCION DEL EQUIPO */}
                  <SectionCard spaceY="space-y-4">
                    <h3 className={`${archivoFont.className} text-lg font-black text-slate-900 uppercase tracking-tight pb-3 border-b border-slate-100/80 flex items-center gap-2`}>
                      <Users className="w-5 h-5 text-[#1e4e6d]" />
                      Sobre el Equipo
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {team.description || 'Sin descripcion disponible.'}
                    </p>
                  </SectionCard>

                  {/* STATS DEL EQUIPO */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white border border-slate-200 rounded-[24px] p-5 text-center shadow-sm">
                      <div className="flex justify-center text-[#1e4e6d] mb-2">
                        <Clock className="w-6 h-6" />
                      </div>
                      <p className="text-2xl font-black text-slate-900">{getExperienceYears(team.founded_date)}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-0.5">Anos de experiencia</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-[24px] p-5 text-center shadow-sm">
                      <div className="flex justify-center text-[#1e4e6d] mb-2">
                        <Users className="w-6 h-6" />
                      </div>
                      <p className="text-2xl font-black text-slate-900">{teamMembers.length}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-0.5">Atletas activos</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-[24px] p-5 text-center shadow-sm">
                      <div className="flex justify-center text-[#1e4e6d] mb-2">
                        <MapPin className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-black text-slate-900 leading-tight">{team.location}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-0.5">Ubicacion</p>
                    </div>
                  </div>

                  {/* ESPECIALIDADES */}
                  {team.specialties && (
                    <SectionCard spaceY="space-y-3">
                      <h3 className={`${archivoFont.className} text-lg font-black text-slate-900 uppercase tracking-tight pb-3 border-b border-slate-100/80 flex items-center gap-2`}>
                        <Activity className="w-5 h-5 text-emerald-600" />
                        Especialidades
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {team.specialties.split(',').map(s => s.trim()).filter(Boolean).map((sportName) => {
                          const getIcon = (name: string) => {
                            switch (name.toLowerCase()) {
                              case 'trail running': return Footprints;
                              case 'ultra trail': return Mountain;
                              case 'ruta / calle': return Compass;
                              case 'funcional': return Dumbbell;
                              case 'trekking': return Mountain;
                              case 'aventura': return Compass;
                              case 'crossfit': return Dumbbell;
                              case 'ciclismo': return Activity;
                              default: return Activity;
                            }
                          };
                          const SportIcon = getIcon(sportName);
                          return (
                            <div
                              key={sportName}
                              className="bg-slate-50 border border-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
                            >
                              <SportIcon className="w-4 h-4 text-[#1e4e6d]" />
                              <span>{sportName}</span>
                            </div>
                          );
                        })}
                      </div>
                    </SectionCard>
                  )}

                  {/* HORARIOS */}
                  {team.training_days && (
                    <SectionCard spaceY="space-y-3">
                      <h3 className={`${archivoFont.className} text-lg font-black text-slate-900 uppercase tracking-tight pb-3 border-b border-slate-100/80 flex items-center gap-2`}>
                        <Clock className="w-5 h-5 text-blue-600" />
                        Horarios de Entrenamiento
                      </h3>
                      <p className="text-sm text-slate-600 font-medium">{team.training_days}</p>
                    </SectionCard>
                  )}

                  {/* WHATSAPP COACH */}
                  <SectionCard spaceY="space-y-4">
                    <h3 className={`${archivoFont.className} text-lg font-black text-slate-900 uppercase tracking-tight pb-3 border-b border-slate-100/80 flex items-center gap-2`}>
                      <MessageCircle className="w-5 h-5 text-emerald-600" />
                      Contacto con el Entrenador
                    </h3>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      Tenes dudas sobre los entrenamientos o necesitas justificar una inasistencia? Escribile directamente a <strong className="text-[#1e4e6d]">{coachName}</strong>:
                    </p>
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3.5 bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-sm rounded-full text-center flex items-center justify-center gap-2.5 shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all cursor-pointer"
                    >
                      <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.003 5.324 5.328 0 11.94 0c3.202.001 6.212 1.248 8.477 3.517 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.618-5.33 11.942-11.942 11.942-2.01-.001-3.987-.504-5.748-1.46L0 24zm6.59-4.846c1.6.95 3.488 1.449 5.348 1.451 5.424 0 9.835-4.41 9.839-9.834.002-2.628-1.021-5.1-2.881-6.958-1.859-1.858-4.332-2.88-6.962-2.882-5.422 0-9.83 4.41-9.835 9.836-.001 1.87.49 3.698 1.42 5.3l-.933 3.406 3.493-.916zm11.23-5.263c-.3-.149-1.771-.875-2.043-.974-.271-.099-.469-.149-.665.15-.197.299-.762.974-.934 1.171-.172.197-.344.223-.644.074-.3-.149-1.27-.468-2.42-1.493-.895-.798-1.5-1.785-1.676-2.083-.176-.299-.019-.46.13-.609.135-.134.3-.349.449-.523.15-.174.2-.299.3-.498.1-.199.05-.374-.025-.523-.075-.149-.665-1.603-.91-2.193-.24-.576-.482-.498-.665-.508-.172-.007-.37-.008-.568-.008-.198 0-.52.074-.792.373-.272.299-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.771-.724 2.022-1.424.252-.699.252-1.299.177-1.424-.075-.124-.272-.199-.572-.349z" />
                      </svg>
                      Chatear con {coachName}
                    </a>
                  </SectionCard>
                </div>
              ) : activeDashboardTab === 'entrenamientos' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start text-left">

                  {/* COLUMNA IZQUIERDA (WIDER: 2/3 cols) */}
                  <div className="md:col-span-2 space-y-6">

                    {/* ENTRENAMIENTOS DIARIOS */}
                    <SectionCard spaceY="space-y-5">
                      <h3 className={`${archivoFont.className} text-lg font-black text-slate-900 uppercase tracking-tight pb-3 border-b border-slate-100/80 flex items-center gap-2`}>
                        <FileText className="w-5 h-5 text-emerald-600" />
                        Entrenamientos Diarios
                      </h3>

                      {parsedShifts ? (
                        <div className="space-y-6">
                          {/* Tabs internas de turnos */}
                            <div className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-3">
                              {parsedShifts.map((shift) => (
                                <button
                                  key={shift.id}
                                  onClick={() => setActiveShiftId(shift.id)}
                                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                                    activeShiftId === shift.id
                                      ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                  }`}
                                >
                                  {shift.name}
                                </button>
                              ))}
                            </div>

                            {parsedInstructions?.general && (
                              <div className="flex gap-3 bg-blue-50 border border-blue-150 p-4 rounded-2xl text-blue-900 text-xs font-semibold leading-relaxed">
                                <span className="text-blue-600 flex-shrink-0 font-bold uppercase tracking-wider text-[9px] bg-blue-100 px-2.5 py-0.5 rounded-full h-fit mt-0.5">
                                  Aviso General
                                </span>
                                <p className="whitespace-pre-line text-left">{parsedInstructions.general}</p>
                              </div>
                            )}

                            <div className="grid grid-cols-1 gap-4">
                              {parsedShifts
                                .filter((shift) => shift.id === activeShiftId)
                                .map((shift) => {
                                  const routine = parsedInstructions?.shifts[shift.id];
                                  return (
                                    <div key={shift.id} className="border border-slate-150 rounded-2xl p-5 bg-slate-50 space-y-4 text-left">
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-slate-200/60">
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                          <Clock className="w-4 h-4 text-blue-500" />
                                          <span>Horario: {shift.time} ({shift.days})</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                          <MapPin className="w-4 h-4 text-red-500" />
                                          <span className="truncate">Lugar: {shift.location}</span>
                                        </div>
                                      </div>

                                      <div className="space-y-2">
                                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">
                                          Planificación / Rutina
                                        </span>
                                        {routine ? (
                                          <p className="text-sm font-medium text-slate-700 whitespace-pre-line leading-relaxed pl-1">
                                            {routine}
                                          </p>
                                        ) : (
                                          <p className="text-xs text-slate-400 italic pl-1">
                                            No se ha cargado una planificación específica para este turno hoy.
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl text-slate-700 font-medium leading-relaxed">
                            {team.instructions ? (
                              <p className="text-sm whitespace-pre-line">
                                {team.instructions}
                              </p>
                            ) : (
                              <p className="text-sm text-slate-400 italic">
                                El coordinador aún no ha publicado instrucciones específicas de entrenamiento.
                              </p>
                            )}
                          </div>
                      )}
                    </SectionCard>
                  </div>

                  {/* COLUMNA DERECHA (NARROWER: 1/3 col) */}
                  <div className="space-y-6">
                    {/* ENTRENAMIENTOS ESPECIALES (FONDOS DE FIN DE SEMANA) */}
                    <SectionCard spaceY="space-y-5">
                      <h3 className={`${archivoFont.className} text-lg font-black text-slate-900 uppercase tracking-tight pb-3 border-b border-slate-100/80 flex items-center gap-2`}>
                        <Clock className="w-5 h-5 text-blue-600" />
                        Fondo del Fin de Semana
                      </h3>

                      <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl text-slate-700 font-medium leading-relaxed">
                        {team.special_instructions ? (
                          <p className="text-sm whitespace-pre-line">
                            {team.special_instructions}
                          </p>
                        ) : (
                          <p className="text-sm text-slate-400 italic">
                            No hay entrenamientos especiales programados para este fin de semana.
                          </p>
                        )}
                      </div>
                    </SectionCard>

                    {/* UBICACIÓN DE ENTRENAMIENTOS (GOOGLE MAPS) */}
                    <SectionCard spaceY="space-y-5">
                      <h3 className={`${archivoFont.className} text-lg font-black text-slate-900 uppercase tracking-tight pb-3 border-b border-slate-100/80 flex items-center gap-2`}>
                        <MapPin className="w-5 h-5 text-red-500" />
                        Ubicación
                      </h3>

                      <p className="text-sm text-slate-650 font-medium">
                        Entrenamos en: <strong className="text-slate-900">{team.location}</strong>
                      </p>

                        {getEmbedUrl(team.google_maps_url) ? (
                          <div className="w-full h-48 rounded-2xl overflow-hidden border border-slate-200 mt-2 shadow-sm">
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
                            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-bold shadow-md shadow-blue-600/10 hover:shadow-blue-600/20 transition-all uppercase tracking-wider mt-2 cursor-pointer"
                          >
                            Ver en Google Maps
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No hay mapa configurado para este equipo.</p>
                        )}
                    </SectionCard>
                  </div>

                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start text-left">

                  {/* COLUMNA IZQUIERDA (WIDER: 2/3 cols) */}
                  <div className="md:col-span-2 space-y-6">
                    {/* PLAN DE SUSCRIPCIÓN Y PAGO */}
                    <div className="bg-white border border-slate-200 rounded-[32px] p-6 sm:p-8 shadow-sm space-y-5 relative overflow-hidden flex flex-col justify-between">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-slate-50 to-transparent rounded-bl-full pointer-events-none" />
                      <div className="space-y-4 relative z-10">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100/80">
                          <h3 className={`${archivoFont.className} text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2`}>
                            <DollarSign className="w-5 h-5 text-[#1e4e6d]" />
                            Plan de Suscripción y Pago
                          </h3>

                          <StatusBadge status={user.payment_status} variant="payment" />
                        </div>

                        {/* Bank Details Accent */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-150 p-4 rounded-2xl text-left text-xs">
                          <div className="space-y-1">
                            <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">Datos de Transferencia</span>
                            <p className="text-slate-700 font-medium leading-none">Banco Galicia • CBU:</p>
                            <p className="text-slate-900 font-bold tracking-tight pb-1">0070012345678901234567</p>
                            <p className="text-slate-700 font-medium">Alias: <strong className="text-slate-900 font-bold">rv.entrenamientos.mp</strong></p>
                          </div>
                          <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-slate-200/80 pt-3 sm:pt-0 sm:pl-4 flex flex-col justify-center">
                            <p className="text-slate-700 font-medium">Monto Cuota:</p>
                            <p className="text-[#1e4e6d] font-black text-lg leading-none">$17.000 <span className="text-xs text-slate-500 font-normal">/ mes</span></p>
                          </div>
                        </div>

                        {user.payment_status === 'Pagado' && (
                          <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200 text-xs text-emerald-800 leading-relaxed font-medium">
                            <span className="text-emerald-950 font-bold">¡Cuota al día!</span> Registrado mediante <span className="font-bold">{user.payment_method}</span>.
                          </div>
                        )}

                        {user.payment_status === 'Pendiente_Verificacion' && (
                          <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200 text-xs text-blue-850 leading-relaxed font-medium">
                            Comprobante <strong>&quot;{user.payment_receipt_url}&quot;</strong> en revisión.
                          </div>
                        )}

                        {user.payment_status === 'Vencido' && (
                          <div className="p-3.5 rounded-xl bg-red-50/50 border border-red-200 text-xs text-red-800 leading-relaxed font-medium">
                            <strong>Rechazado:</strong> {user.payment_motivo_rechazo || 'Comprobante no válido.'}
                          </div>
                        )}

                        {user.payment_status === 'Pendiente_Pago' && (
                          <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200 text-xs text-amber-800 leading-relaxed font-medium">
                            <strong>Falta registrar pago:</strong> Reportá tu transferencia mensual.
                          </div>
                        )}
                      </div>

                      {(user.payment_status === 'Pendiente_Pago' || user.payment_status === 'Vencido') && (
                        <form onSubmit={handleUploadReceipt} className="pt-3 border-t border-slate-100 space-y-2.5 relative z-10">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Cargar comprobante de pago</label>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={(e) => {
                                setReceiptFile(e.target.files?.[0] || null);
                                setUploadError('');
                              }}
                              className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-1.5 text-xs text-slate-900 outline-none transition-all file:mr-2 file:py-0.5 file:px-2 file:rounded-full file:border-0 file:text-[9px] file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                            />
                            <button
                              type="submit"
                              disabled={!receiptFile || uploadingReceipt}
                              className="sm:w-48 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-full shadow-md shadow-blue-600/10 hover:shadow-blue-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              {uploadingReceipt ? 'Enviando...' : 'Enviar Comprobante'}
                            </button>
                          </div>
                          {uploadError && <p className="text-[10px] text-red-650 font-medium">{uploadError}</p>}
                        </form>
                      )}
                    </div>

                    {/* APTO FÍSICO */}
                    <div className="bg-white border border-slate-200 rounded-[32px] p-6 sm:p-8 shadow-sm space-y-5 flex flex-col justify-between relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-slate-50 to-transparent rounded-bl-full pointer-events-none" />
                      <div className="space-y-4 relative z-10">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100/80">
                          <h3 className={`${archivoFont.className} text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2`}>
                            <Heart className="w-5 h-5 text-red-500" />
                            Apto Físico
                          </h3>

                          <StatusBadge status={user.apto_medico_status} variant="medical" />
                        </div>

                        {user.apto_medico_status === 'vigente' && user.apto_medico_vencimiento && (
                          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed font-medium">
                            Válido hasta: <strong className="text-slate-900">{new Date(user.apto_medico_vencimiento).toLocaleDateString("es-AR")}</strong>.
                          </div>
                        )}

                        {user.apto_medico_status === 'pendiente_verificacion' && (
                          <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200 text-xs text-blue-800 leading-relaxed font-medium">
                            Comprobante médico subido. Esperando validación.
                          </div>
                        )}

                        {user.apto_medico_status === 'rechazado' && (
                          <div className="p-3.5 rounded-xl bg-red-50/50 border border-red-200 text-xs text-red-800 leading-relaxed font-medium">
                            <strong>Rechazado:</strong> {user.apto_medico_motivo_rechazo || 'Documento no válido.'}
                          </div>
                        )}

                        {user.apto_medico_status === 'no_entregado' && (
                          <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200 text-xs text-amber-800 leading-relaxed flex items-start gap-1.5 font-medium">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
                            <span>Obligatorio para participar en entrenamientos presenciales.</span>
                          </div>
                        )}
                      </div>

                      {(user.apto_medico_status === 'no_entregado' || user.apto_medico_status === 'rechazado') && (
                        <form onSubmit={handleUploadCert} className="pt-3 border-t border-slate-100 space-y-2.5 relative z-10">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Cargar apto médico</label>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={(e) => {
                                setCertFile(e.target.files?.[0] || null);
                                setCertError('');
                              }}
                              className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-1.5 text-xs text-slate-900 outline-none transition-all file:mr-2 file:py-0.5 file:px-2 file:rounded-full file:border-0 file:text-[9px] file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                            />
                            <button
                              type="submit"
                              disabled={!certFile || uploadingCert}
                              className="sm:w-48 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-full shadow-md shadow-blue-600/10 hover:shadow-blue-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              {uploadingCert ? 'Enviando...' : 'Enviar Certificado'}
                            </button>
                          </div>
                          {certError && <p className="text-[10px] text-red-655 font-medium">{certError}</p>}
                        </form>
                      )}
                    </div>
                  </div>

                  {/* COLUMNA DERECHA (NARROWER: 1/3 col) */}
                  <div className="space-y-6">
                    {/* CONTACTO ENTRENADOR */}
                    <SectionCard padding="p-6" className="text-left" blobColor="emerald" blobSize="w-20 h-20" spaceY="space-y-4">
                      <h3 className={`${archivoFont.className} text-sm font-black text-slate-900 uppercase tracking-tight pb-3 border-b border-slate-100/80 flex items-center gap-2`}>
                        <Users className="w-4 h-4 text-emerald-600" />
                        Contacto Entrenador
                      </h3>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed">
                        ¿Tenés dudas sobre los entrenamientos o necesitas justificar una inasistencia? Escribile directamente a tu entrenador:
                      </p>
                      <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-full text-center flex items-center justify-center gap-2 shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all cursor-pointer uppercase tracking-wider"
                      >
                        <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                          <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.335 4.978L2 22l5.233-1.372a9.948 9.948 0 0 0 4.779 1.222h.004c5.505 0 9.989-4.478 9.99-9.985A9.97 9.97 0 0 0 12.012 2zm5.835 14.129c-.256.719-1.285 1.408-1.768 1.47-.482.062-1.077.087-3.136-.763-2.636-1.087-4.32-3.791-4.452-3.966-.131-.174-1.071-1.428-1.071-2.723 0-1.294.678-1.928.919-2.19.242-.262.528-.328.703-.328.176 0 .351.001.503.008.157.007.368-.06.575.441.207.502.71 1.733.772 1.859.062.126.103.272.019.439-.083.167-.124.272-.248.419-.124.146-.26.326-.372.438-.124.125-.254.261-.11.512.145.251.644 1.062 1.379 1.718.948.845 1.745 1.107 1.993 1.232.247.126.392.105.538-.063.145-.167.621-.722.787-.968.166-.246.331-.207.558-.123.228.084 1.448.682 1.696.807.248.125.414.188.476.293.061.104.061.603-.195 1.322z" />
                        </svg>
                        Enviar mensaje a {coachName}
                      </a>
                    </SectionCard>

                    {/* CUMPLEAÑOS DE LA SEMANA */}
                    <SectionCard padding="p-6" className="text-left" blobColor="rose" blobSize="w-20 h-20" spaceY="space-y-4">
                      <h3 className={`${archivoFont.className} text-sm font-black text-slate-900 uppercase tracking-tight pb-3 border-b border-slate-100/80 flex items-center gap-2`}>
                        <Heart className="w-4 h-4 text-rose-500" />
                        Cumpleaños de la Semana
                      </h3>

                      {birthdaysThisWeek.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No hay cumpleaños de compañeros esta semana.</p>
                      ) : (
                        <div className="space-y-3">
                          {birthdaysThisWeek.map(member => (
                            <div key={member.id} className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 font-extrabold text-sm uppercase">
                                {member.name ? member.name[0] : 'C'}
                              </div>
                              <div className="text-left">
                                <p className="text-xs font-bold text-slate-850 leading-none">{member.name}</p>
                                <p className="text-[10px] text-slate-500 font-medium mt-1">Cumple el {member.birthdayStr}</p>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
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
