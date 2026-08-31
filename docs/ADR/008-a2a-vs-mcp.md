# ADR-008: A2A vs MCP — When to Use Each Protocol

## Status

Accepted

## Context

We have a working **MCP server** (`backend/src/mcp/server.ts`) that exposes todo CRUD as tools. MCP is the right protocol for an AI assistant that wants to call functions on our backend.

However, our long-term goal is a **multi-agent system** where specialized agents collaborate:
- **Task Manager** — understands user intent and breaks it into subtasks
- **Todo Worker** — executes todo CRUD
- **Notification Worker** — schedules reminders

MCP is client-server and tool-centric. It does not define how agents negotiate capabilities, delegate long-running tasks, exchange artifacts, or track task state. Google's **Agent-to-Agent (A2A)** protocol fills that gap.

## Decision

Adopt **both** protocols, with a clear boundary:

- **MCP** for direct tool invocation by an AI client (`create_todo`, `list_todos`, etc.).
- **A2A** for agent-to-agent task delegation and lifecycle management.

We will implement A2A manually using Fastify endpoints rather than relying on an early SDK, because:
1. The protocol is HTTP/SSE based and simple enough to implement correctly.
2. Manual implementation is more instructive for understanding the protocol.
3. It reuses our existing Fastify security stack (rate limiting, auth, logging).

## Consequences

### Positive
- MCP tooling remains stable and unchanged.
- A2A gives us discovery (`/.well-known/agent.json`), task lifecycle, and streaming updates.
- We can build hybrid agents that expose A2A externally and use MCP tools internally.
- Security controls (API key auth, rate limiting) apply uniformly because A2A routes run through the same Fastify app.

### Negative
- We must maintain two protocol surfaces.
- A2A error handling and retry logic must be implemented ourselves.
- The A2A ecosystem is younger than MCP, so tooling and standards may evolve.

## Alternatives considered

1. **Use only MCP**: Rejected. MCP has no concept of task delegation or agent discovery; building multi-agent orchestration on top would be ad-hoc.
2. **Use Google's A2A SDK**: Rejected (for now). The SDK is early; manual implementation teaches the protocol and keeps dependencies minimal. We can adopt the SDK later if it stabilizes.
3. **Build a custom agent protocol**: Rejected. Reusing an emerging standard improves interoperability and aligns with industry direction.

## Related ADRs

- ADR-005: Backend monorepo + Fastify
- ADR-007: System design scaling posture

## References

- [Model Context Protocol (MCP) Specification](https://modelcontextprotocol.io/)
- [Google A2A Protocol](https://developers.google.com/agents/a2a)
