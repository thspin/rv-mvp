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
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => {
          let bgColor = "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
          let textColor = "text-zinc-900 dark:text-zinc-50"
          let iconColor = "text-zinc-500"
          let Icon = Info

          if (t.type === "success") {
            bgColor = "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50"
            textColor = "text-emerald-900 dark:text-emerald-200"
            iconColor = "text-emerald-500 dark:text-emerald-400"
            Icon = CheckCircle
          } else if (t.type === "error") {
            bgColor = "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50"
            textColor = "text-red-900 dark:text-red-200"
            iconColor = "text-[#990000] dark:text-red-400"
            Icon = AlertCircle
          }

          return (
            <div
              key={t.id}
              className={`flex items-start gap-3 p-4 rounded-2xl border shadow-lg pointer-events-auto transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in duration-300 ${bgColor}`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 min-w-0">
                {t.title && <h4 className={`text-xs font-bold ${textColor} mb-0.5`}>{t.title}</h4>}
                <p className="text-xs font-medium opacity-90 leading-relaxed text-zinc-700 dark:text-zinc-300">{t.message}</p>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 p-0.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
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
