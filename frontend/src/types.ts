// Shared types used across multiple components.
// Extracting types to a separate file avoids circular imports
// and makes the "shape" of your data discoverable at a glance.

// --- Branded Types ---
// A "branded type" attaches a phantom property that exists only at
// compile time. This prevents accidentally mixing IDs of different
// entities (e.g., passing a UserId where a TodoId is expected).
// The `__brand` field has zero runtime cost — it's erased after compilation.
export type TodoId = number & { readonly __brand: 'TodoId' }

// Type-safe constructor: the ONLY way to create a TodoId.
// This centralizes ID creation and prevents `as TodoId` casts scattered around.
export function createTodoId(value: number): TodoId {
  return value as TodoId
}

export interface Todo {
  id: TodoId
  text: string
  completed: boolean
}

// --- Utility Types ---
// TypeScript's built-in utility types let us derive new types from
// existing ones without duplication. This keeps the type system DRY
// (Don't Repeat Yourself) and ensures changes propagate correctly.

/**
 * `Pick<T, K>` — Create a type with only the specified keys from T.
 * Use case: API input types that only need a subset of fields.
 */
export type TodoCreateInput = Pick<Todo, 'text'>
// Result: { text: string }

/**
 * `Omit<T, K>` — Create a type without the specified keys from T.
 * Use case: Update forms where the ID is passed separately.
 */
export type TodoUpdateBody = Omit<Todo, 'id'>
// Result: { text: string, completed: boolean }

/**
 * `Partial<T>` — Make all properties of T optional.
 * Use case: PATCH requests where any subset of fields can be updated.
 */
export type TodoUpdateInput = Partial<TodoUpdateBody>
// Result: { text?: string, completed?: boolean }

/**
 * `Required<T>` — Make all properties of T required (opposite of Partial).
 * Use case: Validated data where all fields are guaranteed present.
 */
export type StrictTodo = Required<Todo>

/**
 * `Record<K, T>` — Create a type with keys K and values T.
 * Use case: Lookup tables, error maps, normalized state.
 */
export type TodoById = Record<TodoId, Todo>
export type FormErrors = Record<string, string>

/**
 * `Readonly<T>` — Make all properties readonly.
 * Use case: Immutable data structures, configuration objects.
 */
export type ImmutableTodo = Readonly<Todo>

// --- Chaining Utility Types ---
// You can compose utility types for precise control:

/**
 * Read-only view of a todo for display components that should never mutate.
 */
export type TodoViewModel = Readonly<Pick<Todo, 'id' | 'text' | 'completed'>>

/**
 * Writable subset for inline editing — only text can change.
 */
export type TodoEditableFields = Pick<Todo, 'text'>

/**
 * API response type where we know the shape but some fields might be missing.
 */
export type TodoApiResponse = Partial<Omit<Todo, 'id'>> & { id: TodoId }
// Result: id is required, text and completed are optional
