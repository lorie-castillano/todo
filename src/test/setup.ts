import '@testing-library/jest-dom'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Automatically unmount and clean up between tests.
// Without this, leftover DOM nodes from previous tests can cause flaky failures.
afterEach(() => {
  cleanup()
  localStorage.clear() // Reset persistence between tests
})
