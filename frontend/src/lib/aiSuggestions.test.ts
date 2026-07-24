import { describe, it, expect } from 'vitest'
import { generateSuggestions } from './aiSuggestions'

// Tests for the pure suggestion generator behind the aiSuggestions flag.

describe('generateSuggestions', () => {
  it('returns onboarding starters when the list is empty', () => {
    const result = generateSuggestions([])
    expect(result.length).toBeGreaterThan(0)
    expect(result).toContain('Add your first todo')
  })

  it('never suggests a todo the user already has (case-insensitive)', () => {
    const existing = [
      { text: 'Tidy up your workspace' },
      { text: 'take a short break and stretch' }, // different case
    ]
    const result = generateSuggestions(existing, { count: 10 })
    const lower = result.map((s) => s.toLowerCase())
    expect(lower).not.toContain('tidy up your workspace')
    expect(lower).not.toContain('take a short break and stretch')
  })

  it('respects the requested count', () => {
    const result = generateSuggestions([{ text: 'something unrelated' }], { count: 2 })
    expect(result).toHaveLength(2)
  })

  it('rotates suggestions deterministically as offset changes', () => {
    const todos = [{ text: 'something unrelated' }]
    const first = generateSuggestions(todos, { offset: 0, count: 3 })
    const second = generateSuggestions(todos, { offset: 3, count: 3 })
    // Same input + same offset is stable; a different offset surfaces a
    // different slice (rotation), so the two shouldn't be identical.
    expect(generateSuggestions(todos, { offset: 0, count: 3 })).toEqual(first)
    expect(second).not.toEqual(first)
  })
})
