// FilterNav — URL-driven filtering with React Router
//
// Instead of local state for filtering, we use the URL.
// Benefits:
// - Bookmarkable filter states (/active, /completed)
// - Browser back/forward works naturally
// - Shareable links to specific views

import { NavLink } from 'react-router-dom'
import { memo } from 'react'

type FilterType = 'all' | 'active' | 'completed'

interface FilterNavProps {
  counts: {
    all: number
    active: number
    completed: number
  }
}

const filters: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
]

function FilterNavImpl({ counts }: FilterNavProps) {
  return (
    <nav className="flex gap-1 sm:gap-2" aria-label="Filter todos">
      {filters.map(({ key, label }) => (
        <NavLink
          key={key}
          to={key === 'all' ? '/' : `/${key}`}
          className={({ isActive }) =>
            `px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-md transition-colors ${
              isActive
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`
          }
          end={key === 'all'} // "end" ensures exact match for root path
        >
          {label}
          <span className="ml-1 text-gray-400 dark:text-gray-500">
            ({counts[key]})
          </span>
        </NavLink>
      ))}
    </nav>
  )
}

export const FilterNav = memo(FilterNavImpl)
