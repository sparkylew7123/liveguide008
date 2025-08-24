#!/usr/bin/env node

/**
 * Test MCP Server RAG Integration for ElevenLabs Agents
 * 
 * This script verifies the complete integration between:
 * - MCP Server tools
 * - RAG context enrichment
 * - ElevenLabs agent configuration
 * 
 * Usage: node scripts/test-mcp-rag-integration.js
 */

require('dotenv').config();

// Use the actual development Supabase URL
const BASE_URL = 'https://hlwxmfwrksflvcacjafg.supabase.co';
const TEST_USER_ID = "907f679d-b36a-42a8-8b60-ce0d9cc11726"; // mark.lewis@sparkytek.com

const MCP_SERVER_URL = `${BASE_URL}/functions/v1/mcp-server`;
const AGENT_RAG_URL = `${BASE_URL}/functions/v1/agent-rag`;
const INIT_WEBHOOK_URL = `${BASE_URL}/functions/v1/elevenlabs-init-webhook`;

// Color output helpers
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log(`\n${colors.bright}${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}  ${title}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
}

function logTest(testName, success, details = '') {
  const icon = success ? '✅' : '❌';
  const color = success ? 'green' : 'red';
  log(`${icon} ${testName}`, color);
  if (details) {
    console.log(`   ${colors.cyan}${details}${colors.reset}`);
  }
}

// Test functions
async function testMCPServerConnection() {
  logSection('Testing MCP Server Connection');
  
  try {
    // Test basic connection
    const response = await fetch(MCP_SERVER_URL, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      logTest('MCP Server accessible', true, `Version: ${data.version}, Protocol: ${data.protocol}`);
      return true;
    } else {
      logTest('MCP Server accessible', false, `Status: ${response.status}`);
      return false;
    }
  } catch (error) {
    logTest('MCP Server accessible', false, error.message);
    return false;
  }
}

async function testMCPToolsList() {
  logSection('Testing MCP Tools List');
  
  try {
    const response = await fetch(MCP_SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {}
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      const tools = data.result?.tools || [];
      logTest('Tools list retrieved', true, `Found ${tools.length} tools`);
      
      // List some key tools
      const keyTools = [
        'get_user_graph',
        'search_nodes',
        'create_node',
        'get_onboarding_state',
        'process_voice_command'
      ];
      
      log('\n  Key tools available:', 'yellow');
      keyTools.forEach(toolName => {
        const tool = tools.find(t => t.name === toolName);
        if (tool) {
          log(`    ✓ ${toolName}: ${tool.description.substring(0, 50)}...`, 'cyan');
        } else {
          log(`    ✗ ${toolName}: Not found`, 'red');
        }
      });
      
      return tools.length > 0;
    } else {
      logTest('Tools list retrieved', false, `Status: ${response.status}`);
      return false;
    }
  } catch (error) {
    logTest('Tools list retrieved', false, error.message);
    return false;
  }
}

async function testSearchNodesTool() {
  logSection('Testing Search Nodes Tool');
  
  try {
    const response = await fetch(MCP_SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "search_nodes",
          arguments: {
            userId: TEST_USER_ID,
            query: "goals fitness health",
            nodeType: "goal",
            limit: 5
          }
        }
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      const results = data.result || [];
      logTest('Search nodes tool executed', true, `Found ${Array.isArray(results) ? results.length : 0} nodes`);
      
      if (Array.isArray(results) && results.length > 0) {
        log('\n  Sample results:', 'yellow');
        results.slice(0, 3).forEach((node, idx) => {
          log(`    ${idx + 1}. ${node.label || node.title || 'Untitled'}`, 'cyan');
        });
      }
      
      return true;
    } else {
      const errorData = await response.text();
      logTest('Search nodes tool executed', false, errorData.substring(0, 100));
      return false;
    }
  } catch (error) {
    logTest('Search nodes tool executed', false, error.message);
    return false;
  }
}

async function testRAGContext() {
  logSection('Testing RAG Context Enrichment');
  
  try {
    const response = await fetch(AGENT_RAG_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: TEST_USER_ID,
        query: "What are my current goals and how am I progressing?",
        maxTokens: 5000,
        includeKnowledgeBase: true,
        includeSimilarPatterns: true
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      logTest('RAG context retrieved', true, `Token count: ${data.tokenCount}`);
      
      log('\n  Context components:', 'yellow');
      log(`    • User summary: ${data.userSummary?.substring(0, 80)}...`, 'cyan');
      log(`    • Relevant goals: ${data.relevantGoals?.length || 0}`, 'cyan');
      log(`    • Relevant insights: ${data.relevantInsights?.length || 0}`, 'cyan');
      log(`    • Knowledge chunks: ${data.knowledgeChunks?.length || 0}`, 'cyan');
      log(`    • Similar patterns: ${data.similarPatterns ? 'Yes' : 'No'}`, 'cyan');
      log(`    • Truncated: ${data.truncated ? 'Yes' : 'No'}`, 'cyan');
      
      return true;
    } else {
      const errorData = await response.text();
      logTest('RAG context retrieved', false, errorData.substring(0, 100));
      return false;
    }
  } catch (error) {
    logTest('RAG context retrieved', false, error.message);
    return false;
  }
}

async function testInitWebhook() {
  logSection('Testing Init Webhook');
  
  try {
    const response = await fetch(INIT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Webhook-Secret': 'test-secret' // ElevenLabs would send this
      },
      body: JSON.stringify({
        conversation_id: `test-${Date.now()}`,
        agent_id: 'maya',
        user_id: TEST_USER_ID,
        metadata: {
          sessionType: 'test_integration'
        }
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      logTest('Init webhook executed', true);
      
      log('\n  Returned context:', 'yellow');
      log(`    • User name: ${data.user_context?.user_name || 'Not set'}`, 'cyan');
      log(`    • Has goals: ${data.user_context?.has_existing_goals ? 'Yes' : 'No'}`, 'cyan');
      log(`    • Onboarding: ${data.user_context?.onboarding_completed ? 'Complete' : 'Incomplete'}`, 'cyan');
      log(`    • Instructions: ${data.instructions?.substring(0, 80)}...`, 'cyan');
      
      return true;
    } else {
      const errorData = await response.text();
      logTest('Init webhook executed', false, errorData.substring(0, 100));
      return false;
    }
  } catch (error) {
    logTest('Init webhook executed', false, error.message);
    return false;
  }
}

async function testGetUserGraphTool() {
  logSection('Testing Get User Graph Tool');
  
  try {
    const response = await fetch(MCP_SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "get_user_graph",
          arguments: {
            userId: TEST_USER_ID
          }
        }
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      const graph = data.result || {};
      logTest('User graph retrieved', true);
      
      log('\n  Graph statistics:', 'yellow');
      log(`    • Nodes: ${graph.nodeCount || 0}`, 'cyan');
      log(`    • Edges: ${graph.edgeCount || 0}`, 'cyan');
      
      if (graph.nodes && graph.nodes.length > 0) {
        const nodeTypes = {};
        graph.nodes.forEach(node => {
          nodeTypes[node.node_type] = (nodeTypes[node.node_type] || 0) + 1;
        });
        
        log('\n  Node types:', 'yellow');
        Object.entries(nodeTypes).forEach(([type, count]) => {
          log(`    • ${type}: ${count}`, 'cyan');
        });
      }
      
      return true;
    } else {
      const errorData = await response.text();
      logTest('User graph retrieved', false, errorData.substring(0, 100));
      return false;
    }
  } catch (error) {
    logTest('User graph retrieved', false, error.message);
    return false;
  }
}

async function testOnboardingStateTool() {
  logSection('Testing Onboarding State Tool');
  
  try {
    const response = await fetch(MCP_SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: {
          name: "get_onboarding_state",
          arguments: {
            userId: TEST_USER_ID
          }
        }
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      const state = data.result || {};
      logTest('Onboarding state retrieved', true);
      
      log('\n  Onboarding details:', 'yellow');
      log(`    • Current phase: ${state.current_phase || 'Unknown'}`, 'cyan');
      log(`    • Has questionnaire: ${state.completion_status?.has_questionnaire ? 'Yes' : 'No'}`, 'cyan');
      log(`    • Has goals: ${state.completion_status?.has_goals ? 'Yes' : 'No'}`, 'cyan');
      log(`    • Completed: ${state.completion_status?.onboarding_completed ? 'Yes' : 'No'}`, 'cyan');
      log(`    • Total goals: ${state.total_goals || 0}`, 'cyan');
      
      return true;
    } else {
      const errorData = await response.text();
      logTest('Onboarding state retrieved', false, errorData.substring(0, 100));
      return false;
    }
  } catch (error) {
    logTest('Onboarding state retrieved', false, error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.clear();
  log('\n🧪 MCP Server RAG Integration Test Suite\n', 'bright');
  log(`Testing with base URL: ${BASE_URL}`, 'yellow');
  log(`Test user ID: ${TEST_USER_ID}\n`, 'yellow');
  
  const results = [];
  
  // Run all tests
  results.push(await testMCPServerConnection());
  results.push(await testMCPToolsList());
  results.push(await testSearchNodesTool());
  results.push(await testGetUserGraphTool());
  results.push(await testOnboardingStateTool());
  results.push(await testRAGContext());
  results.push(await testInitWebhook());
  
  // Summary
  logSection('Test Summary');
  
  const passed = results.filter(r => r).length;
  const failed = results.length - passed;
  
  if (passed === results.length) {
    log(`✅ All ${passed} tests passed!`, 'green');
    log('\n🎉 MCP Server RAG integration is fully functional!', 'bright');
  } else {
    log(`⚠️  ${passed} passed, ${failed} failed`, 'yellow');
    log('\n📋 Review failed tests above for details', 'yellow');
  }
  
  // Configuration reminders
  log('\n📝 Remember to configure in ElevenLabs Dashboard:', 'cyan');
  log('   1. Widget Tab → Add webhook URLs', 'cyan');
  log('   2. Integration Tab → Add MCP server URL', 'cyan');
  log('   3. Analysis Tab → Configure data collection fields', 'cyan');
  log('   4. System Prompt → Add context instructions', 'cyan');
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});