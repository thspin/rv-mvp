'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUserAsync, getTeamsAsync, joinTeamAsync, leaveTeamAsync, Team, Athlete } from '@/lib/db';
import Navbar from '@/components/Navbar';
import { MapPin, Users, Calendar, ArrowRight, ChevronLeft, Heart, Star, Phone, Video, Clock, Footprints, Activity } from 'lucide-react';
import { Archivo } from 'next/font/google';

const archivoFont = Archivo({
  subsets: ['latin'],
  weight: ['800', '900'],
});

export default function EquiposPage() {
  const router = useRouter();
  const [user, setUser] = useState<Athlete | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTeamDetails, setActiveTeamDetails] = useState<Team | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const currentUser = await getCurrentUserAsync();
    if (!currentUser) {
      router.push('/');
      return;
    }
    if (!currentUser.onboarding_complete) {
      router.push('/onboarding');
      return;
    }
    setUser(currentUser);
    const allTeams = await getTeamsAsync();
    setTeams(allTeams);
    setIsLoading(false);
  };

  const handleJoinTeam = async (teamId: string) => {
    if (!user) return;
    await joinTeamAsync(user.email, teamId);
    loadData();
  };

  const handleCancelRequest = async () => {
    if (!user) return;
    await leaveTeamAsync(user.email);
    loadData();
  };

  const filteredTeams = teams.filter(team => 
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="animate-pulse text-slate-600 font-medium">Cargando...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans antialiased">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* HEADER */}
        <div className="mb-8">
          <h1 className={`${archivoFont.className} text-4xl font-black tracking-tight text-slate-900 mb-2`}>
            Explorar Equipos
          </h1>
          <p className="text-slate-600">Encuentra tu equipo de run ideal y solicita tu ingreso.</p>
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
              const isPending = isUserTeam && user.team_status === 'pendiente';
              const isActive = isUserTeam && user.team_status === 'activo';

              return (
                <div
                  key={team.id}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  {/* Card Header */}
                  <div className="p-6 pb-4">
                    <div className="flex items-start gap-4">
                      {team.logo_url && (
                        <div className="w-14 h-14 rounded-xl bg-slate-900 overflow-hidden flex items-center justify-center p-1.5 flex-shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={team.logo_url} alt={team.name} className="w-full h-full object-contain" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-slate-900 truncate">{team.name}</h3>
                        {team.location && (
                          <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {team.location}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="px-6 pb-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span>Entrenador: <strong className="text-slate-900">{team.coach}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>{team.training_days}</span>
                    </div>

                  </div>

                  {/* Card Footer */}
                  <div className="px-6 pb-6 space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      {isActive ? (
                        <div className="w-full py-2.5 bg-emerald-600 text-white rounded-full text-xs font-semibold text-center flex items-center justify-center select-none shadow-sm">
                          Miembro
                        </div>
                      ) : isPending ? (
                        <button
                          onClick={handleCancelRequest}
                          className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-full text-xs font-semibold text-center transition-all duration-150 cursor-pointer shadow-sm animate-pulse"
                        >
                          Cancelar
                        </button>
                      ) : (
                        <button
                          onClick={() => handleJoinTeam(team.id)}
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-semibold shadow-md shadow-blue-600/10 hover:shadow-blue-600/20 transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          Unirse
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setActiveTeamDetails(team);
                          setIsFavorite(false);
                        }}
                        className="w-full py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer text-center shadow-sm"
                      >
                        Ver equipo
                      </button>
                    </div>
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
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300"
          onClick={() => setActiveTeamDetails(null)}
        >
          <div 
            className="bg-[#e2edf6] text-slate-800 rounded-[32px] overflow-hidden shadow-2xl max-w-sm w-full border border-white/40 flex flex-col relative animate-modal-zoom-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Profile Card Header with Background Image */}
            <div className="relative h-80 w-full overflow-hidden bg-slate-300">
              <img 
                src={activeTeamDetails.coach === 'Raul Vergara' ? '/coach-raul.png' : activeTeamDetails.logo_url || '/rv-logo.svg'} 
                alt={activeTeamDetails.coach} 
                className="w-full h-full object-cover object-top"
              />
              
              {/* Dark overlay at bottom for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#e2edf6] via-slate-900/10 to-slate-900/30" />

              {/* Circular Action Buttons at top */}
              <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
                <button 
                  onClick={() => setActiveTeamDetails(null)}
                  className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md hover:bg-white text-slate-700 flex items-center justify-center shadow-md transition-all cursor-pointer border border-white/20"
                >
                  <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                </button>
                
                <button 
                  onClick={() => setIsFavorite(!isFavorite)}
                  className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md hover:bg-white text-slate-700 flex items-center justify-center shadow-md transition-all cursor-pointer border border-white/20"
                >
                  <Heart className={`w-5 h-5 transition-colors ${isFavorite ? 'fill-red-500 stroke-red-500' : 'stroke-slate-700'}`} />
                </button>
              </div>

              {/* Overlaid Info on the bottom left of the photo */}
              <div className="absolute bottom-5 left-6 right-6 text-left">
                {/* Rating Badge */}
                <div className="bg-slate-900/50 backdrop-blur-md text-white text-[11px] px-2.5 py-0.5 rounded-full font-semibold w-fit flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-400 stroke-amber-400" />
                  <span>4.9</span>
                </div>

                <h2 className={`${archivoFont.className} text-3xl font-black text-slate-900 mt-2 tracking-tight leading-tight uppercase`}>
                  {activeTeamDetails.coach}
                </h2>
                
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mt-0.5">
                  Director Técnico y Coach
                </p>
                <p className="text-[11px] text-slate-600 font-medium">
                  {activeTeamDetails.name}
                </p>
              </div>
            </div>

            {/* Middle Controls (Frosted Glass or Light Tint Background) */}
            <div className="px-6 py-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                {/* Details Button (Pill shape) */}
                <button className="bg-[#bce0f2] hover:bg-[#a9d5ec] text-[#1e4e6d] rounded-full px-5 py-2.5 flex items-center gap-2 font-bold text-xs shadow-sm transition-all flex-1 justify-center cursor-pointer">
                  <Activity className="w-3.5 h-3.5" />
                  Detalles del Plan
                </button>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {/* Phone Button */}
                  <a 
                    href="tel:+5493804000000"
                    className="w-10 h-10 rounded-full bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center shadow-sm border border-slate-200/40 transition-all cursor-pointer"
                    title="Llamar"
                  >
                    <Phone className="w-4 h-4" />
                  </a>

                  {/* Video Button */}
                  <button 
                    onClick={() => alert("Función de videollamada próximamente disponible.")}
                    className="w-10 h-10 rounded-full bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center shadow-sm border border-slate-200/40 transition-all cursor-pointer"
                    title="Videollamada"
                  >
                    <Video className="w-4 h-4" />
                  </button>

                  {/* WhatsApp Button */}
                  <a 
                    href={activeTeamDetails.whatsapp_url || "https://wa.me/5493804000000"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-white hover:bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm border border-slate-200/40 transition-all cursor-pointer"
                    title="WhatsApp Chat"
                  >
                    <svg className="w-4.5 h-4.5 fill-current text-[#25D366]" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.003 5.324 5.328 0 11.94 0c3.202.001 6.212 1.248 8.477 3.517 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.618-5.33 11.942-11.942 11.942-2.01-.001-3.987-.504-5.748-1.46L0 24zm6.59-4.846c1.6.95 3.488 1.449 5.348 1.451 5.424 0 9.835-4.41 9.839-9.834.002-2.628-1.021-5.1-2.881-6.958-1.859-1.858-4.332-2.88-6.962-2.882-5.422 0-9.83 4.41-9.835 9.836-.001 1.87.49 3.698 1.42 5.3l-.933 3.406 3.493-.916zm11.23-5.263c-.3-.149-1.771-.875-2.043-.974-.271-.099-.469-.149-.665.15-.197.299-.762.974-.934 1.171-.172.197-.344.223-.644.074-.3-.149-1.27-.468-2.42-1.493-.895-.798-1.5-1.785-1.676-2.083-.176-.299-.019-.46.13-.609.135-.134.3-.349.449-.523.15-.174.2-.299.3-.498.1-.199.05-.374-.025-.523-.075-.149-.665-1.603-.91-2.193-.24-.576-.482-.498-.665-.508-.172-.007-.37-.008-.568-.008-.198 0-.52.074-.792.373-.272.299-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.771-.724 2.022-1.424.252-.699.252-1.299.177-1.424-.075-.124-.272-.199-.572-.349z" />
                    </svg>
                  </a>
                </div>
              </div>

              {/* White bottom card containing stats */}
              <div className="bg-white rounded-[24px] p-4 shadow-sm border border-slate-200/30 flex items-center justify-between text-center">
                <div className="flex-1">
                  <div className="flex justify-center text-[#1e4e6d] mb-1">
                    <Clock className="w-4 h-4" />
                  </div>
                  <p className="text-[13px] font-bold text-slate-800">10 Años</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-0.5">Experiencia</p>
                </div>
                <div className="h-8 w-[1px] bg-slate-100" />
                <div className="flex-1">
                  <div className="flex justify-center text-[#1e4e6d] mb-1">
                    <Users className="w-4 h-4" />
                  </div>
                  <p className="text-[13px] font-bold text-slate-800">+150</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-0.5">Atletas</p>
                </div>
                <div className="h-8 w-[1px] bg-slate-100" />
                <div className="flex-1">
                  <div className="flex justify-center text-[#1e4e6d] mb-1">
                    <Star className="w-4 h-4 fill-amber-400 stroke-amber-400" />
                  </div>
                  <p className="text-[13px] font-bold text-slate-800">4.9</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-0.5">Opiniones</p>
                </div>
              </div>

              {/* Sports list section */}
              <div className="bg-white/40 rounded-[20px] p-3.5 border border-white/40 space-y-2 text-left">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Footprints className="w-3.5 h-3.5 text-slate-500" />
                  Especialidades del Equipo
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {['Trail Running', 'Ultra Trail', 'Ruta / Calle', 'Funcional'].map((sport) => (
                    <span 
                      key={sport} 
                      className="bg-white/80 border border-slate-200/50 text-slate-700 px-2.5 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1e4e6d]" />
                      {sport}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
