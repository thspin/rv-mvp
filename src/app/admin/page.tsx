"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Navbar from "@/components/Navbar"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { 
  getAllAthletes, 
  getTeamById, 
  updateTeam,
  updateAthleteTeamStatus,
  updateAthleteAptoStatus,
  updateAthletePaymentStatus,
  addPaymentRecord,
  getPaymentHistory,
  Athlete,
  Team,
  Payment,
} from "@/lib/db"
import { useAuthGuard } from "@/hooks/useAuthGuard"
import { useToast } from "@/components/ui/toast"
import { SolicitudesTab } from "./components/solicitudes-tab"
import { AtletasTab } from "./components/atletas-tab"
import { PagosTab } from "./components/pagos-tab"
import { AptosTab } from "./components/aptos-tab"
import { HistorialTab } from "./components/historial-tab"
import {
  Users,
  UserPlus,
  CreditCard,
  Stethoscope,
  History,
  Settings,
  LayoutDashboard,
  ArrowLeft,
} from "lucide-react"

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuthGuard(false)
  const { success, error } = useToast()
  const [dataLoading, setDataLoading] = useState(true)
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [team, setTeam] = useState<Team | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [activeTab, setActiveTab] = useState<"general" | "equipo" | "solicitudes" | "atletas" | "pagos" | "aptos" | "historial">("general")
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null)
  const [modalType, setModalType] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [teamForm, setTeamForm] = useState({ name: "", logo_url: "", description: "", training_days: "", coach: "", instructions: "", location: "", founded_date: "", specialties: "", special_instructions: "", google_maps_url: "" })
  const [paymentConfirmOpen, setPaymentConfirmOpen] = useState(false)
  const [expelConfirmOpen, setExpelConfirmOpen] = useState(false)
  const [pendingActionAthlete, setPendingActionAthlete] = useState<Athlete | null>(null)
  const router = useRouter()

  async function loadData() {
    if (!user) return

    if (user.role !== "admin") {
      router.push("/dashboard")
      return
    }

    const allAthletes = await getAllAthletes()
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
          google_maps_url: teamData.google_maps_url || ""
        })
      }
    }

    const paymentHistory = await getPaymentHistory()
    setPayments(paymentHistory)
    setDataLoading(false)
  }

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const pendingSolicitudes = athletes.filter(a => a.team_status === "pendiente")
  const activeMembers = athletes.filter(a => a.team_status === "activo")
  const pendingAptos = athletes.filter(a => a.apto_medico_status === "pendiente_verificacion")
  const pendingPagos = athletes.filter(a => a.payment_status === "Pendiente_Verificacion")

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

  async function handleAcceptSolicitud(athlete: Athlete) {
    await updateAthleteTeamStatus(athlete.email, "activo")
    await loadData()
  }

  async function handleRejectSolicitud(athlete: Athlete) {
    await updateAthleteTeamStatus(athlete.email, null)
    await loadData()
  }

  async function handleApproveApto(athlete: Athlete) {
    const vencimiento = new Date()
    vencimiento.setFullYear(vencimiento.getFullYear() + 1)
    await updateAthleteAptoStatus(athlete.email, "vigente", vencimiento.toISOString())
    setModalType(null)
    setSelectedAthlete(null)
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

  async function handleApprovePago(athlete: Athlete) {
    await updateAthletePaymentStatus(athlete.email, "Pagado")
    await addPaymentRecord(athlete.email, athlete.name || "Sin nombre", 17000, athlete.payment_method || "No especificado")
    setModalType(null)
    setSelectedAthlete(null)
    await loadData()
  }

  async function handleRejectPago() {
    if (!selectedAthlete) return
    await updateAthletePaymentStatus(selectedAthlete.email, "Pendiente_Pago", rejectReason)
    setModalType(null)
    setSelectedAthlete(null)
    setRejectReason("")
    await loadData()
  }

  async function handleManualPayment(athlete: Athlete) {
    setPendingActionAthlete(athlete)
    setPaymentConfirmOpen(true)
  }

  async function confirmManualPayment() {
    if (!pendingActionAthlete) return
    await updateAthletePaymentStatus(pendingActionAthlete.email, "Pagado")
    await addPaymentRecord(pendingActionAthlete.email, pendingActionAthlete.name || "Sin nombre", 17000, "Efectivo/Manual")
    setPendingActionAthlete(null)
    await loadData()
  }

  async function handleExpelAthlete(athlete: Athlete) {
    setPendingActionAthlete(athlete)
    setExpelConfirmOpen(true)
  }

  async function confirmExpelAthlete() {
    if (!pendingActionAthlete) return
    await updateAthleteTeamStatus(pendingActionAthlete.email, null)
    setPendingActionAthlete(null)
    await loadData()
  }


  async function handleSaveTeam() {
    if (!team) return
    try {
      await updateTeam(team.id, teamForm)
      await loadData()
      success("Equipo actualizado correctamente")
    } catch (err) {
      error("Error al actualizar el equipo")
    }
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
          <button
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-card hover:bg-muted text-foreground border border-border rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer self-start sm:self-center"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al Dashboard
          </button>
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
              { id: "solicitudes", label: "Solicitudes", count: pendingSolicitudes.length, icon: UserPlus },
              { id: "atletas", label: "Atletas", count: activeMembers.length, icon: Users },
              { id: "pagos", label: "Pagos", count: pendingPagos.length, icon: CreditCard },
              { id: "aptos", label: "Aptos Medicos", count: pendingAptos.length, icon: Stethoscope },
              { id: "historial", label: "Historial", count: 0, icon: History }
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
            <h2 className="text-xl font-semibold text-foreground mb-6">{team.name}</h2>
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

              <div className="flex justify-end pt-2">
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
            activeMembers={activeMembers}
            onExpel={handleExpelAthlete}
          />
        )}

        {/* Pagos Tab */}
        {activeTab === "pagos" && (
          <PagosTab
            pendingPagos={pendingPagos}
            onApprove={handleApprovePago}
            onReject={(athlete) => { setSelectedAthlete(athlete); setModalType("rejectPago") }}
          />
        )}

        {/* Aptos Tab */}
        {activeTab === "aptos" && (
          <AptosTab
            pendingAptos={pendingAptos}
            onApprove={handleApproveApto}
            onReject={(athlete) => { setSelectedAthlete(athlete); setModalType("rejectApto") }}
          />
        )}

        {/* Historial Tab */}
        {activeTab === "historial" && (
          <HistorialTab payments={payments} />
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
                  className="flex-1 py-2 bg-muted text-foreground rounded-xl font-medium hover:opacity-90 transition-opacity"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRejectApto}
                  className="flex-1 py-2 bg-destructive text-destructive-foreground rounded-xl font-medium hover:opacity-90 transition-opacity"
                >
                  Confirmar rechazo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de rechazo pago */}
        {modalType === "rejectPago" && selectedAthlete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-xl p-6 w-full max-w-md border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">Rechazar comprobante de pago</h3>
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
                  className="flex-1 py-2 bg-muted text-foreground rounded-xl font-medium hover:opacity-90 transition-opacity"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRejectPago}
                  className="flex-1 py-2 bg-destructive text-destructive-foreground rounded-xl font-medium hover:opacity-90 transition-opacity"
                >
                  Confirmar rechazo
                </button>
              </div>
            </div>
          </div>
        )}

        <ConfirmDialog
          open={paymentConfirmOpen}
          onOpenChange={(open) => { if (!open) setPendingActionAthlete(null); setPaymentConfirmOpen(open); }}
          title="Registrar pago manual"
          description={`¿Registrar pago en efectivo de ${pendingActionAthlete?.name || 'este atleta'}?`}
          confirmLabel="Sí, registrar pago"
          variant="default"
          onConfirm={confirmManualPayment}
        />

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
