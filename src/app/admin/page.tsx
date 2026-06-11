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
import type { TrainingShift, ShiftInstructions } from "@/lib/db-types"
import { parseTrainingDays, parseInstructions } from "@/lib/db-types"
import { useAuthGuard } from "@/hooks/useAuthGuard"
import { SolicitudesTab } from "./components/solicitudes-tab"
import { AtletasTab } from "./components/atletas-tab"
import { PagosTab } from "./components/pagos-tab"
import { AptosTab } from "./components/aptos-tab"
import { HistorialTab } from "./components/historial-tab"

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuthGuard(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [team, setTeam] = useState<Team | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [activeTab, setActiveTab] = useState<"equipo" | "solicitudes" | "atletas" | "pagos" | "aptos" | "historial">("equipo")
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

  const parsedShifts = parseTrainingDays(teamForm.training_days);
  const parsedInstructions = parseInstructions(teamForm.instructions);

  const handleConvertToStructured = () => {
    const defaultShifts: TrainingShift[] = [
      { id: 'turno-siesta', name: 'Turno Siesta', days: 'Lunes a Jueves', time: '14:30 hs', location: 'Parque de la Ciudad (Lugar A)' },
      { id: 'turno-tarde-1', name: 'Turno Tarde/Noche - 1º Turno', days: 'Lunes a Jueves', time: '19:30 hs', location: 'Pista de Atletismo (Lugar B)' },
      { id: 'turno-tarde-2', name: 'Turno Tarde/Noche - 2º Turno', days: 'Lunes a Jueves', time: '20:30 hs', location: 'Pista de Atletismo (Lugar B)' }
    ];
    const defaultInstructions: ShiftInstructions = {
      general: 'Traer mochila de hidratación y ropa cómoda para todas las sesiones.',
      shifts: {
        'turno-siesta': 'Haremos pasadas de ritmo aeróbico en el circuito de Parque. Traer gorra y protector solar.',
        'turno-tarde-1': 'Pasadas de velocidad: 10x400m en la pista. Traer linterna frontal obligatoria.',
        'turno-tarde-2': 'Pasadas de velocidad: 8x400m en la pista. Traer linterna frontal obligatoria.'
      }
    };
    setTeamForm({
      ...teamForm,
      training_days: JSON.stringify(defaultShifts),
      instructions: JSON.stringify(defaultInstructions)
    });
  };

  const handleUpdateShift = (index: number, updatedFields: Partial<TrainingShift>) => {
    if (!parsedShifts) return;
    const newShifts = [...parsedShifts];
    const oldId = newShifts[index].id;
    newShifts[index] = { ...newShifts[index], ...updatedFields } as TrainingShift;
    
    // Si cambia el id del turno, actualizar también las instrucciones correspondientes
    if (updatedFields.id && oldId !== updatedFields.id) {
      const newId = updatedFields.id;
      const currentInst = parsedInstructions || { shifts: {} };
      const newShiftsInst = { ...currentInst.shifts };
      if (oldId in newShiftsInst) {
        newShiftsInst[newId] = newShiftsInst[oldId];
        delete newShiftsInst[oldId];
      }
      setTeamForm({
        ...teamForm,
        training_days: JSON.stringify(newShifts),
        instructions: JSON.stringify({
          ...currentInst,
          shifts: newShiftsInst
        })
      });
      return;
    }
    
    setTeamForm({
      ...teamForm,
      training_days: JSON.stringify(newShifts)
    });
  };

  const handleAddShift = () => {
    const newShifts = parsedShifts ? [...parsedShifts] : [];
    const newId = `turno-${crypto.randomUUID().slice(0, 8)}`;
    newShifts.push({
      id: newId,
      name: 'Nuevo Turno',
      days: 'Lunes a Jueves',
      time: '19:00 hs',
      location: teamForm.location || 'Sede Principal'
    });
    
    const currentInst = parsedInstructions || { shifts: {} };
    const newShiftsInst = { ...currentInst.shifts, [newId]: '' };
    setTeamForm({
      ...teamForm,
      training_days: JSON.stringify(newShifts),
      instructions: JSON.stringify({
        ...currentInst,
        shifts: newShiftsInst
      })
    });
  };

  const handleRemoveShift = (index: number) => {
    if (!parsedShifts) return;
    const shiftToRemove = parsedShifts[index];
    const newShifts = parsedShifts.filter((_, i) => i !== index);
    
    const currentInst = parsedInstructions || { shifts: {} };
    const newShiftsInst = { ...currentInst.shifts };
    delete newShiftsInst[shiftToRemove.id];
    
    setTeamForm({
      ...teamForm,
      training_days: JSON.stringify(newShifts),
      instructions: JSON.stringify({
        ...currentInst,
        shifts: newShiftsInst
      })
    });
  };

  const handleUpdateShiftInstruction = (shiftId: string, text: string) => {
    const currentInst = parsedInstructions || { shifts: {} };
    const newShiftsInst = { ...currentInst.shifts, [shiftId]: text };
    setTeamForm({
      ...teamForm,
      instructions: JSON.stringify({
        ...currentInst,
        shifts: newShiftsInst
      })
    });
  };

  const handleUpdateGeneralInstruction = (text: string) => {
    const currentInst = parsedInstructions || { shifts: {} };
    setTeamForm({
      ...teamForm,
      instructions: JSON.stringify({
        ...currentInst,
        general: text
      })
    });
  };

  async function handleSaveTeam() {
    if (!team) return
    await updateTeam(team.id, teamForm)
    await loadData()
    alert("Equipo actualizado correctamente")
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
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">Panel de Administracion</h1>
        <p className="text-muted-foreground mb-6">{team?.name}</p>

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

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-border pb-4">
          {[
            { id: "equipo", label: "Mi Equipo", count: 0 },
            { id: "solicitudes", label: "Solicitudes", count: pendingSolicitudes.length },
            { id: "atletas", label: "Atletas", count: activeMembers.length },
            { id: "pagos", label: "Pagos", count: pendingPagos.length },
            { id: "aptos", label: "Aptos Medicos", count: pendingAptos.length },
            { id: "historial", label: "Historial", count: 0 }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-foreground/10">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

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
                  <label className="block text-sm font-medium text-foreground mb-1">Logo URL</label>
                  <input
                    type="text"
                    value={teamForm.logo_url}
                    onChange={(e) => setTeamForm({ ...teamForm, logo_url: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Descripcion</label>
                <textarea
                  value={teamForm.description}
                  onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Coach</label>
                  <input
                    type="text"
                    value={teamForm.coach}
                    onChange={(e) => setTeamForm({ ...teamForm, coach: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Ubicacion</label>
                  <input
                    type="text"
                    value={teamForm.location}
                    onChange={(e) => setTeamForm({ ...teamForm, location: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="border border-border rounded-xl p-4 bg-muted/40 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-bold text-foreground">Días y Horarios de Entrenamiento (Turnos)</label>
                  {parsedShifts ? (
                    <button
                      type="button"
                      onClick={handleAddShift}
                      className="px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      + Agregar Turno
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConvertToStructured}
                      className="px-3 py-1 bg-amber-650 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Estandarizar a Turnos Estructurados
                    </button>
                  )}
                </div>

                {parsedShifts ? (
                  <div className="space-y-4">
                    {parsedShifts.map((shift, idx) => (
                      <div key={shift.id || idx} className="bg-card p-4 rounded-xl border border-border space-y-3 relative text-left">
                        <button
                          type="button"
                          onClick={() => handleRemoveShift(idx)}
                          className="absolute top-2 right-2 text-destructive hover:text-destructive/80 text-xs font-semibold cursor-pointer"
                        >
                          Eliminar
                        </button>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Nombre del Turno</label>
                            <input
                              type="text"
                              value={shift.name}
                              onChange={(e) => handleUpdateShift(idx, { name: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                              placeholder="Ej: Turno Siesta"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Días</label>
                            <input
                              type="text"
                              value={shift.days}
                              onChange={(e) => handleUpdateShift(idx, { days: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                              placeholder="Ej: Lunes a Jueves"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Horario</label>
                            <input
                              type="text"
                              value={shift.time}
                              onChange={(e) => handleUpdateShift(idx, { time: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                              placeholder="Ej: 14:30 hs"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Lugar / Sede</label>
                            <input
                              type="text"
                              value={shift.location}
                              onChange={(e) => handleUpdateShift(idx, { location: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                              placeholder="Ej: Sede Principal"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={teamForm.training_days}
                      onChange={(e) => setTeamForm({ ...teamForm, training_days: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Ej: Lunes y Miércoles 19:00 hs"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Actualmente se muestra como texto libre. Hacé clic en el botón de arriba para estructurarlo de manera estandarizada y clara.
                    </p>
                  </div>
                )}
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

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Especialidades del equipo</label>
                <div className="flex flex-wrap gap-2">
                  {['Trail Running', 'Ultra Trail', 'Ruta / Calle', 'Funcional', 'Trekking', 'Aventura', 'Crossfit', 'Ciclismo'].map((spec) => {
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

              <div className="border border-border rounded-xl p-4 bg-muted/40 space-y-4">
                <label className="block text-sm font-bold text-foreground">Instrucciones y Planificación Diaria</label>
                
                {parsedShifts ? (
                  <div className="space-y-4">
                    <div className="text-left">
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Avisos Generales (aplica a todos los turnos)</label>
                      <textarea
                        value={parsedInstructions?.general || ""}
                        onChange={(e) => handleUpdateGeneralInstruction(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                        rows={2}
                        placeholder="Ej: Traer hidratación para todas las sesiones. Avisos de cuota, etc."
                      />
                    </div>
                    {parsedShifts.map((shift) => (
                      <div key={shift.id} className="space-y-1 text-left">
                        <label className="block text-xs font-semibold text-foreground">
                          Rutina Diaria para <span className="text-primary font-bold">{shift.name}</span> <span className="text-muted-foreground font-normal">({shift.time} - {shift.location})</span>
                        </label>
                        <textarea
                          value={parsedInstructions?.shifts[shift.id] || ""}
                          onChange={(e) => handleUpdateShiftInstruction(shift.id, e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs font-mono"
                          rows={3}
                          placeholder={`Escribe la rutina específica para el ${shift.name}...`}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-left">
                    <textarea
                      value={teamForm.instructions}
                      onChange={(e) => setTeamForm({ ...teamForm, instructions: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={3}
                      placeholder="Escribe las instrucciones generales aquí..."
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Entrenamientos Especiales (Fondos de fines de semana)</label>
                <textarea
                  value={teamForm.special_instructions}
                  onChange={(e) => setTeamForm({ ...teamForm, special_instructions: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                  placeholder="Instrucciones para fondos especiales del fin de semana..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Google Maps (URL o iframe de compartir)</label>
                <input
                  type="text"
                  value={teamForm.google_maps_url}
                  onChange={(e) => setTeamForm({ ...teamForm, google_maps_url: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="https://www.google.com/maps/embed?... o link directo"
                />
              </div>
              <button
                onClick={handleSaveTeam}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                Guardar cambios
              </button>
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
            onManualPayment={handleManualPayment}
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
      </main>
    </div>
  )
}
