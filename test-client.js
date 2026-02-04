#!/usr/bin/env node

/**
 * Simple test client for Acphast server
 * 
 * Usage:
 *   node test-client.js
 */

import { spawn } from 'child_process';
import readline from 'readline';

console.log('🧪 Acphast Test Client\n');

// Start the server
console.log('Starting server...');
const server = spawn('node', ['packages/cli/dist/index.js'], {
  stdio: ['pipe', 'pipe', 'inherit'], // stdin, stdout, stderr
  env: { ...process.env, LOG_LEVEL: 'info' }
});

// Set up readline for server output
const rl = readline.createInterface({
  input: server.stdout,
  crlfDelay: Infinity
});

let requestId = 0;

// Wait for server to start
setTimeout(() => {
  console.log('\n✅ Server started\n');
  
  // Send test request
  const request = {
    jsonrpc: '2.0',
    method: 'acp/messages/create',
    params: {
      model: 'claude-sonnet-4',
      messages: [
        { role: 'user', content: 'Hello from test client!' }
      ]
    },
    id: ++requestId
  };

  console.log('📤 Sending request:');
  console.log(JSON.stringify(request, null, 2));
  console.log();

  server.stdin.write(JSON.stringify(request) + '\n');
}, 1000);

// Handle responses
rl.on('line', (line) => {
  try {
    const response = JSON.parse(line);
    console.log('📥 Received response:');
    console.log(JSON.stringify(response, null, 2));
    console.log();

    // Send another test after 1 second
    if (requestId < 2) {
      setTimeout(() => {
        const request = {
          jsonrpc: '2.0',
          method: 'acp/messages/create',
          params: {
            model: 'gpt-4',
            messages: [
              { role: 'user', content: 'Second test message' }
            ]
          },
          id: ++requestId
        };

        console.log('📤 Sending request:');
        console.log(JSON.stringify(request, null, 2));
        console.log();

        server.stdin.write(JSON.stringify(request) + '\n');
      }, 1000);
    } else {
      // Done testing
      console.log('✅ Test complete! Shutting down...\n');
      setTimeout(() => {
        server.kill('SIGINT');
        process.exit(0);
      }, 500);
    }
  } catch (err) {
    console.error('❌ Parse error:', err.message);
  }
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`\n👋 Server exited with code ${code}`);
  process.exit(code || 0);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down...');
  server.kill('SIGINT');
  setTimeout(() => process.exit(0), 500);
});
