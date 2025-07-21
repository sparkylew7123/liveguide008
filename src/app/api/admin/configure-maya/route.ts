import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      const scriptPath = path.join(process.cwd(), 'scripts', 'configure-maya-agent.js');
      
      // Send initial status
      controller.enqueue(encoder.encode(JSON.stringify({ log: '🚀 Starting Maya Agent Configuration', status: 'running' }) + '\n'));
      
      // Spawn the Node.js process
      const child = spawn('node', [scriptPath], {
        env: { ...process.env },
        cwd: process.cwd()
      });
      
      // Handle stdout
      child.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter((line: string) => line.trim());
        for (const line of lines) {
          controller.enqueue(encoder.encode(JSON.stringify({ log: line }) + '\n'));
        }
      });
      
      // Handle stderr
      child.stderr.on('data', (data) => {
        const lines = data.toString().split('\n').filter((line: string) => line.trim());
        for (const line of lines) {
          controller.enqueue(encoder.encode(JSON.stringify({ log: `Error: ${line}` }) + '\n'));
        }
      });
      
      // Handle process exit
      child.on('close', (code) => {
        if (code === 0) {
          controller.enqueue(encoder.encode(JSON.stringify({ 
            log: '✅ Configuration completed successfully!', 
            status: 'success' 
          }) + '\n'));
        } else {
          controller.enqueue(encoder.encode(JSON.stringify({ 
            log: `❌ Configuration failed with exit code ${code}`, 
            status: 'error' 
          }) + '\n'));
        }
        controller.close();
      });
      
      // Handle process errors
      child.on('error', (error) => {
        controller.enqueue(encoder.encode(JSON.stringify({ 
          log: `❌ Process error: ${error.message}`, 
          status: 'error' 
        }) + '\n'));
        controller.close();
      });
    }
  });
  
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}