import { describe, it, expect } from 'vitest'
import { authorizeAgent, hasCapability, resolveAgentIdentity, timingSafeKeyCompare } from './agentAuth.js'
import type { AgentCredential, AgentIdentity } from './agentAuth.js'
import type { FastifyRequest } from 'fastify'

const credentials: AgentCredential[] = [
  {
    id: 'frontend-agent',
    key: 'frontend-key-at-least-32-characters-long',
    capabilities: ['tasks/send', 'tasks/read'],
  },
  {
    id: 'admin-agent',
    key: 'admin-key-0123456789-abcdef-0123456789',
    capabilities: ['*'],
  },
]

describe('timingSafeKeyCompare', () => {
  it('returns true for identical keys', () => {
    expect(timingSafeKeyCompare('a'.repeat(32), 'a'.repeat(32))).toBe(true)
  })

  it('returns false for different keys of same length', () => {
    expect(timingSafeKeyCompare('a'.repeat(32), 'b'.repeat(32))).toBe(false)
  })

  it('returns false for different lengths without leaking via early return semantics', () => {
    expect(timingSafeKeyCompare('short', 'a'.repeat(32))).toBe(false)
    expect(timingSafeKeyCompare('a'.repeat(32), 'short')).toBe(false)
  })
})

describe('authorizeAgent', () => {
  it('authenticates an agent by key and returns identity with capabilities', () => {
    const identity = authorizeAgent(credentials, 'frontend-key-at-least-32-characters-long', undefined)
    expect(identity).toEqual<AgentIdentity>({
      id: 'frontend-agent',
      capabilities: ['tasks/send', 'tasks/read'],
    })
  })

  it('authenticates an agent by id + key', () => {
    const identity = authorizeAgent(credentials, 'admin-key-0123456789-abcdef-0123456789', 'admin-agent')
    expect(identity?.id).toBe('admin-agent')
  })

  it('rejects a mismatched id/key pair', () => {
    const identity = authorizeAgent(credentials, 'frontend-key-at-least-32-characters-long', 'admin-agent')
    expect(identity).toBeNull()
  })

  it('rejects an invalid key', () => {
    const identity = authorizeAgent(credentials, 'wrong-key-0123456789-abcdef-012345', 'frontend-agent')
    expect(identity).toBeNull()
  })

  it('rejects missing key when credentials are configured', () => {
    const identity = authorizeAgent(credentials, undefined, 'frontend-agent')
    expect(identity).toBeNull()
  })
})

describe('hasCapability', () => {
  it('grants access when wildcard capability is present', () => {
    expect(hasCapability(['*'], 'tasks/send')).toBe(true)
  })

  it('grants access when exact capability is present', () => {
    expect(hasCapability(['tasks/send'], 'tasks/send')).toBe(true)
  })

  it('denies access when capability is missing', () => {
    expect(hasCapability(['tasks/read'], 'tasks/send')).toBe(false)
  })
})

describe('resolveAgentIdentity', () => {
  function makeRequest(headers: Record<string, string | string[]>): FastifyRequest {
    return { headers } as FastifyRequest
  }

  it('resolves identity from x-api-key and x-agent-id headers', () => {
    const req = makeRequest({
      'x-api-key': 'frontend-key-at-least-32-characters-long',
      'x-agent-id': 'frontend-agent',
    })

    const identity = resolveAgentIdentity(req, credentials)
    expect(identity?.id).toBe('frontend-agent')
  })

  it('uses first array value when duplicate headers are present', () => {
    const req = makeRequest({
      'x-api-key': ['frontend-key-at-least-32-characters-long', 'ignored'],
      'x-agent-id': 'frontend-agent',
    })
    const identity = resolveAgentIdentity(req, credentials)
    expect(identity?.id).toBe('frontend-agent')
  })
})
