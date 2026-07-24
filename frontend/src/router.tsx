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
import { LoginPage } from './pages/LoginPage'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ProtectedRoute } from './components/ProtectedRoute'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from './lib/queryClient'
import { useThemeDomSync } from './stores/themeStore'
import { config } from './lib/config'
import { reportBoundaryError } from './lib/errorReporter'
import { AuthProvider } from './context/AuthContext'

// Lazy load the main App component, wrapped in the auth guard.
// React Router's `lazy` expects a { Component } object, so we compose the
// guard around the resolved component for code splitting + protection.
const ProtectedApp = () =>
  import('./App').then((m) => ({
    Component: () => (
      <ProtectedRoute>
        <m.default />
      </ProtectedRoute>
    ),
  }))

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
        <AuthProvider>
          <ThemeSync />
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
          {config.features.devtools && <ReactQueryDevtools initialIsOpen={false} />}
        </AuthProvider>
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
        path: 'login',
        element: <LoginPage />,
      },
      {
        index: true,
        lazy: ProtectedApp,
      },
      {
        path: 'active',
        lazy: ProtectedApp,
      },
      {
        path: 'completed',
        lazy: ProtectedApp,
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
])
