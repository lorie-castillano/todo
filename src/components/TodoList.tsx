import { AnimatePresence, motion } from 'framer-motion'
import type { Todo } from '../types'
import { TodoItem } from './TodoItem'

// AnimatePresence enables exit animations by delaying unmounts.
// motion.* components are drop-in replacements for HTML elements
// that accept `initial`, `animate`, `exit`, and `transition` props.

interface TodoListProps {
  todos: Todo[]
  onToggle: (id: number) => void
  onDelete: (id: number) => void
  onEdit: (id: number, text: string) => void
}

export function TodoList({ todos, onToggle, onDelete, onEdit }: TodoListProps) {
  return (
    <section aria-label="Todo list" className="px-4 py-4 sm:px-6 sm:py-5">
      <AnimatePresence mode="wait">
        {todos.length === 0 ? (
          <motion.p
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="text-sm text-gray-400 dark:text-gray-500 text-center py-8"
          >
            No todos yet. Add one above!
          </motion.p>
        ) : (
          <motion.ul
            key="list"
            className="space-y-2 sm:space-y-3"
            role="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {/* popLayout makes remaining items slide up smoothly when one is removed */}
            <AnimatePresence mode="popLayout" initial={false}>
              {todos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  todos={todos}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onEdit={onEdit}
                />
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </AnimatePresence>
    </section>
  )
}
