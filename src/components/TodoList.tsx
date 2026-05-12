import type { Todo } from '../types'
import { TodoItem } from './TodoItem'

// TodoList handles the list-level concerns: empty state and mapping.
// It COMPOSES TodoItem — this is component composition in action.
// TodoList doesn't know HOW a TodoItem renders, it just passes data down.

interface TodoListProps {
  todos: Todo[]
  onToggle: (id: number) => void
  onDelete: (id: number) => void
  onEdit: (id: number, text: string) => void
}

export function TodoList({ todos, onToggle, onDelete, onEdit }: TodoListProps) {
  return (
    <section aria-label="Todo list" className="px-4 py-4 sm:px-6 sm:py-5">
      {todos.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
          No todos yet. Add one above!
        </p>
      ) : (
        <ul className="space-y-2 sm:space-y-3" role="list">
          {todos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              todos={todos} // Pass all todos for duplicate checking
              onToggle={onToggle}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
