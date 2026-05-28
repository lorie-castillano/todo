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

// --- Type Predicate Helper ---
//
// When consuming List, you often need to narrow types. This helper
// demonstrates the pattern (though it's not used directly here).
// It's exported as documentation of the generic pattern.
export function isListItemOfType<T>(
  item: unknown,
  predicate: (value: unknown) => value is T
): item is T {
  return predicate(item)
}

// --- Utility: Typed Key Extractor ---
//
// Common key extractors for primitive patterns. These are typed to
// work with List<T> while providing intellisense for common cases.

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

// The `as const` makes the object deeply readonly and preserves
// literal types. Combined with `satisfies`, this is powerful for
// configuration objects. See the next lesson item for `satisfies`.

// --- AnimatedList<T> — Extended Generic Pattern ---
//
// When your list needs enter/exit animations (Framer Motion), the generic
// pattern becomes more complex. We need:
//   1. A render function that returns Motion components
//   2. AnimatePresence wrapper for exit animations
//   3. Type-safe motion config that varies by item

import { AnimatePresence, motion, type Transition, type TargetAndTransition, type VariantLabels } from 'framer-motion'

// Framer Motion animation target type — using their internal type for accuracy
type AnimationTarget = boolean | TargetAndTransition | VariantLabels

interface AnimatedListProps<T> extends Omit<ListProps<T>, 'renderItem'> {
  /** Render function that returns motion-wrapped elements. */
  renderItem: (item: T, index: number, motionProps: MotionConfig) => ReactNode
  /** Framer Motion transition config. */
  transition?: Transition
  /** Initial animation state. */
  initial?: AnimationTarget
  /** Animate to state. */
  animate?: AnimationTarget
  /** Exit animation state. */
  exit?: TargetAndTransition | VariantLabels
  /** AnimatePresence mode: 'sync' | 'popLayout' | 'wait' */
  mode?: 'sync' | 'popLayout' | 'wait'
  /** Respect reduced motion preferences. */
  reducedMotion?: boolean
}

/** Motion config passed to render items for nested animation coordination. */
interface MotionConfig {
  initial: AnimationTarget
  animate: AnimationTarget
  transition: Transition
}

function AnimatedListInner<T>({
  items,
  keyExtractor,
  renderItem,
  className,
  itemClassName,
  emptyComponent,
  role = 'list',
  'aria-label': ariaLabel,
  transition = { duration: 0.2 },
  initial = { opacity: 0, y: 10 },
  animate = { opacity: 1, y: 0 },
  exit = { opacity: 0, y: -10 },
  mode = 'popLayout',
  reducedMotion = false,
}: AnimatedListProps<T>): ReactNode {
  // When reduced motion is enabled, we skip animations by using `false`
  // for initial (no animation from), and minimal transition.
  const safeInitial: AnimationTarget = reducedMotion ? false : initial
  const safeExit = reducedMotion ? { opacity: 0 } : exit
  const safeTransition: Transition = reducedMotion ? { duration: 0 } : transition

  if (items.length === 0 && emptyComponent) {
    return (
      <motion.div
        role="status"
        initial={safeInitial}
        animate={animate}
        transition={safeTransition}
      >
        {emptyComponent}
      </motion.div>
    )
  }

  return (
    <ul className={className} role={role} aria-label={ariaLabel}>
      <AnimatePresence mode={mode} initial={false}>
        {items.map((item, index) => (
          <motion.li
            key={keyExtractor(item, index)}
            className={itemClassName}
            initial={safeInitial}
            animate={animate}
            exit={safeExit}
            transition={safeTransition}
            layout={!reducedMotion}
          >
            {renderItem(item, index, {
              initial: safeInitial,
              animate,
              transition: safeTransition,
            })}
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  )
}

export const AnimatedList = memo(AnimatedListInner) as <T>(
  props: AnimatedListProps<T>
) => ReactNode

// --- Usage Example (would go in consuming component) ---
//
// <AnimatedList
//   items={todos}
//   keyExtractor={keyExtractors.byId}
//   renderItem={(todo, _index, motionProps) => (
//     <TodoItem
//       todo={todo}
//       motionProps={motionProps}  // Pass through for nested animations
//       onToggle={onToggle}
//       onDelete={onDelete}
//       onEdit={onEdit}
//     />
//   )}
//   emptyComponent={<p>No todos yet!</p>}
//   reducedMotion={prefersReducedMotion}
// />
