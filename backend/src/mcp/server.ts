import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { config } from '../config.js';

const CreateTodoInputSchema = z.object({
  text: z.string().min(1).max(200),
  userId: z.string().uuid(),
});

const ListTodosInputSchema = z.object({
  userId: z.string().uuid(),
  completed: z.boolean().optional(),
});

const ToggleTodoInputSchema = z.object({
  id: z.number().int().positive(),
  userId: z.string().uuid(),
});

const DeleteTodoInputSchema = z.object({
  id: z.number().int().positive(),
  userId: z.string().uuid(),
});

function logAuditEvent(action: string, userId: string, details: Record<string, any>) {
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'audit',
      action,
      userId,
      ...details,
    })
  );
}

const TOOLS = [
  {
    name: 'create_todo',
    description: 'Create a new todo item for a user',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', minLength: 1, maxLength: 200 },
        userId: { type: 'string', format: 'uuid' },
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
      },
      required: ['id', 'userId'],
    },
  },
];

export async function createMcpServer(prisma: PrismaClient) {
  const server = new Server(
    {
      name: 'todo-mcp-server',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: 'todo://todos',
        name: 'All Todos',
        description: 'List all todos across all users (read-only)',
        mimeType: 'application/json',
      },
    ],
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    if (uri === 'todo://todos') {
      const todos = await prisma.todo.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(todos, null, 2),
          },
        ],
      };
    }

    return {
      contents: [
        {
          uri,
          mimeType: 'text/plain',
          text: 'Resource not found',
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'create_todo': {
          const input = CreateTodoInputSchema.parse(args);
          const todo = await prisma.todo.create({
            data: {
              text: input.text,
              userId: input.userId,
            },
          });
          logAuditEvent('create_todo', input.userId, { todoId: todo.id, text: todo.text });
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(todo, null, 2),
              },
            ],
          };
        }

        case 'list_todos': {
          const input = ListTodosInputSchema.parse(args);
          const todos = await prisma.todo.findMany({
            where: {
              userId: input.userId,
              deletedAt: null,
              ...(input.completed !== undefined && { completed: input.completed }),
            },
            orderBy: { createdAt: 'desc' },
          });
          logAuditEvent('list_todos', input.userId, { count: todos.length, filter: input.completed });
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(todos, null, 2),
              },
            ],
          };
        }

        case 'toggle_todo': {
          const input = ToggleTodoInputSchema.parse(args);
          const existing = await prisma.todo.findFirst({
            where: { id: input.id, userId: input.userId, deletedAt: null },
          });
          if (!existing) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ error: 'Todo not found or access denied' }),
                },
              ],
              isError: true,
            };
          }
          const updated = await prisma.todo.update({
            where: { id: input.id },
            data: { completed: !existing.completed },
          });
          logAuditEvent('toggle_todo', input.userId, { todoId: input.id, completed: updated.completed });
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(updated, null, 2),
              },
            ],
          };
        }

        case 'delete_todo': {
          const input = DeleteTodoInputSchema.parse(args);
          const existing = await prisma.todo.findFirst({
            where: { id: input.id, userId: input.userId, deletedAt: null },
          });
          if (!existing) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ error: 'Todo not found or access denied' }),
                },
              ],
              isError: true,
            };
          }
          await prisma.todo.update({
            where: { id: input.id },
            data: { deletedAt: new Date() },
          });
          logAuditEvent('delete_todo', input.userId, { todoId: input.id });
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ success: true, id: input.id }),
              },
            ],
          };
        }

        default:
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: `Unknown tool: ${name}` }),
              },
            ],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

export async function runMcpServer() {
  const pool = new pg.Pool({ connectionString: config.databaseUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter } as any);

  const server = await createMcpServer(prisma);
  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.on('SIGINT', async () => {
    await prisma.$disconnect();
    await pool.end();
    process.exit(0);
  });
}
