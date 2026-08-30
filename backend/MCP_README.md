# Todo MCP Server

Model Context Protocol (MCP) server for the Todo application. Exposes todo operations as tools that AI agents can invoke.

## Available Tools

### `create_todo`
Create a new todo item for a user.

**Input:**
```json
{
  "title": "Buy groceries",
  "userId": "uuid-string"
}
```

**Output:** Created todo object

---

### `list_todos`
List all todos for a user, optionally filtered by completion status.

**Input:**
```json
{
  "userId": "uuid-string",
  "completed": true  // optional
}
```

**Output:** Array of todo objects

---

### `toggle_todo`
Toggle the completion status of a todo.

**Input:**
```json
{
  "id": "todo-uuid",
  "userId": "user-uuid"
}
```

**Output:** Updated todo object

---

### `delete_todo`
Soft delete a todo.

**Input:**
```json
{
  "id": "todo-uuid",
  "userId": "user-uuid"
}
```

**Output:** Success confirmation

---

## Running the MCP Server

### Development Mode
```bash
npm run mcp:dev
```

This starts the MCP server with stdio transport, ready to accept tool calls from MCP clients.

### Using with Claude Desktop

1. Copy `mcp-config.json` to your Claude Desktop MCP configuration directory:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

2. Update the `cwd` path in the config to match your local setup

3. Restart Claude Desktop

4. The todo tools will be available in Claude's tool palette

### Testing with MCP Inspector

```bash
npx @modelcontextprotocol/inspector npm run mcp:dev
```

This opens a web UI where you can:
- View available tools
- Test tool calls with custom inputs
- See request/response logs

## Security Notes

- **User scoping**: All tools require `userId` and enforce ownership checks
- **Soft deletes**: Deleted todos are marked with `deletedAt`, not removed
- **Input validation**: Zod schemas validate all tool inputs before execution
- **Error handling**: Invalid inputs or unauthorized access return structured errors

## Architecture

```
┌─────────────────┐
│  MCP Client     │  (Claude Desktop, custom agent)
│  (stdio)        │
└────────┬────────┘
         │
         │ Tool calls via stdio transport
         │
┌────────▼────────┐
│  MCP Server     │  (src/mcp/server.ts)
│  - Tool registry│
│  - Input schemas│
│  - Handlers     │
└────────┬────────┘
         │
         │ Direct Prisma queries
         │
┌────────▼────────┐
│  PostgreSQL     │
│  (todos table)  │
└─────────────────┘
```

The MCP server runs as a **separate process** from the REST API. It connects directly to the database using Prisma, bypassing the HTTP layer entirely.

## Next Steps

- [ ] Add resource endpoints for read-only todo access
- [ ] Implement progress callbacks for batch operations
- [ ] Add API key authentication for production MCP deployments
- [ ] Create integration tests using MCP SDK test utilities
