'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUserAsync, getTeamsAsync, joinTeamAsync, leaveTeamAsync, Team, Athlete } from '@/lib/db';
import Navbar from '@/components/Navbar';
import { MapPin, Users, Calendar, ArrowRight } from 'lucide-react';
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
                  <div className="px-6 pb-6">
                    {isActive ? (
                      <div className="w-full py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-sm font-semibold text-center">
                        Eres miembro activo
                      </div>
                    ) : isPending ? (
                      <button
                        onClick={handleCancelRequest}
                        className="w-full py-3 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-full text-sm font-semibold text-center transition-all duration-150 cursor-pointer"
                      >
                        Cancelar solicitud
                      </button>
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
