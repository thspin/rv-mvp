"use client"

import React, { createContext, useContext, useState, useCallback } from "react"
import { X, CheckCircle, AlertCircle, Info } from "lucide-react"

export type ToastType = "success" | "error" | "info"

export interface Toast {
  id: string
  title?: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastContextType {
  toast: (message: string, options?: { title?: string; type?: ToastType; duration?: number }) => void
  success: (message: string, options?: { title?: string; duration?: number }) => void
  error: (message: string, options?: { title?: string; duration?: number }) => void
  info: (message: string, options?: { title?: string; duration?: number }) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    (message: string, options?: { title?: string; type?: ToastType; duration?: number }) => {
      const id = Math.random().toString(36).substring(2, 9)
      const type = options?.type || "info"
      const title = options?.title
      const duration = options?.duration || 4000

      setToasts((prev) => [...prev, { id, title, message, type, duration }])

      setTimeout(() => {
        removeToast(id)
      }, duration)
    },
    [removeToast]
  )

  const success = useCallback((message: string, options?: { title?: string; duration?: number }) => {
    addToast(message, { ...options, type: "success" })
  }, [addToast])

  const error = useCallback((message: string, options?: { title?: string; duration?: number }) => {
    addToast(message, { ...options, type: "error" })
  }, [addToast])

  const info = useCallback((message: string, options?: { title?: string; duration?: number }) => {
    addToast(message, { ...options, type: "info" })
  }, [addToast])

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, info }}>
      {children}
      
      {/* Estilos locales autocontenidos para animaciones premium */}
      <style>{`
        @keyframes toast-slide-in {
          0% {
            transform: translateY(1rem) scale(0.96);
            opacity: 0;
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        .toast-animate-in {
          animation: toast-slide-in 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => {
          let accentBarColor = "bg-blue-500"
          let iconBgColor = "bg-blue-50 dark:bg-blue-950/40"
          let iconColor = "text-blue-500 dark:text-blue-400"
          let Icon = Info
          let typeTitle = t.title || "Aviso"

          if (t.type === "success") {
            accentBarColor = "bg-emerald-500"
            iconBgColor = "bg-emerald-50 dark:bg-emerald-950/40"
            iconColor = "text-emerald-500 dark:text-emerald-400"
            Icon = CheckCircle
            typeTitle = t.title || "Éxito"
          } else if (t.type === "error") {
            accentBarColor = "bg-[#990000]"
            iconBgColor = "bg-red-50 dark:bg-red-950/40"
            iconColor = "text-[#990000] dark:text-red-400"
            Icon = AlertCircle
            typeTitle = t.title || "Error"
          }

          return (
            <div
              key={t.id}
              className="toast-animate-in flex items-stretch bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] pointer-events-auto overflow-hidden transition-all duration-300 w-full"
            >
              {/* Barra de Acento Izquierda */}
              <div className={`w-1.5 shrink-0 ${accentBarColor}`} />
              
              {/* Contenido Interno */}
              <div className="flex-1 p-4 flex gap-3 items-start">
                <div className={`shrink-0 p-1.5 rounded-lg ${iconBgColor}`}>
                  <Icon className={`w-4 h-4 ${iconColor}`} />
                </div>
                
                <div className="flex-1 min-w-0 pr-2">
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-none mb-1">
                    {typeTitle}
                  </h4>
                  <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    {t.message}
                  </p>
                </div>
                
                <button
                  onClick={() => removeToast(t.id)}
                  className="shrink-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 p-1 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}
