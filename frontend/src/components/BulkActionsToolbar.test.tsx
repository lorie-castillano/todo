import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BulkActionsToolbar } from './BulkActionsToolbar'

// Tests for the feature-flagged bulk-actions toolbar (Lesson 5.5). We verify
// rendering, disabled states tied to counts, and that clicks invoke handlers.

describe('BulkActionsToolbar', () => {
  const setup = (overrides: Partial<Parameters<typeof BulkActionsToolbar>[0]> = {}) => {
    const props = {
      activeCount: 2,
      completedCount: 1,
      onCompleteAll: vi.fn(),
      onClearCompleted: vi.fn(),
      ...overrides,
    }
    render(<BulkActionsToolbar {...props} />)
    return props
  }

  it('renders both actions with their counts', () => {
    setup({ activeCount: 3, completedCount: 2 })
    expect(screen.getByRole('button', { name: /complete all \(3\)/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /clear completed \(2\)/i })).toBeInTheDocument()
  })

  it('disables "Complete all" when there are no active todos', () => {
    setup({ activeCount: 0, completedCount: 2 })
    expect(screen.getByRole('button', { name: /complete all/i })).toBeDisabled()
  })

  it('disables "Clear completed" when there are no completed todos', () => {
    setup({ activeCount: 2, completedCount: 0 })
    expect(screen.getByRole('button', { name: /clear completed/i })).toBeDisabled()
  })

  it('calls onCompleteAll when "Complete all" is clicked', () => {
    const props = setup({ activeCount: 2 })
    fireEvent.click(screen.getByRole('button', { name: /complete all/i }))
    expect(props.onCompleteAll).toHaveBeenCalledOnce()
  })

  it('calls onClearCompleted when "Clear completed" is clicked', () => {
    const props = setup({ completedCount: 1 })
    fireEvent.click(screen.getByRole('button', { name: /clear completed/i }))
    expect(props.onClearCompleted).toHaveBeenCalledOnce()
  })
})
