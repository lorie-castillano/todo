// Shared types used across multiple components.
// Extracting types to a separate file avoids circular imports
// and makes the "shape" of your data discoverable at a glance.

export interface Todo {
  id: number
  text: string
  completed: boolean
}
