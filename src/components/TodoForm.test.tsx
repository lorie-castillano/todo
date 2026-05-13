import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TodoForm } from './TodoForm'
import type { Todo } from '../types'

// --- Component Tests ---
//
// Pattern: Test from the USER's perspective.
// - Find elements by their role/label (not by class or ID)
// - Simulate user interactions (type, click)
// - Assert what the user would SEE (visible text, presence/absence)
//
// We use `vi.fn()` to create mock callbacks so we can verify they
// were called with the right arguments.

describe('TodoForm', () => {
  it('renders the input and submit button', () => {
    render(<TodoForm todos={[]} onAdd={vi.fn()} />)

    expect(screen.getByPlaceholderText(/what needs to be done/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument()
  })

  it('calls onAdd with trimmed text when submitting', async () => {
    const user = userEvent.setup()
    const handleAdd = vi.fn()

    render(<TodoForm todos={[]} onAdd={handleAdd} />)

    const input = screen.getByPlaceholderText(/what needs to be done/i)
    await user.type(input, '  Buy milk  ')
    await user.click(screen.getByRole('button', { name: /add/i }))

    expect(handleAdd).toHaveBeenCalledOnce()
    expect(handleAdd).toHaveBeenCalledWith('Buy milk')
  })

  it('clears the input after successful submission (optimistic UI)', async () => {
    const user = userEvent.setup()

    render(<TodoForm todos={[]} onAdd={vi.fn()} />)

    const input = screen.getByPlaceholderText(/what needs to be done/i) as HTMLInputElement
    await user.type(input, 'New todo')
    await user.click(screen.getByRole('button', { name: /add/i }))

    expect(input.value).toBe('')
  })

  it('shows error and does not call onAdd when input is empty', async () => {
    const user = userEvent.setup()
    const handleAdd = vi.fn()

    render(<TodoForm todos={[]} onAdd={handleAdd} />)

    await user.click(screen.getByRole('button', { name: /add/i }))

    expect(screen.getByText(/cannot be empty/i)).toBeInTheDocument()
    expect(handleAdd).not.toHaveBeenCalled()
  })

  it('shows error and does not call onAdd when todo is duplicate', async () => {
    const user = userEvent.setup()
    const handleAdd = vi.fn()
    const todos: Todo[] = [{ id: 1, text: 'Buy milk', completed: false }]

    render(<TodoForm todos={todos} onAdd={handleAdd} />)

    await user.type(screen.getByPlaceholderText(/what needs to be done/i), 'buy milk')
    await user.click(screen.getByRole('button', { name: /add/i }))

    expect(screen.getByText(/already exists/i)).toBeInTheDocument()
    expect(handleAdd).not.toHaveBeenCalled()
  })

  it('clears error when user starts typing again', async () => {
    const user = userEvent.setup()

    render(<TodoForm todos={[]} onAdd={vi.fn()} />)

    // Trigger error
    await user.click(screen.getByRole('button', { name: /add/i }))
    expect(screen.getByText(/cannot be empty/i)).toBeInTheDocument()

    // Type something
    await user.type(screen.getByPlaceholderText(/what needs to be done/i), 'X')

    expect(screen.queryByText(/cannot be empty/i)).not.toBeInTheDocument()
  })
})
