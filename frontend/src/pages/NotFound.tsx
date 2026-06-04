// NotFound — 404 page for unknown routes
//
// When a user navigates to a non-existent route,
// we show a friendly error with navigation options.

import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-gray-300 dark:text-gray-700 mb-4">
          404
        </h1>
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
          Page not found
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          ← Back to todos
        </Link>
      </div>
    </div>
  )
}
