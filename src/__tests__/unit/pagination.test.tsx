import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Pagination } from '@/components/ui/pagination'

const PREV_LABEL = /Pagina anterior/i
const NEXT_LABEL = /Pagina siguiente/i

describe('Pagination', () => {
  it('renders nothing actionable when total is 0', () => {
    render(<Pagination page={1} pageSize={20} total={0} onPageChange={() => {}} />)
    expect(screen.getByText(/sin resultados/i)).toBeInTheDocument()
  })

  it('shows the count range', () => {
    render(<Pagination page={1} pageSize={20} total={45} onPageChange={() => {}} />)
    expect(screen.getByText(/1-20/)).toBeInTheDocument()
    expect(screen.getByText(/45/)).toBeInTheDocument()
  })

  it('clamps page to totalPages and shows single page when total < pageSize', () => {
    render(<Pagination page={5} pageSize={20} total={5} onPageChange={() => {}} />)
    expect(screen.getByText(/1-5/)).toBeInTheDocument()
  })

  it('disables prev on first page', () => {
    render(<Pagination page={1} pageSize={20} total={100} onPageChange={() => {}} />)
    const prev = screen.getByLabelText(PREV_LABEL)
    expect(prev).toBeDisabled()
  })

  it('disables next on last page', () => {
    render(<Pagination page={5} pageSize={20} total={100} onPageChange={() => {}} />)
    const next = screen.getByLabelText(NEXT_LABEL)
    expect(next).toBeDisabled()
  })

  it('fires onPageChange when clicking a page number', () => {
    const onPageChange = vi.fn()
    render(<Pagination page={2} pageSize={20} total={100} onPageChange={onPageChange} />)
    fireEvent.click(screen.getByRole('button', { name: '3' }))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('fires onPageChange when clicking next', () => {
    const onPageChange = vi.fn()
    render(<Pagination page={2} pageSize={20} total={100} onPageChange={onPageChange} />)
    fireEvent.click(screen.getByLabelText(NEXT_LABEL))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('fires onPageChange when clicking prev', () => {
    const onPageChange = vi.fn()
    render(<Pagination page={3} pageSize={20} total={100} onPageChange={onPageChange} />)
    fireEvent.click(screen.getByLabelText(PREV_LABEL))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('does not fire onPageChange when prev/next disabled', () => {
    const onPageChange = vi.fn()
    render(<Pagination page={1} pageSize={20} total={100} onPageChange={onPageChange} />)
    const prev = screen.getByLabelText(PREV_LABEL) as HTMLButtonElement
    expect(prev.disabled).toBe(true)
    fireEvent.click(prev)
    expect(onPageChange).not.toHaveBeenCalled()
  })

  it('renders ellipsis for large page counts', () => {
    render(<Pagination page={5} pageSize={20} total={500} onPageChange={() => {}} />)
    const ellipses = screen.getAllByText(/\u2026/)
    expect(ellipses.length).toBeGreaterThanOrEqual(1)
  })

  it('marks current page with aria-current', () => {
    render(<Pagination page={3} pageSize={20} total={100} onPageChange={() => {}} />)
    const current = screen.getByRole('button', { name: '3' })
    expect(current).toHaveAttribute('aria-current', 'page')
  })
})
