"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Navbar from "@/components/Navbar"
import { 
  getAthleteByEmail, 
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
  Payment
} from "@/lib/db"

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<Athlete | null>(null)
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [team, setTeam] = useState<Team | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [activeTab, setActiveTab] = useState<"equipo" | "solicitudes" | "atletas" | "pagos" | "aptos" | "historial">("equipo")
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null)
  const [modalType, setModalType] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [teamForm, setTeamForm] = useState({ description: "", training_days: "", coach: "", instructions: "", location: "" })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      router.push("/")
      return
    }

    const athlete = await getAthleteByEmail(user.email)
    if (!athlete || athlete.role !== "admin") {
      router.push("/dashboard")
      return
    }

    setCurrentUser(athlete)
    const allAthletes = await getAllAthletes()
    setAthletes(allAthletes)

    if (athlete.team_id) {
      const teamData = await getTeamById(athlete.team_id)
      if (teamData) {
        setTeam(teamData)
        setTeamForm({
          description: teamData.description || "",
          training_days: teamData.training_days || "",
          coach: teamData.coach || "",
          instructions: teamData.instructions || "",
          location: teamData.location || ""
        })
      }
    }

    const paymentHistory = await getPaymentHistory()
    setPayments(paymentHistory)
    setLoading(false)
  }

  const pendingSolicitudes = athletes.filter(a => a.team_status === "pendiente")
  const activeMembers = athletes.filter(a => a.team_status === "activo")
  const pendingAptos = athletes.filter(a => a.apto_medico_status === "pendiente_verificacion")
  const pendingPagos = athletes.filter(a => a.payment_status === "Pendiente_Verificacion")

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
    if (!confirm("Registrar pago manual en efectivo?")) return
    await updateAthletePaymentStatus(athlete.email, "Pagado")
    await addPaymentRecord(athlete.email, athlete.name || "Sin nombre", 17000, "Efectivo/Manual")
    await loadData()
  }

  async function handleExpelAthlete(athlete: Athlete) {
    if (!confirm("Dar de baja a este atleta del equipo?")) return
    await updateAthleteTeamStatus(athlete.email, null)
    await loadData()
  }

  async function handleSaveTeam() {
    if (!team) return
    await updateTeam(team.id, teamForm)
    await loadData()
    alert("Equipo actualizado correctamente")
  }

  function getPaymentBadge(status: string | null | undefined) {
    const styles: Record<string, string> = {
      "Pagado": "bg-success/20 text-success",
      "Pendiente_Pago": "bg-warning/20 text-warning",
      "Pendiente_Verificacion": "bg-primary/20 text-primary",
      "Vencido": "bg-destructive/20 text-destructive"
    }
    const labels: Record<string, string> = {
      "Pagado": "Pagado",
      "Pendiente_Pago": "Pendiente",
      "Pendiente_Verificacion": "En revision",
      "Vencido": "Vencido"
    }
    return (
      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${styles[status || ""] || "bg-muted text-muted-foreground"}`}>
        {labels[status || ""] || status || "Sin estado"}
      </span>
    )
  }

  function getAptoBadge(status: string | null | undefined) {
    const styles: Record<string, string> = {
      "vigente": "bg-success/20 text-success",
      "pendiente_verificacion": "bg-primary/20 text-primary",
      "rechazado": "bg-destructive/20 text-destructive",
      "no_entregado": "bg-muted text-muted-foreground"
    }
    const labels: Record<string, string> = {
      "vigente": "Vigente",
      "pendiente_verificacion": "En revision",
      "rechazado": "Rechazado",
      "no_entregado": "No entregado"
    }
    return (
      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${styles[status || ""] || "bg-muted text-muted-foreground"}`}>
        {labels[status || ""] || status || "Sin estado"}
      </span>
    )
  }

  if (loading) {
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
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Dias de entrenamiento</label>
                <input
                  type="text"
                  value={teamForm.training_days}
                  onChange={(e) => setTeamForm({ ...teamForm, training_days: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Instrucciones</label>
                <textarea
                  value={teamForm.instructions}
                  onChange={(e) => setTeamForm({ ...teamForm, instructions: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
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
          <div className="space-y-4">
            {pendingSolicitudes.length === 0 ? (
              <div className="bg-card rounded-xl p-8 text-center border border-border">
                <p className="text-muted-foreground">No hay solicitudes pendientes</p>
              </div>
            ) : (
              pendingSolicitudes.map(athlete => (
                <div key={athlete.id} className="bg-card rounded-xl p-6 border border-border">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h3 className="font-semibold text-foreground">{athlete.name || "Sin nombre"}</h3>
                      <p className="text-sm text-muted-foreground">{athlete.email}</p>
                      {athlete.dni && <p className="text-sm text-muted-foreground">DNI: {athlete.dni}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptSolicitud(athlete)}
                        className="px-4 py-2 bg-success text-success-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                      >
                        Aceptar
                      </button>
                      <button
                        onClick={() => handleRejectSolicitud(athlete)}
                        className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Atletas Tab */}
        {activeTab === "atletas" && (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Atleta</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-foreground">DNI</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Cuota</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Apto</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {activeMembers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No hay atletas activos
                      </td>
                    </tr>
                  ) : (
                    activeMembers.map(athlete => (
                      <tr key={athlete.id}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{athlete.name || "Sin nombre"}</p>
                          <p className="text-xs text-muted-foreground">{athlete.email}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">{athlete.dni || "-"}</td>
                        <td className="px-4 py-3">{getPaymentBadge(athlete.payment_status)}</td>
                        <td className="px-4 py-3">{getAptoBadge(athlete.apto_medico_status)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-2 justify-end">
                            {athlete.payment_status !== "Pagado" && athlete.payment_status !== "Pendiente_Verificacion" && (
                              <button
                                onClick={() => handleManualPayment(athlete)}
                                className="px-3 py-1 bg-success text-success-foreground rounded text-xs hover:opacity-90"
                              >
                                Pago manual
                              </button>
                            )}
                            <button
                              onClick={() => handleExpelAthlete(athlete)}
                              className="px-3 py-1 bg-destructive text-destructive-foreground rounded text-xs hover:opacity-90"
                            >
                              Dar de baja
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagos Tab */}
        {activeTab === "pagos" && (
          <div className="space-y-4">
            {pendingPagos.length === 0 ? (
              <div className="bg-card rounded-xl p-8 text-center border border-border">
                <p className="text-muted-foreground">No hay comprobantes de pago pendientes de revision</p>
              </div>
            ) : (
              pendingPagos.map(athlete => (
                <div key={athlete.id} className="bg-card rounded-xl p-6 border border-border">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h3 className="font-semibold text-foreground">{athlete.name || "Sin nombre"}</h3>
                      <p className="text-sm text-muted-foreground">{athlete.email}</p>
                      <p className="text-sm text-muted-foreground">Metodo: {athlete.payment_method || "No especificado"}</p>
                      {athlete.payment_receipt_url && (
                        <a href={`/api/storage/receipts?filename=${athlete.payment_receipt_url}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                          Ver comprobante
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprovePago(athlete)}
                        className="px-4 py-2 bg-success text-success-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={() => { setSelectedAthlete(athlete); setModalType("rejectPago") }}
                        className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Aptos Tab */}
        {activeTab === "aptos" && (
          <div className="space-y-4">
            {pendingAptos.length === 0 ? (
              <div className="bg-card rounded-xl p-8 text-center border border-border">
                <p className="text-muted-foreground">No hay aptos medicos pendientes de revision</p>
              </div>
            ) : (
              pendingAptos.map(athlete => (
                <div key={athlete.id} className="bg-card rounded-xl p-6 border border-border">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h3 className="font-semibold text-foreground">{athlete.name || "Sin nombre"}</h3>
                      <p className="text-sm text-muted-foreground">{athlete.email}</p>
                      {athlete.apto_medico_url && (
                        <a href={`/api/storage/medical-certs?filename=${athlete.apto_medico_url}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                          Ver documento
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveApto(athlete)}
                        className="px-4 py-2 bg-success text-success-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={() => { setSelectedAthlete(athlete); setModalType("rejectApto") }}
                        className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Historial Tab */}
        {activeTab === "historial" && (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Fecha</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Atleta</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Monto</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Metodo</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No hay pagos registrados
                      </td>
                    </tr>
                  ) : (
                    payments.map(payment => (
                      <tr key={payment.id}>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {new Date(payment.created_at).toLocaleDateString("es-AR")}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">{payment.athlete_name}</td>
                        <td className="px-4 py-3 text-sm text-foreground">${payment.amount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{payment.method}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                            payment.status === "aprobado" 
                              ? "bg-success/20 text-success" 
                              : "bg-destructive/20 text-destructive"
                          }`}>
                            {payment.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
      </main>
    </div>
  )
}
