// Router configuration for the Todo app
//
// Routes:
// /          → All todos
// /active    → Active (incomplete) todos
// /completed → Completed todos
// /*         → 404 Not Found

import { createBrowserRouter, Outlet } from 'react-router-dom'
import { Suspense } from 'react'
import { NotFound } from './pages/NotFound'
import { ThemeProvider } from './ThemeContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from './lib/queryClient'

// Lazy load the main App component for code splitting
const App = () => import('./App').then((m) => ({ Component: m.default }))

// Root layout with providers — wraps all routes
function RootLayout() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
          <ReactQueryDevtools initialIsOpen={false} />
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        lazy: App,
      },
      {
        path: 'active',
        lazy: App,
      },
      {
        path: 'completed',
        lazy: App,
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
])
