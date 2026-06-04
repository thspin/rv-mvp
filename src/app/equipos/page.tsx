'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUserAsync, getTeamsAsync, joinTeamAsync, Team, Athlete } from '@/lib/db';
import Navbar from '@/components/Navbar';
import { MapPin, Users, Calendar, MessageSquare, ArrowRight, Search } from 'lucide-react';

export default function EquiposPage() {
  const router = useRouter();
  const [user, setUser] = useState<Athlete | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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
    const confirm_ = window.confirm('¿Deseas enviar tu solicitud de ingreso a este equipo?');
    if (confirm_) {
      await joinTeamAsync(user.email, teamId);
      alert('Solicitud enviada con exito. El coordinador revisara tu postulacion.');
      loadData();
    }
  };

  const filteredTeams = teams.filter(team => 
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse text-slate-600">Cargando...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Explorar Equipos</h1>
          <p className="text-slate-600">Encuentra tu equipo de montana ideal y solicita tu ingreso.</p>
        </div>

        {/* SEARCH */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o ubicacion..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-full text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
            />
          </div>
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
                    {team.whatsapp_url && (
                      <a
                        href={team.whatsapp_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Grupo de WhatsApp
                      </a>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="px-6 pb-6">
                    {isActive ? (
                      <div className="w-full py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-sm font-semibold text-center">
                        Eres miembro activo
                      </div>
                    ) : isPending ? (
                      <div className="w-full py-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-sm font-semibold text-center">
                        Solicitud pendiente
                      </div>
                    ) : user.team_id ? (
                      <div className="w-full py-3 bg-slate-100 text-slate-500 border border-slate-200 rounded-full text-sm font-medium text-center">
                        Ya perteneces a otro equipo
                      </div>
                    ) : (
                      <button
                        onClick={() => handleJoinTeam(team.id)}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-semibold shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all duration-150 cursor-pointer flex items-center justify-center gap-2"
                      >
                        Solicitar Ingreso
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
