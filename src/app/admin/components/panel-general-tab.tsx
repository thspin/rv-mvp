"use client"

import { ActivityLog, Athlete, Team } from "@/lib/db"
import {
  UserPlus,
  CreditCard,
  Stethoscope,
  History,
  Bell,
  UserCircle,
  Building2,
  Sparkles,
} from "lucide-react"

interface PanelGeneralTabProps {
  team: Team | null
  athletes: Athlete[]
  activityLogs: ActivityLog[]
}

interface FeatureItem {
  icon: React.ElementType
  title: string
  description: string
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Ahora"
  if (diffMins < 60) return `Hace ${diffMins}m`
  if (diffHours < 24) return `Hace ${diffHours}h`
  if (diffDays < 7) return `Hace ${diffDays}d`
  return date.toLocaleDateString("es-AR", { day: "numeric", month: "short" })
}

function getCategoryColor(category: string): string {
  switch (category) {
    case "Solicitud": return "bg-blue-500/10 text-blue-600 dark:text-blue-400"
    case "Atleta": return "bg-purple-500/10 text-purple-600 dark:text-purple-400"
    case "Pago": return "bg-green-500/10 text-green-600 dark:text-green-400"
    case "Apto Medico": return "bg-orange-500/10 text-orange-600 dark:text-orange-400"
    default: return "bg-muted text-muted-foreground"
  }
}

export function PanelGeneralTab({ team, athletes, activityLogs }: PanelGeneralTabProps) {
  const activeMembers = athletes.filter(a => a.team_status === "activo")
  const pendingRequests = athletes.filter(a => a.team_status === "pendiente")
  const paidCount = athletes.filter(a => a.payment_status === "Pagado").length
  const vigentesCount = athletes.filter(a => a.apto_medico_status === "vigente").length
  const recentLogs = activityLogs.slice(0, 5)

  const features: FeatureItem[] = [
    { icon: UserPlus,    title: "Gestion de Solicitudes",  description: "Acepta o rechaza solicitudes de atletas para unirse al equipo" },
    { icon: CreditCard,  title: "Validacion de Pagos",     description: "Revisa comprobantes y registra pagos de suscripciones" },
    { icon: Stethoscope, title: "Aptos Medicos",           description: "Gestiona certificados medicos con fechas de vencimiento" },
    { icon: Bell,        title: "Notificaciones",          description: "Notifica a atletas sobre pagos, aptos y actualizaciones" },
    { icon: History,     title: "Historial de Actividad",  description: "Registro completo de todas las acciones realizadas" },
    { icon: UserCircle,  title: "Perfiles de Atletas",     description: "Gestion de datos personales y documentacion" },
    { icon: Building2,   title: "Directorio de Equipos",   description: "Los atletas pueden explorar y solicitar unirse" },
  ]

  return (
    <div className="space-y-6">
      {/* Bienvenida + KPIs en una sola card aplanada */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Bienvenido a tu Panel de Control</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Gestiona tu equipo de forma eficiente con todas las herramientas que necesitas en un solo lugar.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border border border-border rounded-xl bg-card">
          <div className="p-4">
            <p className="text-2xl font-bold text-foreground">{activeMembers.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Atletas activos</p>
          </div>
          <div className="p-4">
            <p className="text-2xl font-bold text-foreground">{pendingRequests.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Solicitudes</p>
          </div>
          <div className="p-4">
            <p className="text-2xl font-bold text-foreground">{paidCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Pagos al dia</p>
          </div>
          <div className="p-4">
            <p className="text-2xl font-bold text-foreground">{vigentesCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Aptos vigentes</p>
          </div>
        </div>
      </section>

      {/* Actividad Reciente */}
      {recentLogs.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" />
            Actividad Reciente
          </h3>
          <div className="border border-border rounded-xl bg-card divide-y divide-border">
            {recentLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 px-4 py-3">
                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${getCategoryColor(log.category)}`}>
                  {log.category}
                </span>
                <span className="text-xs text-foreground flex-1 truncate">{log.details}</span>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {formatTimeAgo(log.created_at)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Funcionalidades - lista plana, sin cards anidadas */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Funcionalidades Disponibles
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Todas las herramientas que necesitas para gestionar tu equipo
        </p>
        <div className="border border-border rounded-xl bg-card divide-y divide-border">
          {features.map((f) => {
            const Icon = f.icon
            return (
              <div key={f.title} className="flex items-start gap-3 px-4 py-3">
                <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight">{f.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
