// Agent card for the A2A Task Manager.
//
// The agent card is the A2A equivalent of an OpenAPI spec: it tells other
// agents who we are, what we can do, and how to talk to us.
// It is served at `/.well-known/agent.json`.

import type { AgentCard } from './types.js'

/**
 * Build the agent card for this server.
 *
 * @param baseUrl The public base URL of the server, e.g. `http://localhost:3000`.
 *                Agents must use their own address when advertising themselves,
 *                because callers need an absolute URL to reach us.
 */
export function buildTaskManagerCard(baseUrl: string): AgentCard {
  return {
    name: 'todo-task-manager',
    description:
      'Coordinates todo-related work by accepting tasks, breaking them into subtasks, and delegating to specialized worker agents. Exposes results via A2A task lifecycle and streaming updates.',
    url: `${baseUrl}/a2a`,
    version: '0.1.0',
    capabilities: {
      streaming: true,
      pushNotifications: false,
      stateTransitionHistory: true,
    },
    authentication: {
      schemes: ['apiKey'],
      credentials:
        'Send X-API-Key and X-Agent-ID headers. Configure valid agent identities via A2A_AGENT_CREDENTIALS.',
    },
    defaultInputModes: ['text'],
    defaultOutputModes: ['text', 'data'],
    skills: [
      {
        id: 'manage_todos',
        name: 'Manage Todos',
        description:
          'Create, list, toggle, and delete todos. Complex requests are decomposed and delegated to the Todo Worker.',
        tags: ['todos', 'crud'],
        examples: [
          'Create a todo to call mom tomorrow',
          'List all pending todos',
          'Mark my grocery shopping todo as completed',
        ],
      },
      {
        id: 'coordinate_reminders',
        name: 'Coordinate Reminders',
        description:
          'Schedule and coordinate reminder tasks, delegating to the Notification Worker when available.',
        tags: ['reminders', 'notifications'],
        examples: ['Remind me to call mom tomorrow at 9am'],
      },
    ],
    metadata: {
      mcpToolsUrl: `${baseUrl}/a2a/worker/tools`,
      workerAgent: 'todo-worker',
    },
  }
}
