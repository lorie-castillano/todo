import { memo } from 'react'
import type { ReactNode, Key } from 'react'
import { AnimatePresence, motion, type Transition, type TargetAndTransition, type VariantLabels } from 'framer-motion'

// --- AnimatedList<T> — Extended Generic Pattern ---
//
// When your list needs enter/exit animations (Framer Motion), the generic
// pattern becomes more complex. We need:
//   1. A render function that returns Motion components
//   2. AnimatePresence wrapper for exit animations
//   3. Type-safe motion config that varies by item

// Framer Motion animation target type — using their internal type for accuracy
type AnimationTarget = boolean | TargetAndTransition | VariantLabels

interface ListProps<T> {
  items: T[]
  keyExtractor: (item: T, index: number) => Key
  className?: string
  itemClassName?: string
  emptyComponent?: ReactNode
  role?: string
  'aria-label'?: string
}

/** Motion config passed to render items for nested animation coordination. */
export interface MotionConfig {
  initial: AnimationTarget
  animate: AnimationTarget
  transition: Transition
}

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

// React.memo can't directly wrap a generic component because the generic
// type parameter is lost. We use a type assertion to preserve the
// generic signature while still getting memoization.
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
