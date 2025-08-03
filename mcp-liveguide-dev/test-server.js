#!/usr/bin/env node
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test the MCP server
const serverPath = path.join(__dirname, 'dist', 'index.js');

console.log('Testing MCP LiveGuide Dev Server...');
console.log('Server path:', serverPath);

const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    SUPABASE_URL: process.env.SUPABASE_URL || 'https://aesefwyijcsynbbhozhb.supabase.co',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'your-anon-key'
  }
});

// Send list tools request
const listToolsRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
  params: {}
};

server.stdin.write(JSON.stringify(listToolsRequest) + '\n');

// Handle responses
server.stdout.on('data', (data) => {
  console.log('Response:', data.toString());
});

server.stderr.on('data', (data) => {
  console.log('Server log:', data.toString());
});

// Graceful shutdown
setTimeout(() => {
  console.log('Test complete');
  server.kill();
  process.exit(0);
}, 2000);