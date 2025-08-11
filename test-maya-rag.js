#!/usr/bin/env node

/**
 * Test script for Maya RAG system functions
 * Tests both agent-rag and mcp-rag-server functions
 */

const PROJECT_URL = 'https://hlwxmfwrksflvcacjafg.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsd3htZndya3NmbHZjYWNqYWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMzA3MzUsImV4cCI6MjA2OTcwNjczNX0.5XSItruOuJusKhOKWatNLTbIR2qX-5gxZhWi5hryLsE';

// Test user ID from the database
const TEST_USER_ID = '97edc6b5-55d6-4b7c-8e6c-8f87dc3b1650';

async function testFunction(functionName, payload = null, method = 'GET') {
  const url = `${PROJECT_URL}/functions/v1/${functionName}`;
  
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
    },
  };
  
  if (payload) {
    options.body = JSON.stringify(payload);
  }
  
  try {
    console.log(`\n🔍 Testing ${functionName}...`);
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ ${functionName} - Success`);
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      console.log(`❌ ${functionName} - Error: ${response.status}`);
      console.log('Error:', data);
    }
    
    return { success: response.ok, data };
  } catch (error) {
    console.log(`💥 ${functionName} - Exception:`, error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Testing Maya RAG System Functions\n');
  console.log(`Project URL: ${PROJECT_URL}`);
  console.log(`Test User ID: ${TEST_USER_ID}`);
  
  // Test 1: Basic database connection via test-rag function
  await testFunction(`test-rag?test=db&userId=${TEST_USER_ID}`);
  
  // Test 2: User context summary
  await testFunction(`test-rag?test=context&userId=${TEST_USER_ID}`);
  
  // Test 3: MCP RAG Server - GET info
  await testFunction('mcp-rag-server');
  
  // Test 4: MCP RAG Server - Tools list
  const mcpToolsListRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list"
  };
  await testFunction('mcp-rag-server', mcpToolsListRequest, 'POST');
  
  // Test 5: MCP RAG Server - Get user context
  const mcpContextRequest = {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "getUserContextSummary",
      arguments: {
        userId: TEST_USER_ID,
        daysBack: 30
      }
    }
  };
  await testFunction('mcp-rag-server', mcpContextRequest, 'POST');
  
  // Test 6: Agent RAG function (without OpenAI key for now)
  const agentRAGRequest = {
    userId: TEST_USER_ID,
    query: "What are my current learning goals?",
    maxTokens: 5000,
    includeKnowledgeBase: false,
    includeSimilarPatterns: false
  };
  
  console.log('\n⚠️  Agent RAG test will likely fail without OpenAI API key');
  await testFunction('agent-rag', agentRAGRequest, 'POST');
  
  console.log('\n✨ Testing complete!');
}

main().catch(console.error);