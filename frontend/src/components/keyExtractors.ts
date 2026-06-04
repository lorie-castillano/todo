// --- Key Extractors for Generic Lists ---
//
// Pre-built key extractors with generic constraints for common ID patterns.
// Moved to a separate file so React Fast Refresh works correctly with the
// List component (the `react-refresh/only-export-components` rule requires
// component files to export only components).

export const keyExtractors = {
  /** Use when items have an `id: string | number` property. */
  byId: <T extends { id: string | number }>(item: T): string | number => item.id,

  /** Use when items have a `_id: string` property (MongoDB style). */
  byUnderscoreId: <T extends { _id: string }>(item: T): string => item._id,

  /** Use when items have a `key: string | number` property. */
  byKey: <T extends { key: string | number }>(item: T): string | number => item.key,

  /** Fallback: use array index (not recommended for dynamic lists). */
  byIndex: (_item: unknown, index: number): number => index,
} as const

// The `as const` makes the object deeply readonly and preserves literal
// types. This is the recommended pattern for stable utility collections.

// --- Type Predicate Helper ---
//
// When consuming List, you often need to narrow types. This helper
// demonstrates the pattern. It accepts a user-defined type guard and
// returns a typed result.
export function isListItemOfType<T>(
  item: unknown,
  predicate: (value: unknown) => value is T
): item is T {
  return predicate(item)
}
