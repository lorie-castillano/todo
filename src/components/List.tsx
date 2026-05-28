import { memo } from 'react'
import type { ReactNode, Key } from 'react'

// --- Generic List Component ---
//
// A fully reusable, type-safe list renderer. Works with ANY item type.
// TypeScript infers T from the `items` prop, so renderItem receives
// the correct type automatically.
//
// Example usage:
//   <List
//     items={todos}
//     keyExtractor={(todo) => todo.id}
//     renderItem={(todo, index) => <TodoItem todo={todo} />}
//   />
//
//   <List
//     items={users}
//     keyExtractor={(user) => user.id}
//     renderItem={(user) => <UserCard user={user} />}
//   />
//
// The `T` type parameter is inferred from `items`. No explicit type
// annotation needed at the call site in most cases.

interface ListProps<T> {
  /** Array of items to render. Type T is inferred from this prop. */
  items: T[]
  /** Function that returns a unique React key for each item. */
  keyExtractor: (item: T, index: number) => Key
  /** Render function for each item. Receives the item and its index. */
  renderItem: (item: T, index: number) => ReactNode
  /** Optional CSS class for the container <ul>. */
  className?: string
  /** Optional CSS class for each <li> wrapper. */
  itemClassName?: string
  /** Optional empty state when items.length === 0. */
  emptyComponent?: ReactNode
  /** ARIA role for accessibility. Defaults to 'list'. */
  role?: string
  /** ARIA label for screen readers. */
  'aria-label'?: string
}

// We use `function` declaration with explicit generic parameter so
// TypeScript can properly infer T at the call site. Arrow functions
// with generics require the trailing comma trick: `<T,>() => ...`
// which is confusing to read. The function declaration is clearer.
function ListInner<T>({
  items,
  keyExtractor,
  renderItem,
  className,
  itemClassName,
  emptyComponent,
  role = 'list',
  'aria-label': ariaLabel,
}: ListProps<T>): ReactNode {
  // Early return for empty state — keeps the render path clean.
  if (items.length === 0 && emptyComponent) {
    return <div role="status">{emptyComponent}</div>
  }

  return (
    <ul className={className} role={role} aria-label={ariaLabel}>
      {items.map((item, index) => (
        <li key={keyExtractor(item, index)} className={itemClassName}>
          {renderItem(item, index)}
        </li>
      ))}
    </ul>
  )
}

// --- Memoized Version ---
//
// React.memo can't directly wrap a generic component because the generic
// type parameter is lost. We use a type assertion to preserve the
// generic signature while still getting memoization.
//
// The memoization is shallow: it only re-renders if `items` reference
// changes (which is correct for immutable data patterns).

export const List = memo(ListInner) as <T>(props: ListProps<T>) => ReactNode

// Note: `keyExtractors` and `isListItemOfType` have been moved to
// `./keyExtractors.ts` to satisfy the react-refresh/only-export-components
// rule (component files should only export components for HMR to work).
//
// `AnimatedList` (Framer Motion variant) has been moved to `./AnimatedList.tsx`
// for the same reason — it is a separate component export.
