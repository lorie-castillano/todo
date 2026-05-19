import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { seedDatabase } from './mocks/db'

describe('App (Integration with Mock API)', () => {
  beforeEach(() => {
    seedDatabase()
  })

  it('renders without crashing', async () => {
    render(<App />)
    // Just check the header renders
    expect(await screen.findByText(/todo/i)).toBeInTheDocument()
  })

  it('toggles dark mode', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Wait for header to render
    await screen.findByText(/todo/i)

    // Check dark mode toggle works
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    await user.click(screen.getByRole('button', { name: /toggle dark mode/i }))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
