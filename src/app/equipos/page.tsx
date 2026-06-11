'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getTeamsAsync, Team, Athlete, getAllAthletes } from '@/lib/db';
import { requestJoinTeamAction, leaveTeamAction } from '@/lib/actions';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import Navbar from '@/components/Navbar';
import HeaderAlert from '@/components/HeaderAlert';
import { isProfileComplete } from '@/lib/utils';
import { MapPin, Users, ArrowRight, ChevronLeft, Clock, Footprints, Activity, Dumbbell, Mountain, Compass } from 'lucide-react';
import { Archivo } from 'next/font/google';

const archivoFont = Archivo({
  subsets: ['latin'],
  weight: ['800', '900'],
});

export default function EquiposPage() {
  const router = useRouter();
  const { user, isLoading, setUser } = useAuthGuard();
  const [teams, setTeams] = useState<Team[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchTerm] = useState('');
  const [activeTeamDetails, setActiveTeamDetails] = useState<Team | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [allAthletes, setAllAthletes] = useState<Athlete[]>([]);
  const [pendingTeamId, setPendingTeamId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAlertTeam, setPendingAlertTeam] = useState<Team | null>(null);

  // Computaciones para el modal "Ver equipo"
  const activeTeamAdmin = activeTeamDetails
    ? allAthletes.find(a => a.team_id === activeTeamDetails.id && a.role === 'admin')
    : null;

  const coachName = activeTeamAdmin ? activeTeamAdmin.name : (activeTeamDetails?.coach || 'Raúl');
  const coachPhone = activeTeamAdmin?.phone?.replace(/[^0-9]/g, '') || '5493804592633';
  
  const whatsappLink = `https://wa.me/${coachPhone}?text=${encodeURIComponent('Hola Raúl, te escribo para hacerte una consulta acerca de los entrenamientos de RV...')}`;

  const athleteCount = activeTeamDetails
    ? allAthletes.filter(a => a.team_id === activeTeamDetails.id && a.team_status === 'activo').length
    : 0;

  const getExperienceYears = (foundedDateStr?: string) => {
    if (!foundedDateStr) return 10;
    const founded = new Date(foundedDateStr);
    if (isNaN(founded.getTime())) return 10;
    const today = new Date();
    let years = today.getFullYear() - founded.getFullYear();
    const m = today.getMonth() - founded.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < founded.getDate())) {
      years--;
    }
    return Math.max(0, years);
  };

  const loadData = async () => {
    if (!user) return;
    const allTeams = await getTeamsAsync();
    setTeams(allTeams);
    const athletesList = await getAllAthletes();
    setAllAthletes(athletesList);
    setDataLoading(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setActiveTeamDetails(null);
    }, 200);
  };

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleJoinTeam = async (teamId: string) => {
    if (!user || pendingTeamId || cancelling) return;
    setActionError(null);
    setPendingTeamId(teamId);
    try {
      const result = await requestJoinTeamAction(teamId);
      if (result.success) {
        setUser(result.data);
        await loadData();
      } else {
        setActionError(`No se pudo enviar la solicitud (${result.code}): ${result.error}`);
      }
    } catch (err) {
      setActionError(`Error inesperado al unirse: ${String(err)}`);
    } finally {
      setPendingTeamId(null);
    }
  };

  const handleCancelRequest = async () => {
    if (!user || pendingTeamId || cancelling) return;
    setActionError(null);
    setCancelling(true);
    try {
      const result = await leaveTeamAction();
      if (result.success) {
        setUser(result.data);
        await loadData();
      } else {
        setActionError(`No se pudo cancelar la solicitud (${result.code}): ${result.error}`);
      }
    } catch (err) {
      setActionError(`Error inesperado al cancelar: ${String(err)}`);
    } finally {
      setCancelling(false);
    }
  };

  const filteredTeams = useMemo(() => 
    teams.filter(team => 
      team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.location?.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  [teams, searchTerm]);

  if (isLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="animate-pulse text-slate-600 font-medium">Cargando...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 bg-[radial-gradient(120%_60%_at_50%_0%,rgba(74,222,128,0.08)_0%,rgba(30,78,109,0.05)_40%,rgba(255,255,255,0)_100%)] text-slate-900 font-sans antialiased pb-8">
      <HeaderAlert user={user} />
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {actionError && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl flex items-center justify-between gap-3">
            <span>{actionError}</span>
            <button
              onClick={() => setActionError(null)}
              className="text-red-500 hover:text-red-700 text-xs font-semibold cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        )}
        {/* HEADER */}
        <div className="relative mb-12 text-left">
          {/* Decorative blur blobs */}
          <div className="absolute -left-10 -top-10 w-32 h-32 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute left-40 -top-20 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-4">
            <h1 className={`${archivoFont.className} text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 leading-none`}>
              Equipos
            </h1>
            <p className="text-slate-500 text-sm sm:text-base font-medium max-w-xl">
              Busca tu equipo para entrenar.
            </p>
          </div>
          <div className="h-[2px] w-20 bg-gradient-to-r from-[#990000] to-transparent mt-6 rounded-full" />
        </div>
        {/* TEAMS GRID */}
        {filteredTeams.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
            <p className="text-slate-600">No se encontraron equipos con ese criterio de busqueda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeams.map((team) => {
              const isUserTeam = user.team_id === team.id;
              const isActive = isUserTeam && user.team_status === 'activo';

              const teamAdmin = allAthletes.find(a => a.team_id === team.id && a.role === 'admin');
              const coachName = teamAdmin ? teamAdmin.name : team.coach;

              return (
                <div
                  key={team.id}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button')) return;
                    if (isActive) {
                      router.push('/dashboard');
                    } else if (isUserTeam) {
                      setPendingAlertTeam(team);
                    } else {
                      setActiveTeamDetails(team);
                      setIsModalOpen(true);
                    }
                  }}
                  className={`bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col relative cursor-pointer ${
                    isActive ? 'hover:border-emerald-300' : isUserTeam ? 'hover:border-amber-300' : 'hover:border-red-300'
                  }`}
                >
                  {/* Top Cover Image (Centered Logo on Black Background) */}
                  <div className="relative h-56 w-full overflow-hidden bg-black flex items-center justify-center p-4">
                    {/* Background watermark logo */}
                    <Image
                      src="/rv-logo.png"
                      alt=""
                      aria-hidden="true"
                      fill
                      className="object-contain opacity-[0.07] scale-150 pointer-events-none select-none"
                    />
                    <Image 
                      src={team.logo_url || '/rv-logo.png'} 
                      alt={team.name} 
                      fill
                      className="object-contain"
                    />
                    {isActive && (
                      <span className="absolute top-4 right-4 bg-emerald-500 text-white text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full shadow-md z-10">
                        Tu equipo
                      </span>
                    )}
                  </div>

                  {/* Card Body - Content Section below logo */}
                  <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
                    <div className="text-left space-y-2">
                      <h3 className={`${archivoFont.className} text-xl font-black text-slate-900 leading-tight uppercase`}>
                        {team.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-semibold">
                        <span className="text-[#990000] font-bold">
                          De {coachName}
                        </span>
                        {team.location && (
                          <span className="flex items-center gap-1 text-slate-400">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {team.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-5 pb-5">
                    {isUserTeam ? (
                      <div className="w-full">
                        {!isActive && (
                          <button
                            onClick={handleCancelRequest}
                            disabled={cancelling}
                            className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-full text-xs font-semibold text-center transition-all duration-150 cursor-pointer shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {cancelling ? 'Cancelando...' : 'Cancelar Solicitud'}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {isProfileComplete(user) ? (
                          <button
                            onClick={() => handleJoinTeam(team.id)}
                            disabled={pendingTeamId === team.id}
                            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-semibold shadow-md shadow-blue-600/10 hover:shadow-blue-600/20 transition-all duration-150 cursor-pointer flex items-center justify-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {pendingTeamId === team.id ? 'Enviando...' : 'Unirse'}
                            {pendingTeamId !== team.id && <ArrowRight className="w-3 h-3" />}
                          </button>
                        ) : (
                          <button
                            onClick={() => router.push('/perfil')}
                            className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-500 rounded-full text-[10px] font-black tracking-tight transition-all duration-150 cursor-pointer flex items-center justify-center gap-0.5 border border-slate-300/40"
                            title="Debes completar tu perfil para unirte a un equipo"
                          >
                            Completar Perfil
                            <ArrowRight className="w-2.5 h-2.5" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setActiveTeamDetails(team);
                            setIsModalOpen(true);
                          }}
                          className="w-full py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer text-center shadow-sm"
                        >
                          Ver equipo
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Ventana Emergente (Modal) "Ver equipo" al estilo de la referencia */}
      {activeTeamDetails && (
        <div 
          className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${
            isModalOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={handleCloseModal}
        >
          <div 
            className={`bg-[#e2edf6] text-slate-800 rounded-[32px] overflow-hidden shadow-2xl max-w-sm w-full border border-white/45 flex flex-col relative ${
              isModalOpen ? 'animate-modal-zoom-in' : 'animate-modal-zoom-out'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Profile Card Header with Background Image */}
            <div className="relative h-64 w-full overflow-hidden bg-black flex items-center justify-center p-4">
              <Image 
                src={activeTeamDetails.logo_url || '/rv-logo.png'} 
                alt={activeTeamDetails.name} 
                fill
                className="object-contain"
              />
              
              {/* Circular Action Buttons at top */}
              <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
                <button 
                  onClick={handleCloseModal}
                  className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center shadow-md transition-all cursor-pointer border border-white/20"
                >
                  <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* Middle Controls (WhatsApp Button Full-Width) */}
            <div className="px-6 py-5 space-y-5">
              {/* Team Identity below logo */}
              <div className="text-left space-y-1.5">
                <h2 className={`${archivoFont.className} text-2xl font-black text-slate-900 uppercase tracking-tight`}>
                  {activeTeamDetails.name}
                </h2>
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className="text-[#990000] font-bold">De {coachName}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-400 font-medium">Director Técnico y Coach</span>
                </div>
              </div>
              <div className="flex items-center justify-center">
                {/* WhatsApp Button */}
                <a 
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white rounded-full py-3 px-5 flex items-center justify-center gap-2.5 font-bold text-sm shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                  title="WhatsApp Chat"
                >
                  <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.003 5.324 5.328 0 11.94 0c3.202.001 6.212 1.248 8.477 3.517 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.618-5.33 11.942-11.942 11.942-2.01-.001-3.987-.504-5.748-1.46L0 24zm6.59-4.846c1.6.95 3.488 1.449 5.348 1.451 5.424 0 9.835-4.41 9.839-9.834.002-2.628-1.021-5.1-2.881-6.958-1.859-1.858-4.332-2.88-6.962-2.882-5.422 0-9.83 4.41-9.835 9.836-.001 1.87.49 3.698 1.42 5.3l-.933 3.406 3.493-.916zm11.23-5.263c-.3-.149-1.771-.875-2.043-.974-.271-.099-.469-.149-.665.15-.197.299-.762.974-.934 1.171-.172.197-.344.223-.644.074-.3-.149-1.27-.468-2.42-1.493-.895-.798-1.5-1.785-1.676-2.083-.176-.299-.019-.46.13-.609.135-.134.3-.349.449-.523.15-.174.2-.299.3-.498.1-.199.05-.374-.025-.523-.075-.149-.665-1.603-.91-2.193-.24-.576-.482-.498-.665-.508-.172-.007-.37-.008-.568-.008-.198 0-.52.074-.792.373-.272.299-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.771-.724 2.022-1.424.252-.699.252-1.299.177-1.424-.075-.124-.272-.199-.572-.349z" />
                  </svg>
                  Chatear con el Entrenador
                </a>
              </div>

              {/* White bottom card containing stats */}
              <div className="bg-white rounded-[24px] p-4 shadow-sm border border-slate-200/30 flex items-center justify-between text-center">
                <div className="flex-1">
                  <div className="flex justify-center text-[#990000] mb-1">
                    <Clock className="w-4.5 h-4.5" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">{getExperienceYears(activeTeamDetails.founded_date)} Años</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-0.5">Experiencia</p>
                </div>
                <div className="h-8 w-[1px] bg-slate-100" />
                <div className="flex-1">
                  <div className="flex justify-center text-[#990000] mb-1">
                    <Users className="w-4.5 h-4.5" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">{athleteCount}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-0.5">Atletas</p>
                </div>
              </div>

              {/* Sports list section */}
              <div className="bg-white/40 rounded-[20px] p-4 border border-white/45 space-y-2 text-left">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Activity className="w-4 h-4 text-[#990000]" />
                  Especialidades del Equipo
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {((activeTeamDetails.specialties || 'Trail Running,Ultra Trail,Ruta / Calle,Funcional')
                    .split(',')
                    .map(s => s.trim())
                    .filter(Boolean)
                  ).map((sportName) => {
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
                        className="bg-white hover:bg-slate-50 text-slate-800 px-3 py-2 rounded-xl text-[11px] font-bold shadow-sm border border-slate-200/40 flex items-center gap-2 transition-all"
                      >
                        <SportIcon className="w-4.5 h-4.5 text-[#990000] flex-shrink-0" />
                        <span>{sportName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {pendingAlertTeam && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-xl space-y-5 relative overflow-hidden text-left">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 to-transparent rounded-bl-full pointer-events-none" />
            <div className="flex items-center gap-4 pb-4 border-b border-slate-100 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className={`${archivoFont.className} text-lg font-black text-slate-900 uppercase tracking-tight`}>Solicitud en revisión</h3>
                <p className="text-sm text-slate-500 font-medium">{pendingAlertTeam.name}</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed relative z-10">
              Tu solicitud de ingreso a <strong>{pendingAlertTeam.name}</strong> aún está siendo evaluada por el administrador del equipo. Recibirás una notificación cuando sea aprobada.
            </p>
            <button
              onClick={() => setPendingAlertTeam(null)}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-full transition-all duration-150 cursor-pointer uppercase tracking-wider relative z-10"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}