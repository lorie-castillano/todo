import { runMcpServer } from './server.js';

runMcpServer().catch((error) => {
  console.error('MCP server error:', error);
  process.exit(1);
});
