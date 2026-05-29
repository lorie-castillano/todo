// Router configuration for the Todo app
//
// Routes:
// /          → All todos
// /active    → Active (incomplete) todos
// /completed → Completed todos
// /*         → 404 Not Found
//
// Note: This file intentionally exports both components and the `router`
// config object. Fast Refresh requires component-only files, but a router
// config is the canonical exception. HMR works for child routes regardless.

/* eslint-disable react-refresh/only-export-components */

import { createBrowserRouter, Outlet } from 'react-router-dom'
import { Suspense } from 'react'
import { NotFound } from './pages/NotFound'
import { ErrorBoundary } from './components/ErrorBoundary'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from './lib/queryClient'
import { useThemeDomSync } from './stores/themeStore'
import { config } from './lib/config'
import { reportBoundaryError } from './lib/errorReporter'

// Lazy load the main App component for code splitting
const App = () => import('./App').then((m) => ({ Component: m.default }))

// ThemeSync is a tiny side-effect-only component. It calls `useThemeDomSync`
// which adds/removes the `dark` class on <html> when the store changes.
// We could call the hook directly in RootLayout, but extracting keeps the
// side effect named and easy to find when debugging.
function ThemeSync(): null {
  useThemeDomSync()
  return null
}

// Root layout with providers — wraps all routes.
// Note: No <ThemeProvider> anymore. The Zustand theme store is global
// and accessible from any component without a Provider.
function RootLayout() {
  return (
    <ErrorBoundary onError={reportBoundaryError}>
      <QueryClientProvider client={queryClient}>
        <ThemeSync />
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
        {config.features.devtools && <ReactQueryDevtools initialIsOpen={false} />}
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
