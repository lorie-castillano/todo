import { describe, it, expect } from 'vitest'
import { todoReducer } from './todoReducer'
import type { Todo } from './types'
import { createTodoId as tid } from './types'

// --- Unit Tests for the Reducer ---
//
// Why test the reducer first?
// 1. It's PURE: same inputs → same outputs. No mocks, no DOM, no async.
// 2. It contains business logic. Bugs here = wrong app behavior everywhere.
// 3. Tests run in milliseconds.
//
// Pattern: Arrange → Act → Assert (AAA)

describe('todoReducer', () => {
  describe('ADD action', () => {
    it('adds a new todo to empty state', () => {
      // Arrange
      const initialState: Todo[] = []
      const action = { type: 'ADD' as const, text: 'Buy milk' }

      // Act
      const nextState = todoReducer(initialState, action)

      // Assert
      expect(nextState).toHaveLength(1)
      expect(nextState[0]).toMatchObject({
        text: 'Buy milk',
        completed: false,
      })
      expect(nextState[0].id).toBeTypeOf('number')
    })

    it('appends to existing todos', () => {
      const initialState: Todo[] = [
        { id: tid(1), text: 'Existing', completed: false },
      ]
      const action = { type: 'ADD' as const, text: 'New' }

      const nextState = todoReducer(initialState, action)

      expect(nextState).toHaveLength(2)
      expect(nextState[0].text).toBe('Existing')
      expect(nextState[1].text).toBe('New')
    })

    it('does not mutate original state (immutability)', () => {
      const initialState: Todo[] = [
        { id: tid(1), text: 'Existing', completed: false },
      ]
      const action = { type: 'ADD' as const, text: 'New' }

      const nextState = todoReducer(initialState, action)

      // Original array reference should be unchanged
      expect(initialState).toHaveLength(1)
      expect(nextState).not.toBe(initialState) // Different reference
    })
  })

  describe('TOGGLE action', () => {
    it('toggles a todo from incomplete to complete', () => {
      const initialState: Todo[] = [
        { id: tid(1), text: 'Task', completed: false },
      ]

      const nextState = todoReducer(initialState, { type: 'TOGGLE', id: tid(1) })

      expect(nextState[0].completed).toBe(true)
    })

    it('toggles a todo back from complete to incomplete', () => {
      const initialState: Todo[] = [
        { id: tid(1), text: 'Task', completed: true },
      ]

      const nextState = todoReducer(initialState, { type: 'TOGGLE', id: tid(1) })

      expect(nextState[0].completed).toBe(false)
    })

    it('only affects the targeted todo', () => {
      const initialState: Todo[] = [
        { id: tid(1), text: 'A', completed: false },
        { id: tid(2), text: 'B', completed: false },
        { id: tid(3), text: 'C', completed: false },
      ]

      const nextState = todoReducer(initialState, { type: 'TOGGLE', id: tid(2) })

      expect(nextState[0].completed).toBe(false)
      expect(nextState[1].completed).toBe(true)
      expect(nextState[2].completed).toBe(false)
    })

    it('returns same state if id does not exist', () => {
      const initialState: Todo[] = [
        { id: tid(1), text: 'Task', completed: false },
      ]

      const nextState = todoReducer(initialState, { type: 'TOGGLE', id: tid(999) })

      expect(nextState[0].completed).toBe(false)
    })
  })

  describe('EDIT action', () => {
    it('updates the text of a todo', () => {
      const initialState: Todo[] = [
        { id: tid(1), text: 'Old text', completed: false },
      ]

      const nextState = todoReducer(initialState, {
        type: 'EDIT',
        id: tid(1),
        text: 'New text',
      })

      expect(nextState[0].text).toBe('New text')
    })

    it('trims whitespace from edited text', () => {
      const initialState: Todo[] = [
        { id: tid(1), text: 'Old', completed: false },
      ]

      const nextState = todoReducer(initialState, {
        type: 'EDIT',
        id: tid(1),
        text: '  Trimmed  ',
      })

      expect(nextState[0].text).toBe('Trimmed')
    })

    it('ignores empty text (defense in depth)', () => {
      const initialState: Todo[] = [
        { id: tid(1), text: 'Original', completed: false },
      ]

      const nextState = todoReducer(initialState, {
        type: 'EDIT',
        id: tid(1),
        text: '   ',
      })

      // State unchanged
      expect(nextState).toEqual(initialState)
    })

    it('preserves completed status when editing', () => {
      const initialState: Todo[] = [
        { id: tid(1), text: 'Old', completed: true },
      ]

      const nextState = todoReducer(initialState, {
        type: 'EDIT',
        id: tid(1),
        text: 'New',
      })

      expect(nextState[0].completed).toBe(true)
    })
  })

  describe('DELETE action', () => {
    it('removes a todo by id', () => {
      const initialState: Todo[] = [
        { id: tid(1), text: 'A', completed: false },
        { id: tid(2), text: 'B', completed: false },
      ]

      const nextState = todoReducer(initialState, { type: 'DELETE', id: tid(1) })

      expect(nextState).toHaveLength(1)
      expect(nextState[0].id).toBe(2)
    })

    it('returns empty array when deleting the only todo', () => {
      const initialState: Todo[] = [
        { id: tid(1), text: 'Only', completed: false },
      ]

      const nextState = todoReducer(initialState, { type: 'DELETE', id: tid(1) })

      expect(nextState).toEqual([])
    })
  })

  describe('CLEAR_COMPLETED action', () => {
    it('removes only completed todos', () => {
      const initialState: Todo[] = [
        { id: tid(1), text: 'A', completed: true },
        { id: tid(2), text: 'B', completed: false },
        { id: tid(3), text: 'C', completed: true },
      ]

      const nextState = todoReducer(initialState, { type: 'CLEAR_COMPLETED' })

      expect(nextState).toHaveLength(1)
      expect(nextState[0].id).toBe(2)
    })

    it('returns empty array when all are completed', () => {
      const initialState: Todo[] = [
        { id: tid(1), text: 'A', completed: true },
        { id: tid(2), text: 'B', completed: true },
      ]

      const nextState = todoReducer(initialState, { type: 'CLEAR_COMPLETED' })

      expect(nextState).toEqual([])
    })

    it('returns same state when nothing is completed', () => {
      const initialState: Todo[] = [
        { id: tid(1), text: 'A', completed: false },
      ]

      const nextState = todoReducer(initialState, { type: 'CLEAR_COMPLETED' })

      expect(nextState).toHaveLength(1)
    })
  })
})
