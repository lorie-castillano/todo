# ADR-002: Command Pattern for Undo/Redo

**Date**: 2026-05-31
**Status**: Accepted
**Deciders**: Engineering team

---

## Context

Users frequently make mistakes when managing todos — accidentally deleting an item or making an unintended edit. We needed a way to support undo and redo without coupling every mutation to the UI or duplicating rollback logic in each component.

---

## Decision

We implemented the **Command pattern**: every mutation (add, edit, toggle, delete, clearCompleted) is encapsulated as a `Command` object with `execute()` and `undo()` methods. A Zustand store (`historyStore`) maintains a stack of executed commands and a redo stack.

```
useTodoCommands → Command object → historyStore (past/future stacks)
                                       ↓
                                  ⌘Z → undo() → inverse API call
                                  ⌘⇧Z → redo() → re-execute()
```

---

## Reasoning

### Why Command pattern

1. **Separation of concerns** — the undo logic lives in the command, not the component
2. **Extensibility** — adding a new undoable action means creating a new `Command`, not modifying existing code
3. **Testability** — commands are plain objects; they can be unit-tested without React
4. **No action duplication** — redo simply calls `execute()` again; no separate "redo handler" needed
5. **Stack semantics** — natural fit: undo pops the past stack, redo pops the future stack

### Why not a simple state snapshot approach

- **Memory**: storing full state snapshots for every action is wasteful for large lists
- **Granularity**: snapshots are coarse — you can't undo a single field edit without reverting all concurrent changes
- **Coupling**: the snapshot approach ties undo to state shape, making refactors risky

### Why not a reducer-based approach (e.g., Redux with action history)

- We already use TanStack Query for server state; adding a Redux-style action log for client state would be duplication
- TanStack Query's optimistic update model doesn't naturally expose action history

---

## Consequences

### Positive
- Undo/redo works across any combination of actions in any order
- Keyboard shortcuts (⌘Z / ⌘⇧Z) work globally without per-component wiring
- Each command is independently testable

### Negative
- Requires a Zustand store (`historyStore`) in addition to server state (TanStack Query)
- Commands must call the actual API mutations for undo — meaning undo has network round-trips
- Async undo (API call failure) requires careful error handling

### Neutral
- The pattern will carry over to Phase 5 (backend) — the same commands will call real API endpoints instead of MSW

---

## Related Files

- `src/hooks/useTodoCommands.ts` — command factory functions
- `src/stores/historyStore.ts` — past/future stacks
- `src/components/UndoRedoControls.tsx` — UI buttons
- `src/hooks/useTodos.ts` — TanStack Query mutations called by commands
