import { describe, it, expect } from 'vitest'
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

// --- Integration Test ---
//
// Renders the FULL app and tests a complete user flow.
// No mocks — uses real localStorage, real reducer, real components.
//
// This is the highest-confidence test: if it passes, the app works.
// But it's also the slowest, so use sparingly for critical paths.

describe('App (Integration)', () => {
  it('completes a full add → complete → delete flow', async () => {
    const user = userEvent.setup()
    render(<App />)

    // --- Initial state ---
    expect(screen.getByText(/no todos yet/i)).toBeInTheDocument()
    // Footer wraps the number in a span, so we match the paragraph's textContent
    expect(screen.getByText(/items remaining/i).textContent).toMatch(/0\s+items remaining/)

    // --- ADD a todo ---
    const input = screen.getByPlaceholderText(/what needs to be done/i)
    await user.type(input, 'Buy groceries')
    await user.click(screen.getByRole('button', { name: /add/i }))

    expect(await screen.findByText('Buy groceries')).toBeInTheDocument()
    expect(screen.getByText(/item remaining/i).textContent).toMatch(/1\s+item remaining/)

    // --- ADD another todo ---
    await user.type(input, 'Walk the dog')
    await user.click(screen.getByRole('button', { name: /add/i }))

    expect(await screen.findByText('Walk the dog')).toBeInTheDocument()
    expect(screen.getByText(/items remaining/i).textContent).toMatch(/2\s+items remaining/)

    // --- COMPLETE the first todo ---
    const firstCheckbox = screen.getByRole('checkbox', {
      name: /mark "buy groceries" as complete/i,
    })
    await user.click(firstCheckbox)

    expect(firstCheckbox).toBeChecked()
    expect(screen.getByText(/item remaining/i).textContent).toMatch(/1\s+item remaining/)

    // --- CLEAR COMPLETED ---
    await user.click(screen.getByRole('button', { name: /clear completed/i }))

    // Wait for Framer Motion exit animation to finish unmounting the item
    await waitForElementToBeRemoved(() => screen.queryByText('Buy groceries'))
    expect(screen.getByText('Walk the dog')).toBeInTheDocument()
    expect(screen.getByText(/item remaining/i).textContent).toMatch(/1\s+item remaining/)

    // --- DELETE the remaining todo ---
    await user.click(screen.getByRole('button', { name: /delete todo: walk the dog/i }))

    // The element may unmount before our check, so use findByText for the empty state
    expect(await screen.findByText(/no todos yet/i)).toBeInTheDocument()
  })

  it('persists todos across remounts (localStorage)', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)

    await user.type(
      screen.getByPlaceholderText(/what needs to be done/i),
      'Persistent task'
    )
    await user.click(screen.getByRole('button', { name: /add/i }))

    expect(await screen.findByText('Persistent task')).toBeInTheDocument()

    // Unmount and remount — simulates page refresh
    unmount()
    render(<App />)

    expect(await screen.findByText('Persistent task')).toBeInTheDocument()
  })

  it('toggles dark mode and persists it', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)

    // Initially light mode — no .dark class
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    await user.click(screen.getByRole('button', { name: /toggle dark mode/i }))
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    // Remount — dark mode should persist
    unmount()
    render(<App />)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
