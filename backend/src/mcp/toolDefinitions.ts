// MCP tool definitions for the todo worker.
//
// These JSON-schema definitions are shared between:
//   - the stdio MCP server (mcp/server.ts)
//   - the A2A TodoWorkerAgent, which exposes them over HTTP at /a2a/worker/tools
//
// Keeping the definitions in one place prevents drift between the two
// surfaces and makes it clear that the A2A worker is an MCP+A2A hybrid.

export interface McpToolDefinition {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export const TODO_MCP_TOOLS: McpToolDefinition[] = [
  {
    name: 'create_todo',
    description: 'Create a new todo item for a user',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', minLength: 1, maxLength: 200 },
        userId: { type: 'string', format: 'uuid' },
        apiKey: { type: 'string' },
      },
      required: ['text', 'userId'],
    },
  },
  {
    name: 'list_todos',
    description: 'List all todos for a user, optionally filtered by completion status',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string', format: 'uuid' },
        completed: { type: 'boolean' },
        apiKey: { type: 'string' },
      },
      required: ['userId'],
    },
  },
  {
    name: 'toggle_todo',
    description: 'Toggle the completion status of a todo',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        userId: { type: 'string', format: 'uuid' },
        apiKey: { type: 'string' },
      },
      required: ['id', 'userId'],
    },
  },
  {
    name: 'delete_todo',
    description: 'Delete a todo (soft delete)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        userId: { type: 'string', format: 'uuid' },
        apiKey: { type: 'string' },
      },
      required: ['id', 'userId'],
    },
  },
]
