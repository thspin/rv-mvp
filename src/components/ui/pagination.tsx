'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}

function buildPageRange(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const range: (number | 'ellipsis')[] = []
  const add = (v: number | 'ellipsis') => range.push(v)
  add(1)
  if (current > 4) add('ellipsis')
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) add(i)
  if (current < total - 3) add('ellipsis')
  if (total > 1) add(total)
  return range
}

export function Pagination({ page, pageSize, total, onPageChange, className }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const end = Math.min(safePage * pageSize, total)

  if (total === 0) {
    return (
      <div className={cn('flex items-center justify-between text-xs text-muted-foreground py-3', className)}>
        <span>Sin resultados</span>
      </div>
    )
  }

  const pages = buildPageRange(safePage, totalPages)
  const canPrev = safePage > 1
  const canNext = safePage < totalPages

  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3', className)}>
      <p className="text-xs text-muted-foreground">
        Mostrando <span className="font-semibold text-foreground">{start}-{end}</span> de{' '}
        <span className="font-semibold text-foreground">{total}</span>
      </p>

      <nav className="flex items-center gap-1" aria-label="Paginacion">
        <button
          type="button"
          onClick={() => canPrev && onPageChange(safePage - 1)}
          disabled={!canPrev}
          className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-border bg-card text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors cursor-pointer"
          aria-label="Pagina anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {pages.map((p, idx) =>
          p === 'ellipsis' ? (
            <span key={`e-${idx}`} className="px-1 text-xs text-muted-foreground">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === safePage ? 'page' : undefined}
              className={cn(
                'h-8 min-w-8 px-2.5 inline-flex items-center justify-center rounded-lg text-xs font-semibold transition-colors cursor-pointer',
                p === safePage
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-card text-foreground hover:bg-muted',
              )}
            >
              {p}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => canNext && onPageChange(safePage + 1)}
          disabled={!canNext}
          className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-border bg-card text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors cursor-pointer"
          aria-label="Pagina siguiente"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </nav>
    </div>
  );
}
