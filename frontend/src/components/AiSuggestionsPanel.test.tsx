import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { AiSuggestionsPanel } from './AiSuggestionsPanel'

// Tests for the beta AI suggestions panel (userList-gated feature).

describe('AiSuggestionsPanel', () => {
  it('renders the beta heading and a list of suggestions', () => {
    render(<AiSuggestionsPanel todos={[{ text: 'existing task' }]} onAdd={vi.fn()} />)

    expect(screen.getByRole('heading', { name: /ai suggestions/i })).toBeInTheDocument()
    expect(screen.getByText(/beta/i)).toBeInTheDocument()
    // At least one suggestion with an Add button.
    expect(screen.getAllByRole('button', { name: /add/i }).length).toBeGreaterThan(0)
  })

  it('calls onAdd with the suggestion text when "Add" is clicked', () => {
    const onAdd = vi.fn()
    render(<AiSuggestionsPanel todos={[{ text: 'existing task' }]} onAdd={onAdd} />)

    const firstItem = screen.getByRole('list').querySelector('li')!
    const suggestionText = firstItem.querySelector('span')!.textContent!
    fireEvent.click(within(firstItem).getByRole('button', { name: /add/i }))

    expect(onAdd).toHaveBeenCalledWith(suggestionText)
  })

  it('shows onboarding starters when there are no todos', () => {
    render(<AiSuggestionsPanel todos={[]} onAdd={vi.fn()} />)
    expect(screen.getByText(/add your first todo/i)).toBeInTheDocument()
  })

  it('rotates suggestions when Refresh is clicked', () => {
    render(<AiSuggestionsPanel todos={[{ text: 'existing task' }]} onAdd={vi.fn()} />)

    const before = screen
      .getByRole('list')
      .textContent

    fireEvent.click(screen.getByRole('button', { name: /refresh/i }))

    const after = screen.getByRole('list').textContent
    expect(after).not.toBe(before)
  })
})
