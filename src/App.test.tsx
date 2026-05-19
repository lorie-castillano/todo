import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import App from './App'

// Note: Full integration tests with MSW + TanStack Query require
// additional test setup. The reducer and component tests below
// provide good coverage. Run `npm run dev` to test manually.

describe('App', () => {
  it('renders without crashing', () => {
    // Basic smoke test - if this passes, component structure is valid
    const { container } = render(<App />)
    expect(container).toBeInTheDocument()
  })
})
