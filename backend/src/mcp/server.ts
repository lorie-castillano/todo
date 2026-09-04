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
import { TODO_MCP_TOOLS } from './toolDefinitions.js';

const CreateTodoInputSchema = z.object({
  text: z.string().min(1).max(200),
  userId: z.string().uuid(),
  apiKey: z.string().optional(),
});

const ListTodosInputSchema = z.object({
  userId: z.string().uuid(),
  completed: z.boolean().optional(),
  apiKey: z.string().optional(),
});

const ToggleTodoInputSchema = z.object({
  id: z.number().int().positive(),
  userId: z.string().uuid(),
  apiKey: z.string().optional(),
});

const DeleteTodoInputSchema = z.object({
  id: z.number().int().positive(),
  userId: z.string().uuid(),
  apiKey: z.string().optional(),
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

function validateApiKey(apiKey: string | undefined): boolean {
  // In development, allow requests without API key
  if (config.isDev && !config.mcpApiKey) {
    return true;
  }

  // In production, require API key
  if (!config.mcpApiKey) {
    console.error('MCP_API_KEY not configured but required in production');
    return false;
  }

  return apiKey === config.mcpApiKey;
}

// Simple in-memory rate limiter: 100 requests per user per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(userId);

  if (!limit || now > limit.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60000 });
    return true;
  }

  if (limit.count >= 100) {
    return false;
  }

  limit.count++;
  return true;
}

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
    tools: TODO_MCP_TOOLS,
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

    // Validate API key first
    const apiKey = (args as any)?.apiKey;
    if (!validateApiKey(apiKey)) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: 'Unauthorized: Invalid or missing API key' }),
          },
        ],
        isError: true,
      };
    }

    // Check rate limit
    const userId = (args as any)?.userId;
    if (userId && !checkRateLimit(userId)) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: 'Rate limit exceeded: 100 requests per minute' }),
          },
        ],
        isError: true,
      };
    }

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
