// LiveRegion — announces dynamic updates to screen readers
//
// Screen readers don't automatically announce visual changes.
// This component provides polite (non-interrupting) announcements
// for actions like adding, completing, or deleting todos.
//
// Uses Tailwind's `sr-only` class which applies:
// position: absolute; width: 1px; height: 1px; etc.
// to hide visually but keep accessible to screen readers.

import { memo } from 'react'

interface LiveRegionProps {
  message: string
}

function LiveRegionImpl({ message }: LiveRegionProps) {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  )
}

export const LiveRegion = memo(LiveRegionImpl)
