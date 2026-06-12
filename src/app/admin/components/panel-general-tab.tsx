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

interface FeatureCardProps {
  icon: React.ElementType
  title: string
  description: string
}

function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <div className="relative bg-card/50 border border-border rounded-xl p-4 hover:border-primary/30 hover:bg-card transition-all duration-200 group">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-foreground truncate">{title}</h4>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wide rounded-full">
              <Sparkles className="w-3 h-3" />
              Nuevo
            </span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
        </div>
      </div>
    </div>
  )
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
  const recentLogs = activityLogs.slice(0, 5)

  const featuresNew: FeatureCardProps[] = [
    {
      icon: UserPlus,
      title: "Gestion de Solicitudes",
      description: "Acepta o rechaza solicitudes de atletas para unirse al equipo",
    },
    {
      icon: CreditCard,
      title: "Validacion de Pagos",
      description: "Revisa comprobantes y registra pagos de suscripciones",
    },
    {
      icon: Stethoscope,
      title: "Aptos Medicos",
      description: "Gestiona certificados medicos con fechas de vencimiento",
    },
    {
      icon: Bell,
      title: "Sistema de Notificaciones",
      description: "Notifica a atletas sobre pagos, aptos y actualizaciones",
    },
    {
      icon: History,
      title: "Historial de Actividad",
      description: "Registro completo de todas las acciones realizadas",
    },
    {
      icon: UserCircle,
      title: "Perfiles de Atletas",
      description: "Gestion de datos personales y documentacion",
    },
    {
      icon: Building2,
      title: "Directorio de Equipos",
      description: "Los atletas pueden explorar y solicitar unirse",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl p-6 border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Bienvenido a tu Panel de Control</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Gestiona tu equipo de forma eficiente con todas las herramientas que necesitas en un solo lugar.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-primary">{activeMembers.length}</p>
            <p className="text-xs text-muted-foreground">Atletas activos</p>
          </div>
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{pendingRequests.length}</p>
            <p className="text-xs text-muted-foreground">Solicitudes</p>
          </div>
          <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {athletes.filter(a => a.payment_status === "Pagado").length}
            </p>
            <p className="text-xs text-muted-foreground">Pagos al dia</p>
          </div>
          <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {athletes.filter(a => a.apto_medico_status === "vigente").length}
            </p>
            <p className="text-xs text-muted-foreground">Aptos vigentes</p>
          </div>
        </div>
      </div>

      {recentLogs.length > 0 && (
        <div className="bg-card rounded-xl p-6 border border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" />
            Actividad Reciente
          </h3>
          <div className="space-y-2">
            {recentLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
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
        </div>
      )}

      <div className="bg-card rounded-xl p-6 border border-border">
        <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Funcionalidades Disponibles
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Todas las herramientas que necesitas para gestionar tu equipo
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {featuresNew.map((feature, idx) => (
            <FeatureCard key={idx} {...feature} />
          ))}
        </div>
      </div>
    </div>
  )
}
