'use client';

import { useState, useMemo, useEffect } from 'react';
import { ActivityLog } from '@/lib/db';
import { Pagination } from '@/components/ui/pagination';

interface HistorialTabProps {
  logs: ActivityLog[];
}

const PAGE_SIZE = 25

export function HistorialTab({ logs }: HistorialTabProps) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(logs.length / PAGE_SIZE))
  const paginated = useMemo(
    () => logs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [logs, page],
  )

  useEffect(() => {
    if (page > totalPages) setPage(1)
  }, [logs.length, page, totalPages])

  const categoryConfig: Record<ActivityLog['category'], { label: string; className: string }> = {
    solicitudes: { label: 'Solicitud', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
    atletas: { label: 'Atleta', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
    pagos: { label: 'Pago', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
    aptos_medicos: { label: 'Apto Médico', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  };

  return (
    <div className="space-y-3">
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Fecha</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Categoría</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Acción</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Atleta</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    {logs.length === 0
                      ? 'No hay acciones registradas en el historial'
                      : 'No hay resultados en esta pagina'}
                  </td>
                </tr>
              ) : (
                paginated.map(log => {
                  const category = categoryConfig[log.category] || { label: log.category, className: 'bg-muted text-muted-foreground' };
                  return (
                    <tr key={log.id}>
                      <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString("es-AR", {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full ${category.className}`}>
                          {category.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-foreground capitalize">
                        {log.action}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        <div>
                          <p className="font-medium">{log.athlete_name || "-"}</p>
                          {log.athlete_email && <p className="text-xs text-muted-foreground">{log.athlete_email}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {log.details || "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      {logs.length > PAGE_SIZE && (
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={logs.length}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
