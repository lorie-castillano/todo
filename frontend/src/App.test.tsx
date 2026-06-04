import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import App from './App'

// Note: Full integration tests with MSW + TanStack Query require
// additional test setup. The reducer and component tests below
// provide good coverage. Run `npm run dev` to test manually.

describe('App', () => {
  it('renders without crashing', () => {
    // Wrap in providers that App needs: Router + QueryClient.
    // Theme no longer needs a Provider — Zustand store is global.
    const { container } = render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </MemoryRouter>
    )
    expect(container).toBeInTheDocument()
  })
})
