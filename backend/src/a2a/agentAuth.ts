import { createHash, timingSafeEqual } from 'node:crypto'
import type { FastifyRequest } from 'fastify'
import { config } from '../config.js'

export interface AgentCredential {
  id: string
  key: string
  capabilities: string[]
}

export interface AgentIdentity {
  id: string
  capabilities: readonly string[]
}

export class AuthenticationError extends Error {
  constructor(message = 'Authentication failed') {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends Error {
  constructor(message = 'Forbidden') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

function hashKey(key: string): Buffer {
  return createHash('sha256').update(key).digest()
}

export function timingSafeKeyCompare(provided: string, expected: string): boolean {
  const providedHash = hashKey(provided)
  const expectedHash = hashKey(expected)
  return providedHash.length === expectedHash.length && timingSafeEqual(providedHash, expectedHash)
}

function lookupCredential(
  credentials: readonly AgentCredential[],
  apiKey: string,
  agentId?: string
): AgentIdentity | null {
  if (agentId) {
    const credential = credentials.find((c) => c.id === agentId)
    if (credential && timingSafeKeyCompare(apiKey, credential.key)) {
      return { id: credential.id, capabilities: credential.capabilities }
    }
    return null
  }

  for (const credential of credentials) {
    if (timingSafeKeyCompare(apiKey, credential.key)) {
      return { id: credential.id, capabilities: credential.capabilities }
    }
  }
  return null
}

export function authorizeAgent(
  credentials: readonly AgentCredential[],
  apiKey: string | undefined,
  agentId: string | undefined
): AgentIdentity | null {
  if (credentials.length === 0) {
    if (config.isDev || config.isTest) {
      return { id: agentId ?? 'anonymous', capabilities: ['*'] }
    }
    return null
  }

  if (!apiKey) return null

  return lookupCredential(credentials, apiKey, agentId)
}

export function hasCapability(capabilities: readonly string[], required: string): boolean {
  return capabilities.includes('*') || capabilities.includes(required)
}

export function resolveAgentIdentity(
  req: FastifyRequest,
  credentials = config.a2aAgentCredentials
): AgentIdentity | null {
  const apiKeyHeader = req.headers['x-api-key']
  const apiKey = Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader
  const agentIdHeader = req.headers['x-agent-id']
  const agentId = Array.isArray(agentIdHeader) ? agentIdHeader[0] : agentIdHeader

  return authorizeAgent(credentials, apiKey, agentId)
}

declare module 'fastify' {
  interface FastifyRequest {
    agentIdentity?: AgentIdentity
  }
}
