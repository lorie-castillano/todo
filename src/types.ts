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
