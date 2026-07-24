// Automated accessibility audits using axe-core.
//
// Why axe-core in tests?
// - Catches WCAG 2.1 violations automatically on every CI run
// - Covers ~57% of accessibility issues automatically (Deque's estimate)
// - The other ~43% still require manual testing (keyboard nav, screen readers)
// - Violations fail the build — regressions can't ship without being noticed
//
// What axe checks: missing alt text, insufficient color contrast, missing
// ARIA labels, unlabeled form controls, invalid ARIA roles, and ~100 more rules.

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { axe } from 'vitest-axe'
import 'vitest-axe/extend-expect'
import App from './App'
import { NotFound } from './pages/NotFound'
import { AuthProvider } from './context/AuthContext'

// Fresh QueryClient per test — no shared cache state between tests
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
}

function AppWrapper({ route = '/' }: { route?: string }) {
  return (
    <MemoryRouter initialEntries={[route]}>
      <QueryClientProvider client={makeQueryClient()}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>
  )
}

describe('Accessibility (axe-core)', () => {
  it('App — / has no axe violations', async () => {
    const { container } = render(<AppWrapper route="/" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('App — /active has no axe violations', async () => {
    const { container } = render(<AppWrapper route="/active" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('App — /completed has no axe violations', async () => {
    const { container } = render(<AppWrapper route="/completed" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('NotFound page has no axe violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
