#!/usr/bin/env node

/**
 * Test RAG context through MCP server
 * Tests the complete flow of RAG context integration
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const mpcServerUrl = 'https://hlwxmfwrksflvcacjafg.supabase.co/functions/v1/mcp-server';

console.log('🔍 Testing RAG Context Integration with MCP Server\n');
console.log('===================================================\n');

async function testMCPServer() {
  console.log('1️⃣ Testing MCP Server Availability...');
  
  try {
    // Test basic MCP server access
    const response = await fetch(mpcServerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {}
        },
        id: 1
      })
    });

    const data = await response.json();
    console.log('✅ MCP Server Response:', JSON.stringify(data, null, 2));
    
    if (data.result) {
      console.log('✅ MCP Server is accessible');
      console.log('   Server Name:', data.result.serverInfo?.name);
      console.log('   Version:', data.result.serverInfo?.version);
      console.log('   Available Tools:', data.result.capabilities?.tools ? 'Yes' : 'No');
    }
  } catch (error) {
    console.error('❌ MCP Server test failed:', error.message);
  }
}

async function testRAGContext() {
  console.log('\n2️⃣ Testing RAG Context Retrieval...');
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Get a test user
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name')
      .limit(1)
      .single();
    
    if (profileError || !profiles) {
      console.log('⚠️ No user profile found for testing');
      return;
    }
    
    const userId = profiles.id;
    console.log('   Testing with user:', profiles.display_name || userId);
    
    // Test agent-rag function
    const { data, error } = await supabase.functions.invoke('agent-rag', {
      body: { userId }
    });
    
    if (error) {
      console.error('❌ RAG context retrieval failed:', error);
      return;
    }
    
    if (data && data.context) {
      console.log('✅ RAG Context Retrieved Successfully');
      console.log('   Context Length:', data.context.length, 'characters');
      
      // Parse context sections
      const sections = data.context.split('\n\n');
      console.log('   Context Sections:', sections.length);
      
      // Check for key components
      const hasUserContext = data.context.includes('USER CONTEXT');
      const hasGoals = data.context.includes('ACTIVE GOALS');
      const hasInsights = data.context.includes('RECENT INSIGHTS');
      
      console.log('   ✓ User Context:', hasUserContext ? 'Present' : 'Missing');
      console.log('   ✓ Active Goals:', hasGoals ? 'Present' : 'Missing');
      console.log('   ✓ Recent Insights:', hasInsights ? 'Present' : 'Missing');
      
      // Show sample of context
      console.log('\n📄 Context Sample (first 500 chars):');
      console.log(data.context.substring(0, 500) + '...\n');
    }
  } catch (error) {
    console.error('❌ RAG test failed:', error);
  }
}

async function testMCPTools() {
  console.log('\n3️⃣ Testing MCP Tool Access...');
  
  try {
    // List available tools
    const response = await fetch(mpcServerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/list',
        params: {},
        id: 2
      })
    });

    const data = await response.json();
    
    if (data.result && data.result.tools) {
      console.log('✅ Available MCP Tools:');
      data.result.tools.forEach(tool => {
        console.log(`   - ${tool.name}: ${tool.description?.substring(0, 60)}...`);
      });
      console.log('\n   Total Tools:', data.result.tools.length);
    }
  } catch (error) {
    console.error('❌ MCP tools test failed:', error);
  }
}

async function testWebhooks() {
  console.log('\n4️⃣ Testing Webhook Endpoints...');
  
  const webhooks = [
    {
      name: 'Init Webhook',
      url: 'https://hlwxmfwrksflvcacjafg.supabase.co/functions/v1/elevenlabs-init-webhook'
    },
    {
      name: 'Completion Webhook',
      url: 'https://hlwxmfwrksflvcacjafg.supabase.co/functions/v1/elevenlabs-webhook'
    },
    {
      name: 'N8N Webhook',
      url: 'https://n8n-hatchdev.fly.dev/webhook/c389dc70-b6c9-4cd7-9520-bebe372c800a'
    }
  ];
  
  for (const webhook of webhooks) {
    try {
      const response = await fetch(webhook.url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      console.log(`   ${webhook.name}: ${response.status === 405 || response.status === 200 ? '✅ Accessible' : `⚠️ Status ${response.status}`}`);
    } catch (error) {
      console.log(`   ${webhook.name}: ❌ Not accessible`);
    }
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting RAG & MCP Integration Tests\n');
  
  await testMCPServer();
  await testRAGContext();
  await testMCPTools();
  await testWebhooks();
  
  console.log('\n✅ All tests complete!');
  console.log('\n📋 Configuration for ElevenLabs Dashboard:');
  console.log('=========================================');
  console.log('MCP Server URL: https://hlwxmfwrksflvcacjafg.supabase.co/functions/v1/mcp-server');
  console.log('Init Webhook: https://hlwxmfwrksflvcacjafg.supabase.co/functions/v1/elevenlabs-init-webhook');
  console.log('Completion Webhook: https://hlwxmfwrksflvcacjafg.supabase.co/functions/v1/elevenlabs-webhook');
  console.log('N8N Processing: https://n8n-hatchdev.fly.dev/webhook/c389dc70-b6c9-4cd7-9520-bebe372c800a');
}

runTests().catch(console.error);