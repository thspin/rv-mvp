"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Navbar from "@/components/Navbar"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  getAllAthletes,
  getTeamById,
  updateTeam,
  updateAthleteTeamStatus,
  updateAthleteAptoStatus,
  approvePaymentAsync,
  rejectPaymentAsync,
  condonePaymentAsync,
  getActivityLogsAsync,
  getPaginatedAthletesByTeamStatusAsync,
  type PaginatedAthletes,
  Athlete,
  Team,
  ActivityLog,
} from "@/lib/db"
import { getPricingConfig } from "@/lib/settings"
import { useAuthGuard } from "@/hooks/useAuthGuard"
import { useToast } from "@/components/ui/toast"
import { SolicitudesTab } from "./components/solicitudes-tab"
import { AtletasTab } from "./components/atletas-tab"
import { PagosTab } from "./components/pagos-tab"
import { AptosTab } from "./components/aptos-tab"
import { HistorialTab } from "./components/historial-tab"
import { ConfiguracionTab } from "./components/configuracion-tab"
import TrainingSchedule from "@/components/TrainingSchedule"
import SessionForm from "@/components/SessionForm"
import {
  Users,
  UserPlus,
  CreditCard,
  Stethoscope,
  History,
  Settings,
  LayoutDashboard,
  ArrowLeft,
  X,
  Calendar,
} from "lucide-react"

import { Archivo } from "next/font/google"

const archivoFont = Archivo({ subsets: ["latin"], weight: ["900"] })

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  description: string;
}

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuthGuard(false)
  const { success, error } = useToast()
  const [dataLoading, setDataLoading] = useState(true)
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [team, setTeam] = useState<Team | null>(null)
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [activeTab, setActiveTab] = useState<"general" | "equipo" | "entrenamientos" | "solicitudes" | "atletas" | "pagos" | "aptos" | "historial" | "configuracion">("general")
  const [isSessionFormOpen, setIsSessionFormOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<any | null>(null)
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null)
  const [modalType, setModalType] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [approveExpiration, setApproveExpiration] = useState("")
  const [approvePreset, setApprovePreset] = useState("6meses")
  const [teamForm, setTeamForm] = useState({ 
    name: "", 
    logo_url: "", 
    description: "", 
    training_days: "", 
    coach: "", 
    instructions: "", 
    location: "", 
    founded_date: "", 
    specialties: "", 
    special_instructions: "", 
    google_maps_url: "",
    subscription_plans: "",
    bank_cbu: "",
    bank_alias: "",
  })
  const [expelConfirmOpen, setExpelConfirmOpen] = useState(false)
  const [pendingActionAthlete, setPendingActionAthlete] = useState<Athlete | null>(null)
  const [atletasPage, setAtletasPage] = useState(1)
  const [atletasPageSize] = useState(20)
  const [atletasData, setAtletasData] = useState<PaginatedAthletes>({ athletes: [], total: 0, page: 1, pageSize: 20 })
  const router = useRouter()

  async function loadData() {
    if (!user) return

    if (user.role !== "admin") {
      router.push("/dashboard")
      return
    }

    const [allAthletes, pricing] = await Promise.all([
      getAllAthletes(),
      getPricingConfig().catch(() => ({ amount: 17000, currency: 'ARS' as const, dueDay: 1 })),
    ])
    setAthletes(allAthletes)

    if (user.team_id) {
      const teamData = await getTeamById(user.team_id)
      if (teamData) {
        setTeam(teamData)
        setTeamForm({
          name: teamData.name || "",
          logo_url: teamData.logo_url || "",
          description: teamData.description || "",
          training_days: teamData.training_days || "",
          coach: teamData.coach || "",
          instructions: teamData.instructions || "",
          location: teamData.location || "",
          founded_date: teamData.founded_date || "",
          specialties: teamData.specialties || "",
          special_instructions: teamData.special_instructions || "",
          google_maps_url: teamData.google_maps_url || "",
          subscription_plans: teamData.subscription_plans || JSON.stringify([
            { id: "individual", name: "Individual", price: pricing.amount, description: "Acceso completo para un atleta individual" },
            { id: "familiar", name: "Familiar", price: Math.round(pricing.amount * 1.7), description: "Acceso para el grupo familiar" }
          ]),
          bank_cbu: teamData.bank_cbu || "",
          bank_alias: teamData.bank_alias || "",
        })
      }
    }

    const logs = await getActivityLogsAsync()
    setActivityLogs(logs)
    setDataLoading(false)
  }

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const loadAtletasPage = useCallback(async (page: number) => {
    try {
      const res = await getPaginatedAthletesByTeamStatusAsync('activo', { page, pageSize: atletasPageSize })
      setAtletasData(res)
    } catch (err) {
      console.error('Error loading atletas page:', err)
      setAtletasData({ athletes: [], total: 0, page, pageSize: atletasPageSize })
    }
  }, [atletasPageSize])

  useEffect(() => {
    if (user && activeTab === 'atletas') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadAtletasPage(atletasPage)
    }
  }, [user, activeTab, atletasPage, loadAtletasPage])

  const pendingSolicitudes = athletes.filter(a => a.team_status === "pendiente")
  const activeMembers = athletes.filter(a => a.team_status === "activo")
  const pendingAptos = athletes.filter(a => a.apto_medico_status === "pendiente_verificacion")
  const pendingPagos = athletes.filter(a => a.team_status === "activo" && a.payment_status !== "Pagado")

  const upcomingAptos = athletes.filter(a => {
    if (a.apto_medico_status !== "vigente" || !a.apto_medico_vencimiento) return false
    const daysLeft = Math.ceil((new Date(a.apto_medico_vencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return daysLeft <= 30 && daysLeft > 0
  })

  const expiredAptos = athletes.filter(a => a.apto_medico_status === "vencido")

  const handleToggleSpecialty = (specialty: string) => {
    const current = teamForm.specialties
      ? teamForm.specialties.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    let newList;
    if (current.includes(specialty)) {
      newList = current.filter(s => s !== specialty);
    } else {
      newList = [...current, specialty];
    }
    setTeamForm({ ...teamForm, specialties: newList.join(',') });
  };

  const plans: SubscriptionPlan[] = (() => {
    try {
      return teamForm.subscription_plans ? JSON.parse(teamForm.subscription_plans) : [];
    } catch {
      return [];
    }
  })();

  const handleAddPlan = () => {
    const newPlan: SubscriptionPlan = {
      id: crypto.randomUUID(),
      name: "Nuevo Plan",
      price: 0,
      description: "Descripción del plan"
    };
    const updatedPlans = [...plans, newPlan];
    setTeamForm({ ...teamForm, subscription_plans: JSON.stringify(updatedPlans) });
  };

  const handleUpdatePlan = (index: number, updates: Partial<SubscriptionPlan>) => {
    const updatedPlans = plans.map((p, i) => i === index ? { ...p, ...updates } : p);
    setTeamForm({ ...teamForm, subscription_plans: JSON.stringify(updatedPlans) });
  };

  const handleDeletePlan = (index: number) => {
    const updatedPlans = plans.filter((_, i) => i !== index);
    setTeamForm({ ...teamForm, subscription_plans: JSON.stringify(updatedPlans) });
  };

  async function handleAcceptSolicitud(athlete: Athlete) {
    const result = await updateAthleteTeamStatus(athlete.email, "activo")
    if (!result.success) error(result.error)
    await loadData()
  }

  async function handleRejectSolicitud(athlete: Athlete) {
    const result = await updateAthleteTeamStatus(athlete.email, null)
    if (!result.success) error(result.error)
    await loadData()
  }

  function calcExpirationFromPreset(preset: string): string {
    const d = new Date()
    switch (preset) {
      case '3meses': d.setMonth(d.getMonth() + 3); break
      case '6meses': d.setMonth(d.getMonth() + 6); break
      case '1año': d.setFullYear(d.getFullYear() + 1); break
      default: return approveExpiration
    }
    return d.toISOString().split('T')[0]
  }

  function handleOpenApproveModal(athlete: Athlete) {
    setSelectedAthlete(athlete)
    setModalType("approveApto")
    setApprovePreset("6meses")
    const d = new Date()
    d.setMonth(d.getMonth() + 6)
    setApproveExpiration(d.toISOString().split('T')[0])
  }

  function handlePresetChange(preset: string) {
    setApprovePreset(preset)
    if (preset !== "personalizado") {
      const d = new Date()
      switch (preset) {
        case '3meses': d.setMonth(d.getMonth() + 3); break
        case '6meses': d.setMonth(d.getMonth() + 6); break
        case '1año': d.setFullYear(d.getFullYear() + 1); break
      }
      setApproveExpiration(d.toISOString().split('T')[0])
    }
  }

  async function handleApproveApto() {
    if (!selectedAthlete || !approveExpiration) return
    const vencimiento = new Date(approveExpiration + 'T23:59:59')
    await updateAthleteAptoStatus(selectedAthlete.email, "vigente", vencimiento.toISOString())
    setModalType(null)
    setSelectedAthlete(null)
    setApproveExpiration("")
    setApprovePreset("6meses")
    await loadData()
  }

  async function handleRejectApto() {
    if (!selectedAthlete) return
    await updateAthleteAptoStatus(selectedAthlete.email, "rechazado", null, rejectReason)
    setModalType(null)
    setSelectedAthlete(null)
    setRejectReason("")
    await loadData()
  }

  async function handleExpelAthlete(athlete: Athlete) {
    setPendingActionAthlete(athlete)
    setExpelConfirmOpen(true)
  }

  async function confirmExpelAthlete() {
    if (!pendingActionAthlete) return
    const result = await updateAthleteTeamStatus(pendingActionAthlete.email, null)
    if (!result.success) error(result.error)
    setPendingActionAthlete(null)
    await loadData()
    await loadAtletasPage(atletasPage)
  }

  const sessionsByDow = (() => {
    try {
      return teamForm.instructions ? JSON.parse(teamForm.instructions) : { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    } catch {
      return { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    }
  })();

  async function handleSaveSession(session: any) {
    if (!team) return;
    const dow = Number(session.dow);
    const currentSessions = sessionsByDow[dow] ?? [];
    let updatedSessions;
    const exists = currentSessions.some((s: any) => s.id === session.id);
    if (exists) {
      updatedSessions = currentSessions.map((s: any) => s.id === session.id ? session : s);
    } else {
      updatedSessions = [...currentSessions, session];
    }

    let nextSessionsByDow = { ...sessionsByDow, [dow]: updatedSessions };
    if (editingSession && Number(editingSession.dow) !== dow) {
      const oldDow = Number(editingSession.dow);
      nextSessionsByDow[oldDow] = (nextSessionsByDow[oldDow] ?? []).filter((s: any) => s.id !== session.id);
    }

    const updatedInstructions = JSON.stringify(nextSessionsByDow);
    const updatedForm = { ...teamForm, instructions: updatedInstructions };
    setTeamForm(updatedForm);

    const result = await updateTeam(team.id, updatedForm);
    if (!result.success) {
      error(result.error || "Error al guardar la sesión");
      return;
    }
    setIsSessionFormOpen(false);
    setEditingSession(null);
    success("Sesión guardada correctamente");
    await loadData();
  }

  async function handleDeleteSession(sessionId: string) {
    if (!team) return;
    let nextSessionsByDow = { ...sessionsByDow };
    for (const dow in nextSessionsByDow) {
      nextSessionsByDow[Number(dow)] = (nextSessionsByDow[Number(dow)] ?? []).filter((s: any) => s.id !== sessionId);
    }

    const updatedInstructions = JSON.stringify(nextSessionsByDow);
    const updatedForm = { ...teamForm, instructions: updatedInstructions };
    setTeamForm(updatedForm);

    const result = await updateTeam(team.id, updatedForm);
    if (!result.success) {
      error(result.error || "Error al eliminar la sesión");
      return;
    }
    setIsSessionFormOpen(false);
    setEditingSession(null);
    success("Sesión eliminada correctamente");
    await loadData();
  }

  async function handleSaveTeam() {
    if (!team) return
    const result = await updateTeam(team.id, teamForm)
    if (!result.success) {
      error(result.error || "Error al actualizar el equipo")
      return
    }
    await loadData()
    success("Equipo actualizado correctamente")
  }

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">Panel de Administración</h1>
            <p className="text-muted-foreground text-sm">{team?.name}</p>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-center">
            <button
              onClick={() => router.push("/dashboard")}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-card hover:bg-muted text-foreground border border-border rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al Dashboard
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-2xl font-bold text-foreground">{activeMembers.length}</p>
            <p className="text-xs text-muted-foreground">Atletas activos</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-2xl font-bold text-foreground">{pendingSolicitudes.length}</p>
            <p className="text-xs text-muted-foreground">Solicitudes</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-2xl font-bold text-foreground">{pendingPagos.length}</p>
            <p className="text-xs text-muted-foreground">Pagos a validar</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-2xl font-bold text-foreground">{pendingAptos.length}</p>
            <p className="text-xs text-muted-foreground">Aptos a validar</p>
          </div>
        </div>

        {/* Layout de Sidebar + Contenido */}
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Sidebar Menu */}
          <aside className="w-full md:w-64 shrink-0 bg-card border border-border rounded-2xl p-4 space-y-1">
            {[
              { id: "general", label: "Panel General", count: 0, icon: LayoutDashboard },
              { id: "equipo", label: "Mi Equipo", count: 0, icon: Settings },
              { id: "entrenamientos", label: "Entrenamientos", count: 0, icon: Calendar },
              { id: "solicitudes", label: "Solicitudes", count: pendingSolicitudes.length, icon: UserPlus },
              { id: "atletas", label: "Atletas", count: activeMembers.length, icon: Users },
              { id: "pagos", label: "Pagos", count: pendingPagos.length, icon: CreditCard },
              { id: "aptos", label: "Aptos Medicos", count: pendingAptos.length, icon: Stethoscope },
              { id: "historial", label: "Historial", count: 0, icon: History },
              { id: "configuracion", label: "Configuracion", count: 0, icon: Settings }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-between cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4.5 h-4.5" />
                    <span>{tab.label}</span>
                  </div>
                  {tab.count > 0 && (
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                      activeTab === tab.id
                        ? "bg-white/20 text-white"
                        : "bg-foreground/10 text-foreground"
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </aside>

          {/* Contenido Principal */}
          <div className="flex-1 min-w-0 w-full">

          {/* Panel General Tab */}
          {activeTab === "general" && (
            <div className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold text-foreground mb-4">Panel General</h2>
              <p className="text-muted-foreground text-sm">Contenido próximamente.</p>
            </div>
          )}

          {/* Equipo Tab */}
          {activeTab === "equipo" && team && (
          <div className="bg-card rounded-xl p-6 border border-border">
            <h2 className="text-xl font-semibold text-foreground mb-6">Configuración del Equipo</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Nombre del equipo</label>
                  <input
                    type="text"
                    value={teamForm.name}
                    onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Coach / Entrenador</label>
                  <input
                    type="text"
                    value={teamForm.coach}
                    onChange={(e) => setTeamForm({ ...teamForm, coach: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Descripción</label>
                <textarea
                  value={teamForm.description}
                  onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Ubicación</label>
                  <input
                    type="text"
                    value={teamForm.location}
                    onChange={(e) => setTeamForm({ ...teamForm, location: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Fecha de creación del team</label>
                  <input
                    type="date"
                    value={teamForm.founded_date}
                    onChange={(e) => setTeamForm({ ...teamForm, founded_date: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Especialidades del equipo</label>
                <div className="flex flex-wrap gap-2">
                  {['Running', 'Trail Running', 'Ultra Trail', 'Trekking', 'Funcional', 'Ciclismo'].map((spec) => {
                    const currentSpecs = teamForm.specialties ? teamForm.specialties.split(',').map(s => s.trim()).filter(Boolean) : [];
                    const isSelected = currentSpecs.includes(spec);
                    return (
                      <button
                        type="button"
                        key={spec}
                        onClick={() => handleToggleSpecialty(spec)}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-card text-muted-foreground border-border hover:bg-muted"
                        }`}
                      >
                        {spec}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-border pt-6 mt-6">
                <h3 className="text-lg font-bold text-foreground mb-4">Datos para Transferencias Bancarias</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">CBU del Equipo</label>
                    <input
                      type="text"
                      value={teamForm.bank_cbu}
                      onChange={(e) => setTeamForm({ ...teamForm, bank_cbu: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm font-semibold"
                      placeholder="Ej. 0070012345678901234567"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Alias del Equipo</label>
                    <input
                      type="text"
                      value={teamForm.bank_alias}
                      onChange={(e) => setTeamForm({ ...teamForm, bank_alias: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm font-semibold"
                      placeholder="Ej. rv.entrenamientos.mp"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-foreground">Planes de Suscripción</h3>
                  <button
                    type="button"
                    onClick={handleAddPlan}
                    className="px-3.5 py-1.5 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    + Agregar Plan
                  </button>
                </div>
                
                <div className="space-y-4">
                  {plans.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No hay planes de suscripción creados.</p>
                  ) : (
                    plans.map((plan, idx) => (
                      <div key={plan.id || idx} className="bg-card/50 border border-border rounded-2xl p-4 space-y-3 relative group">
                        <button
                          type="button"
                          onClick={() => handleDeletePlan(idx)}
                          className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar Plan"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Nombre del Plan</label>
                            <input
                              type="text"
                              value={plan.name}
                              onChange={(e) => handleUpdatePlan(idx, { name: e.target.value })}
                              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder="Ej. Plan Individual"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Precio (ARS)</label>
                            <input
                              type="number"
                              value={plan.price}
                              onChange={(e) => handleUpdatePlan(idx, { price: Number(e.target.value) })}
                              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder="Ej. 20000"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Detalle / Qué incluye</label>
                          <textarea
                            value={plan.description}
                            onChange={(e) => handleUpdatePlan(idx, { description: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                            rows={2}
                            placeholder="Ej. Acceso a entrenamientos..."
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border mt-6">
                <button
                  onClick={handleSaveTeam}
                  className="px-6 py-2.5 bg-card hover:bg-muted text-foreground border border-border rounded-xl font-semibold text-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-sm active:scale-[0.98] cursor-pointer shadow-sm"
                >
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Entrenamientos Tab - Proximamente */}
        {activeTab === "entrenamientos" && (
          <div className="bg-card rounded-xl p-6 border border-border">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Proximamente</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                La planificacion de entrenamientos estara disponible pronto. Podras crear y gestionar sesiones semanales con horarios, ubicaciones y niveles.
              </p>
            </div>
          </div>
        )}

        {/* Solicitudes Tab */}
        {activeTab === "solicitudes" && (
          <SolicitudesTab
            pendingSolicitudes={pendingSolicitudes}
            onAccept={handleAcceptSolicitud}
            onReject={handleRejectSolicitud}
          />
        )}

        {/* Atletas Tab */}
        {activeTab === "atletas" && (
          <AtletasTab
            activeMembers={atletasData.athletes}
            page={atletasData.page}
            pageSize={atletasData.pageSize}
            total={atletasData.total}
            onPageChange={setAtletasPage}
            onExpel={handleExpelAthlete}
          />
        )}

        {/* Pagos Tab */}
        {activeTab === "pagos" && (
          <PagosTab
            pendingPagos={pendingPagos}
            onApprove={async (athlete, amount, method) => {
              const result = await approvePaymentAsync(athlete.email, athlete.name || "Sin nombre", amount, method);
              if (!result.success) {
                error(result.error);
                return;
              }
              await loadData();
            }}
            onReject={async (athlete, reason) => {
              const result = await rejectPaymentAsync(athlete.email, reason);
              if (!result.success) {
                error(result.error);
                return;
              }
              await loadData();
            }}
            onCondone={async (athlete) => {
              const result = await condonePaymentAsync(athlete.email, athlete.name || "Sin nombre");
              if (!result.success) {
                error(result.error);
                return;
              }
              await loadData();
            }}
          />
        )}

        {/* Aptos Tab */}
        {activeTab === "aptos" && (
          <AptosTab
            pendingAptos={pendingAptos}
            upcomingAptos={upcomingAptos}
            expiredAptos={expiredAptos}
            onApprove={handleOpenApproveModal}
            onReject={(athlete) => { setSelectedAthlete(athlete); setModalType("rejectApto") }}
          />
        )}

        {/* Historial Tab */}
        {activeTab === "historial" && (
          <HistorialTab logs={activityLogs} />
        )}

        {/* Configuracion Tab */}
        {activeTab === "configuracion" && (
          <ConfiguracionTab />
        )}

        {/* Modal de rechazo apto */}
        {modalType === "rejectApto" && selectedAthlete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-xl p-6 w-full max-w-md border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">Rechazar apto medico</h3>
              <p className="text-sm text-muted-foreground mb-4">Atleta: {selectedAthlete.name}</p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-1">Motivo del rechazo</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                  placeholder="Ingresa el motivo..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setModalType(null); setSelectedAthlete(null); setRejectReason("") }}
                  className="flex-1 py-2 bg-muted text-foreground rounded-xl font-medium hover:opacity-90 transition-opacity animate-in duration-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRejectApto}
                  className="flex-1 py-2 bg-destructive text-destructive-foreground rounded-xl font-medium hover:opacity-90 transition-opacity animate-in duration-200"
                >
                  Confirmar rechazo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de aprobacion apto */}
        {modalType === "approveApto" && selectedAthlete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-xl p-6 w-full max-w-md border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">Aprobar apto medico</h3>
              <p className="text-sm text-muted-foreground mb-4">Atleta: {selectedAthlete.name}</p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-2">Valido por:</label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[
                    { id: '3meses', label: '3 meses' },
                    { id: '6meses', label: '6 meses' },
                    { id: '1año', label: '1 año' },
                    { id: 'personalizado', label: 'Personalizado' },
                  ].map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => handlePresetChange(preset.id)}
                      className={`px-2 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        approvePreset === preset.id
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-foreground border-border hover:bg-muted'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-1">Fecha de vencimiento:</label>
                <input
                  type="date"
                  value={approveExpiration}
                  onChange={(e) => { setApproveExpiration(e.target.value); setApprovePreset('personalizado') }}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {selectedAthlete.apto_medico_url && (
                <a
                  href={`/api/storage/medical-certs?filename=${selectedAthlete.apto_medico_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline mb-4 block"
                >
                  Ver certificado medico
                </a>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => { setModalType(null); setSelectedAthlete(null); setApproveExpiration(""); setApprovePreset("6meses") }}
                  className="flex-1 py-2 bg-muted text-foreground rounded-xl font-medium hover:opacity-90 transition-opacity animate-in duration-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleApproveApto}
                  disabled={!approveExpiration}
                  className="flex-1 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity animate-in duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

        <ConfirmDialog
          open={expelConfirmOpen}
          onOpenChange={(open) => { if (!open) setPendingActionAthlete(null); setExpelConfirmOpen(open); }}
          title="Dar de baja del equipo"
          description={`¿Dar de baja a ${pendingActionAthlete?.name || 'este atleta'} del equipo?`}
          confirmLabel="Sí, dar de baja"
          variant="destructive"
          onConfirm={confirmExpelAthlete}
        />
          </div>
        </div>
      </main>
    </div>
  )
}
