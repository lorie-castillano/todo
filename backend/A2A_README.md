# A2A (Agent-to-Agent) Protocol

This backend now exposes an **A2A agent** in addition to its REST API and MCP tools.

## Quick start

1. Start the backend:
   ```bash
   cd backend
   npm run dev
   ```
2. Fetch the agent card:
   ```bash
   curl http://localhost:3000/.well-known/agent.json
   ```
3. The agent advertises two skills:
   - `manage_todos` — create/list/update/delete todos
   - `coordinate_reminders` — schedule and coordinate reminder tasks

## A2A vs MCP

| Concern | MCP | A2A |
|---------|-----|-----|
| Relationship | Client → Server (tools) | Agent ↔ Agent (tasks) |
| Discovery | Tool list over stdio/SSE | `/.well-known/agent.json` |
| Unit of work | Tool call | Task with lifecycle |
| State | Stateless request/response | Stateful task with status + artifacts |
| Streaming | Progress notifications | SSE status/artifact updates |
| Use case | "Call this function for me" | "Do this job and report back" |

Use **MCP** when an AI assistant needs to call a capability on your server.
Use **A2A** when one autonomous agent needs to delegate work to another and track the result.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/.well-known/agent.json` | Agent capability advertisement |
| `GET` | `/a2a` | Human-readable A2A metadata |
| `POST` | `/a2a/tasks/send` | Submit a new task |
| `GET` | `/a2a/tasks/:id` | Get task status |
| `POST` | `/a2a/tasks/:id/cancel` | Cancel a task |
| `GET` | `/a2a/tasks/:id/subscribe` | SSE stream of status/artifact updates |

## Configuration

| Env var | Purpose |
|---------|---------|
| `A2A_BASE_URL` | Public base URL advertised in the agent card. Defaults to `http://localhost:${PORT}`. |
| `MCP_API_KEY` | Shared key used to authenticate A2A task requests. In `development` or `test`, if unset, requests are allowed. In `production`, it is required. |

## Authentication

Task endpoints require the `X-API-Key` header when `MCP_API_KEY` is configured or when `NODE_ENV=production`:

```bash
curl -H "X-API-Key: $MCP_API_KEY" \
     -X POST http://localhost:3000/a2a/tasks/send \
     -H "Content-Type: application/json" \
     -d '{
       "message": {
         "role": "user",
         "parts": [{ "type": "text", "text": "Create a todo to call mom" }]
       },
       "metadata": { "userId": "user-1" }
     }'
```

Discovery endpoints (`/.well-known/agent.json`, `/a2a`) are public.

## Task lifecycle

```
pending → working → completed
    ↓       ↓
    └── input-required ←┘
          ↓
       canceled
```

- A caller sends a `tasks/send` request.
- The Task Manager creates a `Task` in `pending` state.
- It moves to `working` while the agent decides how to fulfill the request.
- If more information is needed, it enters `input-required`.
- On success it enters `completed` and returns artifacts.
- The caller can cancel at any time, moving the task to `canceled`.

## Architecture

```
Other Agent (A2A client)
       │
       ▼
GET /.well-known/agent.json
POST /a2a/tasks/send
       │
       ▼
Todo Task Manager (this server)
       │
       ├── Todo Worker (MCP tools) ──┐
       │                              ├──► PostgreSQL
       └── Notification Worker ──────┘
```

The Task Manager is an **A2A + MCP hybrid**: it speaks A2A to the outside world and delegates to internal MCP tools (or remote worker agents) to perform work.
