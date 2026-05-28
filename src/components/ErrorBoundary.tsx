import { Component, type ErrorInfo, type ReactNode } from 'react'

// Error Boundary — the React way to handle errors in the component tree.
//
// Unlike try/catch which works for synchronous code, Error Boundaries catch:
// - Rendering errors
// - Lifecycle method errors
// - Constructor errors
//
// They do NOT catch:
// - Event handlers (use try/catch there)
// - Async code (use error states or TanStack Query's error handling)
// - Errors in the Error Boundary itself

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so next render shows fallback
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to error reporting service
    console.error('ErrorBoundary caught error:', error.message)
    console.error('Component stack:', errorInfo.componentStack)
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="p-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-red-600 dark:text-red-300 mb-4">
            An unexpected error occurred in the application.
          </p>
          <details className="text-xs text-red-500 dark:text-red-400 cursor-pointer">
            <summary className="font-medium">Error details</summary>
            <pre className="mt-2 p-2 bg-red-100 dark:bg-red-900/40 rounded overflow-auto">
              {this.state.error?.message}
            </pre>
          </details>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors"
          >
            Reload page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
