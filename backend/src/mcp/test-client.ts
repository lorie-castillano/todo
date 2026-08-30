import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function testMcpServer() {
  const transport = new StdioClientTransport({
    command: 'npm',
    args: ['run', 'mcp:dev'],
  });

  const client = new Client(
    {
      name: 'test-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  await client.connect(transport);

  console.log('✅ Connected to MCP server\n');

  const tools = await client.listTools();
  console.log('📋 Available tools:');
  tools.tools.forEach((tool) => {
    console.log(`  - ${tool.name}: ${tool.description}`);
  });

  console.log('\n🧪 Testing create_todo...');
  const createResult = await client.callTool({
    name: 'create_todo',
    arguments: {
      title: 'Test from MCP client',
      userId: '00000000-0000-0000-0000-000000000001',
    },
  });
  console.log('Result:', (createResult.content as any)[0].text);

  console.log('\n🧪 Testing list_todos...');
  const listResult = await client.callTool({
    name: 'list_todos',
    arguments: {
      userId: '00000000-0000-0000-0000-000000000001',
    },
  });
  console.log('Result:', (listResult.content as any)[0].text);

  await client.close();
  console.log('\n✅ Tests complete');
  process.exit(0);
}

testMcpServer().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
